package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.repository.TrackerSettingsRepository;
import com.webinnovation.eyeon.security.SubscriptionGuard;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.NightRest;
import com.webinnovation.eyeon.service.TrackerSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The tracker's own settings: SOS numbers, reporting, night rest and the rest of
 * {@link com.webinnovation.eyeon.service.TrackerSetting}. Anyone who can see the person may read
 * and change them; every change is written to the audit log.
 */
@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class TrackerSettingsController {

    private final TrackerSettingsService settings;
    private final TrackerSettingsRepository repo;
    private final DeviceAccessService access;
    private final SubscriptionGuard subscriptionGuard;
    private final AuditService audit;

    public record RestView(String imei, String from, String to) {}

    /** Trackers the caller can see whose night rest is switched on, for "Resting until 07:00" in lists. */
    @GetMapping("/rest")
    public List<RestView> resting() {
        UUID orgId = TenantContext.requireOrgId();
        Set<String> visible = access.visibleForCurrentUser();
        List<RestView> out = new ArrayList<>();
        repo.restWindows(orgId).forEach((imei, w) -> {
            if (DeviceAccessService.canSee(visible, imei)) {
                out.add(new RestView(imei, w.start().toString().substring(0, 5), w.end().toString().substring(0, 5)));
            }
        });
        return out;
    }

    @GetMapping("/{imei}/settings")
    public TrackerSettingsService.Panel panel(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        return settings.panel(orgId, imei);
    }

    /** Asks the tracker for all its settings; the answers arrive over the next seconds (poll the panel). */
    @PostMapping("/{imei}/settings/read")
    public ResponseEntity<Map<String, Boolean>> read(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        subscriptionGuard.requireActiveSubscription(imei);
        boolean started = settings.startReading(orgId, imei);
        return ResponseEntity.status(started ? HttpStatus.ACCEPTED : HttpStatus.CONFLICT).body(Map.of("started", started));
    }

    @PutMapping("/{imei}/settings/{key}")
    public TrackerSettingsService.Item save(@PathVariable String imei, @PathVariable String key,
                                            @RequestBody Map<String, Object> value) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        subscriptionGuard.requireActiveSubscription(imei);
        TrackerSettingsService.Item saved = settings.save(orgId, imei, key, value);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("setting", saved.key());
        meta.put("wanted", saved.wanted());
        meta.put("status", saved.status());
        audit.record("TRACKER_SETTING_SET", "device", imei, meta);
        return saved;
    }
}
