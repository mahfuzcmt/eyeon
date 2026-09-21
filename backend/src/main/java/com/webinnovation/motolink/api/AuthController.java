package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.User;
import com.webinnovation.motolink.dto.AuthDtos.ChangePasswordRequest;
import com.webinnovation.motolink.dto.AuthDtos.ForgotPasswordRequest;
import com.webinnovation.motolink.dto.AuthDtos.LoginRequest;
import com.webinnovation.motolink.dto.AuthDtos.ResetPasswordRequest;
import com.webinnovation.motolink.dto.AuthDtos.LoginResponse;
import com.webinnovation.motolink.dto.AuthDtos.RefreshRequest;
import com.webinnovation.motolink.dto.AuthDtos.TokenPair;
import com.webinnovation.motolink.dto.AuthDtos.UserSummary;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.UserRepository;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepo;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public TokenPair refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req);
    }

    /** Logged-in password change; returns a fresh token pair (all other sessions are revoked). */
    @PostMapping("/change-password")
    public TokenPair changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        UUID userId = TenantContext.currentUserId();
        if (userId == null) {
            throw new NotFoundException("user", "current");
        }
        return authService.changePassword(userId, req);
    }

    /** Public. Always 204 — never reveals whether the email exists. */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.noContent().build();
    }

    /** Public. Code from the SMS + new password. */
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserSummary me() {
        UUID userId = TenantContext.currentUserId();
        if (userId == null) {
            throw new NotFoundException("user", "current");
        }
        User u = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("user", userId.toString()));
        return new UserSummary(u.id(), u.email(), u.fullName(), u.role(), u.orgId());
    }
}
