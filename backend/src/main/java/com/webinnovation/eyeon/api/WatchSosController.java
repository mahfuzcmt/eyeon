package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.WatchSosService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * SOS numbers of a smart watch ({@link WatchSosService}). Anyone who can see the person may read
 * and change them; every change is audited (how many numbers, not the numbers). 400 for a
 * tracker that is not a watch or for a number that is not one.
 */
@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class WatchSosController {

    private final WatchSosService service;
    private final DeviceAccessService access;
    private final AuditService audit;

    public record Body(List<String> numbers) {}

    @GetMapping("/{imei}/watch-sos")
    public WatchSosService.View get(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        return service.get(orgId, imei);
    }

    @PutMapping("/{imei}/watch-sos")
    public WatchSosService.View save(@PathVariable String imei, @RequestBody Body body) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        WatchSosService.View saved = service.save(orgId, imei, body == null ? null : body.numbers());
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("count", saved.numbers().size());
        meta.put("status", saved.status());
        audit.record("WATCH_SOS_SET", "device", imei, meta);
        return saved;
    }
}
