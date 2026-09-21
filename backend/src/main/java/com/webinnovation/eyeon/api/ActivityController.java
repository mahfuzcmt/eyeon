package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.domain.Activity;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.ActivityRepository;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.security.SubscriptionGuard;
import com.webinnovation.eyeon.security.TenantContext;
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
import java.util.List;
import java.util.UUID;

/**
 * Day activity for one person, derived from location points. Replaces the trip-based
 * statistics of the vehicle product (CLAUDE.md section 8.6).
 */
@RestController
@RequestMapping("/devices/{imei}/activity")
@RequiredArgsConstructor
public class ActivityController {

    /** The daily breakdown feeds a month calendar; anything longer is a reporting job, not a page load. */
    private static final Duration MAX_RANGE = Duration.ofDays(93);

    private final ActivityRepository activityRepo;
    private final DeviceRepository deviceRepo;
    private final SubscriptionGuard subscriptionGuard;

    @GetMapping
    public Activity summary(@PathVariable String imei,
                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        Range r = resolve(imei, from, to);
        return activityRepo.summarize(r.orgId(), imei, r.from(), r.to());
    }

    @GetMapping("/daily")
    public List<Activity.Day> daily(@PathVariable String imei,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        Range r = resolve(imei, from, to);
        return activityRepo.daily(r.orgId(), imei, r.from(), r.to());
    }

    private record Range(UUID orgId, Instant from, Instant to) {}

    private Range resolve(String imei, Instant from, Instant to) {
        UUID orgId = TenantContext.requireOrgId();
        deviceRepo.findByOrgAndImei(orgId, imei)
                .orElseThrow(() -> new NotFoundException("device", imei));
        subscriptionGuard.requireActiveSubscription(imei);

        Instant toResolved = to == null ? Instant.now() : to;
        Instant fromResolved = from == null ? toResolved.minus(24, ChronoUnit.HOURS) : from;
        if (!fromResolved.isBefore(toResolved)) {
            throw new DomainException("INVALID_RANGE", "'from' must be before 'to'");
        }
        if (Duration.between(fromResolved, toResolved).compareTo(MAX_RANGE) > 0) {
            throw new DomainException("INVALID_RANGE", "Range must not exceed " + MAX_RANGE.toDays() + " days");
        }
        return new Range(orgId, fromResolved, toResolved);
    }
}
