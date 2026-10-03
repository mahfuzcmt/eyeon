package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.security.SubscriptionGuard;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.RouteService;
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

/** A person's route for the map, split into solid / dashed pieces and snapped to the road. */
@RestController
@RequestMapping("/devices/{imei}/route")
@RequiredArgsConstructor
public class RouteController {

    private static final Duration MAX_RANGE = Duration.ofDays(2);

    private final RouteService routes;
    private final DeviceAccessService access;
    private final SubscriptionGuard subscriptionGuard;

    @GetMapping
    public RouteService.RouteView route(@PathVariable String imei,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        access.requireVisible(imei);
        subscriptionGuard.requireActiveSubscription(imei);
        Instant t = to == null ? Instant.now() : to;
        Instant f = from == null ? t.minus(24, ChronoUnit.HOURS) : from;
        if (!f.isBefore(t) || Duration.between(f, t).compareTo(MAX_RANGE) > 0) {
            throw new DomainException("INVALID_RANGE", "'from' must be before 'to', at most 2 days apart");
        }
        return routes.route(TenantContext.requireOrgId(), imei, f, t);
    }
}
