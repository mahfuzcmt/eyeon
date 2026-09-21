package com.webinnovation.motolink.api;

import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.repository.PushTokenRepository;
import com.webinnovation.motolink.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Registers/unregisters Expo push tokens for the authenticated user's mobile
 * installs. Alarm pushes fan out to every token in the user's org
 * ({@link com.webinnovation.motolink.service.PushService}).
 */
@RestController
@RequestMapping("/users/me/push-tokens")
@RequiredArgsConstructor
public class PushTokenController {

    private static final Set<String> PLATFORMS = Set.of("ANDROID", "IOS", "UNKNOWN");

    private final PushTokenRepository repo;

    public record RegisterPushTokenRequest(String token, String platform) {}

    @PostMapping
    public ResponseEntity<Void> register(@RequestBody RegisterPushTokenRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        if (req.token() == null || req.token().isBlank()) {
            throw new DomainException("INVALID_PUSH_TOKEN", "token is required");
        }
        String platform = req.platform() == null
                ? "UNKNOWN"
                : req.platform().toUpperCase(Locale.ROOT);
        if (!PLATFORMS.contains(platform)) {
            throw new DomainException("INVALID_PUSH_PLATFORM",
                    "platform must be one of " + PLATFORMS);
        }
        repo.upsert(orgId, userId, req.token().trim(), platform);
        return ResponseEntity.noContent().build();
    }

    /** Token in query (not path) — Expo tokens contain reserved chars like [ ]. */
    @DeleteMapping
    public ResponseEntity<Void> unregister(@RequestParam("token") String token) {
        TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        repo.deleteForUser(userId, token);
        // Idempotent: 204 whether or not the token existed.
        return ResponseEntity.noContent().build();
    }
}
