package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.NotificationDefaults;
import com.webinnovation.motolink.dto.NotificationDtos.NotificationSettingsUpdate;
import com.webinnovation.motolink.dto.NotificationDtos.NotificationSettingsView;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.repository.NotificationSettingsRepository;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The caller's own alarm notification preferences. Every role may edit
 * their own; there is no admin override — an ORG_ADMIN who wants alarms
 * silenced for a user disables the alarm rule instead.
 */
@RestController
@RequestMapping("/users/me/notification-settings")
@RequiredArgsConstructor
public class NotificationSettingsController {

    private final NotificationSettingsRepository repo;
    private final AuditService audit;

    @GetMapping
    public NotificationSettingsView get() {
        TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        return repo.findByUser(userId)
                .map(NotificationSettingsView::of)
                .orElseGet(NotificationSettingsView::defaults);
    }

    @PutMapping
    public NotificationSettingsView put(@RequestBody NotificationSettingsUpdate body) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        Set<String> popup = clean(body.popupTypes(), "popupTypes");
        Set<String> sound = clean(body.soundTypes(), "soundTypes");
        Set<String> push = clean(body.pushTypes(), "pushTypes");
        repo.upsert(userId, orgId, popup, sound, push);
        audit.record("NOTIFICATION_SETTINGS_UPDATE", "user", userId.toString(),
                Map.of("popup", popup.size(), "sound", sound.size(), "push", push.size()));
        return repo.findByUser(userId).map(NotificationSettingsView::of).orElseThrow();
    }

    /** Null → empty; unknown alarm type names are rejected rather than silently dropped. */
    static Set<String> clean(Set<String> in, String field) {
        Set<String> out = new LinkedHashSet<>();
        if (in == null) return out;
        for (String t : in) {
            if (!NotificationDefaults.isKnownType(t)) {
                throw new DomainException("INVALID_ALARM_TYPE", field + " contains unknown alarm type: " + t);
            }
            out.add(t);
        }
        return out;
    }
}
