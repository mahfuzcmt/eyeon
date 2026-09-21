package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Organization;
import com.webinnovation.motolink.domain.User;
import com.webinnovation.motolink.dto.AuthDtos.ChangePasswordRequest;
import com.webinnovation.motolink.dto.AuthDtos.ForgotPasswordRequest;
import com.webinnovation.motolink.dto.AuthDtos.LoginRequest;
import com.webinnovation.motolink.dto.AuthDtos.ResetPasswordRequest;
import com.webinnovation.motolink.dto.AuthDtos.LoginResponse;
import com.webinnovation.motolink.dto.AuthDtos.OrgSummary;
import com.webinnovation.motolink.dto.AuthDtos.RefreshRequest;
import com.webinnovation.motolink.dto.AuthDtos.TokenPair;
import com.webinnovation.motolink.dto.AuthDtos.UserSummary;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.repository.OrganizationRepository;
import com.webinnovation.motolink.repository.PasswordResetRepository;
import com.webinnovation.motolink.repository.PasswordResetRepository.ResetCodeRow;
import com.webinnovation.motolink.repository.RefreshTokenRepository;
import com.webinnovation.motolink.repository.RefreshTokenRepository.RefreshTokenRow;
import com.webinnovation.motolink.repository.UserRepository;
import com.webinnovation.motolink.security.JwtService;
import com.webinnovation.motolink.util.PasswordResetSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepo;
    private final OrganizationRepository orgRepo;
    private final RefreshTokenRepository refreshRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService audit;
    private final PasswordResetRepository resetRepo;
    private final SmsService smsService;

    private static final SecureRandom RNG = new SecureRandom();
    private static final Duration RESET_CODE_TTL = Duration.ofMinutes(15);
    private static final int RESET_MAX_ATTEMPTS = 5;
    private static final int RESET_MAX_CODES_PER_WINDOW = 3;
    private static final Duration RESET_WINDOW = Duration.ofMinutes(15);

    public LoginResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.email())
                .orElseThrow(() -> new DomainException("INVALID_CREDENTIALS", "Email or password is incorrect"));

        if (!user.isActive()) {
            throw new DomainException("ACCOUNT_INACTIVE", "Account is suspended");
        }
        if (!passwordEncoder.matches(req.password(), user.passwordHash())) {
            throw new DomainException("INVALID_CREDENTIALS", "Email or password is incorrect");
        }
        if (user.orgId() == null) {
            throw new DomainException("NO_ORG", "User is not assigned to an organization");
        }

        Organization org = orgRepo.findById(user.orgId())
                .orElseThrow(() -> new DomainException("ORG_NOT_FOUND", "Organization missing for user"));

        userRepo.touchLastLogin(user.id());

        TokenPair tokens = issueTokens(user.id(), user.orgId(), user.role());

        // login happens before TenantContext is set on the request — pass actor explicitly
        audit.recordFor(user.orgId(), user.id(), "AUTH_LOGIN", "user", user.id().toString(),
                java.util.Map.of("email", user.email()));

        return new LoginResponse(
                tokens.accessToken(),
                tokens.refreshToken(),
                new UserSummary(user.id(), user.email(), user.fullName(), user.role(), user.orgId()),
                new OrgSummary(org.id(), org.name(), org.slug(), org.planTier(), org.locale(), org.timezone(),
                        org.googleMapsApiKey())
        );
    }

    public TokenPair refresh(RefreshRequest req) {
        String hash = sha256(req.refreshToken());
        RefreshTokenRow row = refreshRepo.findByHash(hash)
                .orElseThrow(() -> new DomainException("INVALID_REFRESH", "Refresh token not recognized"));

        if (row.revokedAt() != null) {
            throw new DomainException("REFRESH_REVOKED", "Refresh token has been revoked");
        }
        if (row.expiresAt().isBefore(Instant.now())) {
            throw new DomainException("REFRESH_EXPIRED", "Refresh token has expired");
        }

        User user = userRepo.findById(row.userId())
                .orElseThrow(() -> new DomainException("USER_NOT_FOUND", "User no longer exists"));

        // Rotate: revoke old, issue new
        refreshRepo.revoke(row.id());
        return issueTokens(user.id(), user.orgId(), user.role());
    }

    /**
     * Logged-in change. Verifies the current password, stores the new hash,
     * revokes every refresh token (other devices must sign in again) and hands
     * the caller a fresh pair so their own session continues.
     */
    public TokenPair changePassword(UUID userId, ChangePasswordRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new DomainException("USER_NOT_FOUND", "User no longer exists"));
        if (!passwordEncoder.matches(req.currentPassword(), user.passwordHash())) {
            throw new DomainException("WRONG_PASSWORD", "Current password is incorrect");
        }
        validateNewPassword(req.newPassword(), req.currentPassword());
        userRepo.updatePasswordById(userId, passwordEncoder.encode(req.newPassword()));
        refreshRepo.revokeAllForUser(userId);
        audit.recordFor(user.orgId(), userId, "AUTH_PASSWORD_CHANGE", "user", userId.toString(), Map.of());
        return issueTokens(userId, user.orgId(), user.role());
    }

    /**
     * Step 1 of forgot-password. Always silent about whether the email exists.
     * Sends a 6-digit code to the user's phone by SMS (logged when no SMS
     * provider is configured). Users without a phone get nothing and must ask
     * their org admin, which is what the UI copy says.
     */
    public void forgotPassword(ForgotPasswordRequest req) {
        var userOpt = userRepo.findByEmail(req.email().trim().toLowerCase());
        if (userOpt.isEmpty()) {
            log.info("forgot-password for unknown email (ignored)");
            return;
        }
        User user = userOpt.get();
        if (!user.isActive()) return;
        if (user.phone() == null || user.phone().isBlank()) {
            log.info("forgot-password: user {} has no phone; no code sent", user.id());
            return;
        }
        if (resetRepo.countCreatedSince(user.id(), Instant.now().minus(RESET_WINDOW)) >= RESET_MAX_CODES_PER_WINDOW) {
            log.warn("forgot-password rate limit hit for user {}", user.id());
            return;
        }
        String code = PasswordResetSupport.generateCode();
        resetRepo.consumeAllForUser(user.id());
        resetRepo.create(user.id(), sha256(code), smsService.isConfigured() ? "SMS" : "LOG",
                Instant.now().plus(RESET_CODE_TTL));
        smsService.sendRaw(user.phone(),
                "EyeOn: your password reset code is " + code + ". It expires in 15 minutes. "
                        + "If you did not request this, ignore this message.");
        audit.recordFor(user.orgId(), user.id(), "AUTH_PASSWORD_RESET_REQUESTED", "user", user.id().toString(),
                Map.of("phone", PasswordResetSupport.maskPhone(user.phone())));
    }

    /** Step 2: code + new password. Generic error for every failure mode so codes can't be probed. */
    public void resetPassword(ResetPasswordRequest req) {
        DomainException invalid = new DomainException("INVALID_RESET_CODE",
                "The code is invalid or has expired. Request a new one.");
        User user = userRepo.findByEmail(req.email().trim().toLowerCase()).orElseThrow(() -> invalid);
        ResetCodeRow row = resetRepo.findLatestUnused(user.id()).orElseThrow(() -> invalid);
        if (row.expiresAt().isBefore(Instant.now()) || row.attempts() >= RESET_MAX_ATTEMPTS) {
            throw invalid;
        }
        if (!MessageDigest.isEqual(row.codeHash().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                sha256(req.code().trim()).getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            resetRepo.bumpAttempts(row.id());
            throw invalid;
        }
        validateNewPassword(req.newPassword(), null);
        userRepo.updatePasswordById(user.id(), passwordEncoder.encode(req.newPassword()));
        resetRepo.consumeAllForUser(user.id());
        refreshRepo.revokeAllForUser(user.id());
        audit.recordFor(user.orgId(), user.id(), "AUTH_PASSWORD_RESET", "user", user.id().toString(), Map.of());
    }

    /** CLAUDE.md §14.2: length is the meaningful factor; no complexity rules. */
    private static void validateNewPassword(String newPassword, String currentPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new DomainException("WEAK_PASSWORD", "Password must be at least 8 characters");
        }
        if (currentPassword != null && currentPassword.equals(newPassword)) {
            throw new DomainException("SAME_PASSWORD", "New password must differ from the current one");
        }
    }

    private TokenPair issueTokens(UUID userId, UUID orgId, String role) {
        String access = jwtService.issueAccessToken(userId, orgId, role);
        String refresh = randomRefreshToken();
        Instant expiresAt = Instant.now().plus(jwtService.refreshTtl());
        refreshRepo.create(userId, sha256(refresh), expiresAt);
        return new TokenPair(access, refresh);
    }

    private static String randomRefreshToken() {
        byte[] bytes = new byte[48];
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
