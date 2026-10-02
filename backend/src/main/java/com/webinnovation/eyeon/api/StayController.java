package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.security.SubscriptionGuard;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.StayService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Where one person stayed and for how long: "Karwan Bazar, 2:40 PM to 2:45 PM, 5 min".
 * Like every per-person read it is limited to people the caller may see (CLAUDE.md section 11.2a).
 */
@RestController
@RequestMapping("/devices/{imei}/stays")
@RequiredArgsConstructor
public class StayController {

    private static final Duration MAX_RANGE = Duration.ofDays(31);

    private final StayService stays;
    private final DeviceRepository deviceRepo;
    private final DeviceAccessService access;
    private final SubscriptionGuard subscriptionGuard;

    /**
     * @param from  default: 24 hours before {@code to}
     * @param to    default: now
     * @param names false leaves the stays unnamed (used by the map popup, which only needs "here since")
     * @param lang  "bn" or "en" for area names
     */
    @GetMapping
    public StayService.Result list(@PathVariable String imei,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
                                   @RequestParam(defaultValue = "true") boolean names,
                                   @RequestParam(required = false) String lang) {
        UUID orgId = TenantContext.requireOrgId();
        access.requireVisible(imei);
        subscriptionGuard.requireActiveSubscription(imei);

        Instant now = Instant.now();
        Instant toResolved = to == null || to.isAfter(now) ? now : to;
        Instant fromResolved = from == null ? toResolved.minus(24, ChronoUnit.HOURS) : from;
        if (!fromResolved.isBefore(toResolved)) {
            throw new DomainException("INVALID_RANGE", "'from' must be before 'to'");
        }
        if (Duration.between(fromResolved, toResolved).compareTo(MAX_RANGE) > 0) {
            throw new DomainException("INVALID_RANGE", "Range must not exceed " + MAX_RANGE.toDays() + " days");
        }
        Device device = deviceRepo.findByImei(imei).orElseThrow(() -> new NotFoundException("Device not found"));
        boolean online = "ONLINE".equals(String.valueOf(device.status()));
        return stays.stays(orgId, TenantContext.requireUserId(), imei, fromResolved, toResolved,
                online, names, lang, now);
    }
}
