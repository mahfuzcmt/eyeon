package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.LocationDtos.LocationView;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.LocationRepository;
import com.webinnovation.eyeon.security.SubscriptionGuard;
import com.webinnovation.eyeon.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/devices/{imei}/locations")
@RequiredArgsConstructor
public class LocationController {

    private static final int MAX_LIMIT = 5000;
    private static final int DEFAULT_LIMIT = 1000;

    private final LocationRepository locationRepo;
    private final DeviceRepository deviceRepo;
    private final SubscriptionGuard subscriptionGuard;

    @GetMapping("/last")
    public LocationView last(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        deviceRepo.findByOrgAndImei(orgId, imei)
                .orElseThrow(() -> new NotFoundException("device", imei));
        return locationRepo.findLastForImei(imei)
                .map(LocationView::of)
                .orElseThrow(() -> new NotFoundException("location", imei));
    }

    @GetMapping
    public List<LocationView> history(
            @PathVariable String imei,
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        UUID orgId = TenantContext.requireOrgId();
        deviceRepo.findByOrgAndImei(orgId, imei)
                .orElseThrow(() -> new NotFoundException("device", imei));

        // Require active subscription for location history (not last position)
        subscriptionGuard.requireActiveSubscription(imei);

        Instant now = Instant.now();
        Instant toResolved = (to == null) ? now : to;
        Instant fromResolved = (from == null) ? toResolved.minus(24, ChronoUnit.HOURS) : from;

        if (!fromResolved.isBefore(toResolved)) {
            throw new DomainException("INVALID_RANGE", "'from' must be before 'to'");
        }

        int lim = (limit == null) ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);

        return locationRepo.findHistory(orgId, imei, fromResolved, toResolved, lim)
                .stream()
                .map(LocationView::of)
                .toList();
    }
}
