package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.WatchTimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Language and time zone of a smart watch ({@link WatchTimeService}). Anyone who can see the
 * person may read and change them; every change is written to the audit log. 400 for a tracker
 * that is not a watch.
 */
@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class WatchTimeController {

    private final WatchTimeService service;
    private final DeviceAccessService access;
    private final AuditService audit;

    public record Body(Integer language, Integer zoneHours) {}

    @GetMapping("/{imei}/watch-time")
    public WatchTimeService.View get(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        return service.get(orgId, imei);
    }

    @PutMapping("/{imei}/watch-time")
    public WatchTimeService.View save(@PathVariable String imei, @RequestBody Body body) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        WatchTimeService.View saved = service.save(orgId, imei, body.language(), body.zoneHours());
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("language", saved.language());
        meta.put("zoneHours", saved.zoneHours());
        meta.put("status", saved.status());
        audit.record("WATCH_TIME_SET", "device", imei, meta);
        return saved;
    }
}
