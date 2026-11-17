package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.dto.AuthDtos.ForgotPasswordRequest;
import com.webinnovation.eyeon.dto.AuthDtos.LoginRequest;
import com.webinnovation.eyeon.dto.AuthDtos.RefreshRequest;
import com.webinnovation.eyeon.dto.AuthDtos.ResetPasswordRequest;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.repository.OrganizationRepository;
import com.webinnovation.eyeon.repository.PasswordResetRepository;
import com.webinnovation.eyeon.repository.PasswordResetRepository.ResetCodeRow;
import com.webinnovation.eyeon.repository.RefreshTokenRepository;
import com.webinnovation.eyeon.repository.RefreshTokenRepository.RefreshTokenRow;
import com.webinnovation.eyeon.repository.UserRepository;
import com.webinnovation.eyeon.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Sign-in, refresh and reset for accounts that are disabled or being guessed at. */
class AuthServiceSessionTest {

    private static final String EMAIL = "parent@x.test";
    private static final String IP = "203.0.113.7";

    private final UUID orgId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository refresh = mock(RefreshTokenRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwt = mock(JwtService.class);
    private final PasswordResetRepository resets = mock(PasswordResetRepository.class);
    private final SmsService sms = mock(SmsService.class);
    private final AuthThrottle throttle = mock(AuthThrottle.class);
    private final AuthService service = new AuthService(users, mock(OrganizationRepository.class), refresh, encoder,
            jwt, mock(AuditService.class), resets, sms, throttle);

    private User user(boolean active) {
        User u = new User(userId, orgId, EMAIL, "+8801712345678", "hash", "Parent", "ORG_USER", active, false, null,
                Instant.now(), Instant.now());
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(u));
        when(users.findById(userId)).thenReturn(Optional.of(u));
        return u;
    }

    private String code(Runnable call) {
        return assertThrows(DomainException.class, call::run).getCode();
    }

    @Test
    void a_disabled_user_cannot_refresh_and_loses_every_session() {
        user(false);
        when(refresh.findByHash(anyString())).thenReturn(Optional.of(new RefreshTokenRow(UUID.randomUUID(), userId,
                Instant.now().plusSeconds(3600), null, null, null)));

        assertEquals("REFRESH_REVOKED", code(() -> service.refresh(new RefreshRequest("token"))));
        verify(refresh).revokeAllForUser(userId);
        verify(refresh, never()).create(any(), any(), any());
    }

    @Test
    void an_active_user_still_refreshes() {
        user(true);
        when(jwt.refreshTtl()).thenReturn(Duration.ofDays(30));
        when(jwt.issueAccessToken(userId, orgId, "ORG_USER")).thenReturn("access");
        when(refresh.findByHash(anyString())).thenReturn(Optional.of(new RefreshTokenRow(UUID.randomUUID(), userId,
                Instant.now().plusSeconds(3600), null, null, null)));

        assertEquals("access", service.refresh(new RefreshRequest("token")).accessToken());
        verify(refresh, never()).revokeAllForUser(any());
    }

    @Test
    void a_suspended_account_is_only_revealed_to_someone_who_knows_the_password() {
        user(false);
        when(encoder.matches("wrong-password", "hash")).thenReturn(false);
        when(encoder.matches("right-password", "hash")).thenReturn(true);

        assertEquals("INVALID_CREDENTIALS", code(() -> service.login(new LoginRequest(EMAIL, "wrong-password"), IP)));
        assertEquals("ACCOUNT_INACTIVE", code(() -> service.login(new LoginRequest(EMAIL, "right-password"), IP)));
    }

    @Test
    void failed_sign_ins_are_counted_and_a_blocked_caller_is_refused_before_the_password_is_checked() {
        user(true);
        when(encoder.matches(anyString(), anyString())).thenReturn(false);

        assertEquals("INVALID_CREDENTIALS", code(() -> service.login(new LoginRequest(EMAIL, "wrong-password"), IP)));
        verify(throttle).loginFailed(EMAIL, IP);

        when(throttle.loginBlocked(EMAIL, IP)).thenReturn(true);
        assertEquals("TOO_MANY_ATTEMPTS", code(() -> service.login(new LoginRequest(EMAIL, "right-password"), IP)));
        verify(encoder, never()).matches("right-password", "hash");
    }

    @Test
    void an_unknown_email_counts_as_a_failed_sign_in_too() {
        when(users.findByEmail("nobody@x.test")).thenReturn(Optional.empty());

        assertEquals("INVALID_CREDENTIALS",
                code(() -> service.login(new LoginRequest("nobody@x.test", "some-password"), IP)));
        verify(throttle).loginFailed("nobody@x.test", IP);
    }

    @Test
    void the_fifth_wrong_reset_code_locks_further_reset_attempts() {
        user(true);
        when(resets.findLatestUnused(userId)).thenReturn(Optional.of(new ResetCodeRow(UUID.randomUUID(), userId,
                "some-other-hash", Instant.now().plusSeconds(600), null, 4)));

        assertEquals("INVALID_RESET_CODE",
                code(() -> service.resetPassword(new ResetPasswordRequest(EMAIL, "000000", "new-password"))));
        verify(throttle).lockReset(userId);

        when(throttle.resetLocked(userId)).thenReturn(true);
        assertEquals("INVALID_RESET_CODE",
                code(() -> service.resetPassword(new ResetPasswordRequest(EMAIL, "000000", "new-password"))));
        service.forgotPassword(new ForgotPasswordRequest(EMAIL));
        verify(resets, never()).create(any(), any(), any(), any());
        verify(sms, never()).sendRaw(anyString(), anyString());
    }

    @Test
    void no_reset_sms_once_the_phone_has_had_its_daily_allowance() {
        user(true);
        when(throttle.allowResetSms("+8801712345678")).thenReturn(false);

        service.forgotPassword(new ForgotPasswordRequest(EMAIL));
        verify(sms, never()).sendRaw(anyString(), anyString());

        when(throttle.allowResetSms("+8801712345678")).thenReturn(true);
        service.forgotPassword(new ForgotPasswordRequest(EMAIL));
        verify(sms).sendRaw(anyString(), anyString());
    }
}
