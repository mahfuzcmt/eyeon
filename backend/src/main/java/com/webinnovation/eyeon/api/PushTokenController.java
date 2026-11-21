package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.repository.PushTokenRepository;
import com.webinnovation.eyeon.security.TenantContext;
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
 * ({@link com.webinnovation.eyeon.service.PushService}).
 */
@RestController
@RequestMapping("/users/me/push-tokens")
@RequiredArgsConstructor
public class PushTokenController {

    private static final Set<String> PLATFORMS = Set.of("ANDROID", "IOS", "UNKNOWN");

    private final PushTokenRepository repo;
    private final com.webinnovation.eyeon.service.PushService pushService;

    /** {@code locale}: the app's current language, {@code bn} or {@code en}; optional. */
    /** {@code channels}: {@code v2} from app 0.3.29 on (its Android channels); absent from older apps. */
    public record RegisterPushTokenRequest(String token, String platform, String locale, String channels) {}

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
        String locale = req.locale() == null || req.locale().isBlank()
                ? null
                : req.locale().trim().toLowerCase(Locale.ROOT);
        if (locale != null && locale.length() > 10) {
            throw new DomainException("INVALID_PUSH_LOCALE", "locale must be a short tag such as bn or en");
        }
        String channels = "v2".equals(req.channels()) ? "v2" : null;
        repo.upsert(orgId, userId, req.token().trim(), platform, locale, channels);
        return ResponseEntity.noContent().build();
    }

    public record TestResult(boolean accepted, String error) {}

    /**
     * Sends one test notification to the caller's own phone. 404 when the token is not registered
     * for this user (the app registers first, then tests).
     */
    @PostMapping("/test")
    public TestResult test(@RequestBody RegisterPushTokenRequest req) {
        TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        if (req.token() == null || req.token().isBlank()) {
            throw new DomainException("INVALID_PUSH_TOKEN", "token is required");
        }
        String token = req.token().trim();
        PushTokenRepository.Target target = repo.findUserToken(userId, token)
                .orElseThrow(() -> new com.webinnovation.eyeon.exception.NotFoundException("Push token", "this phone"));
        String error = pushService.sendTest(token, target.locale(), target.channels());
        return new TestResult(error == null, error);
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
