package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.SubscriptionDtos.BillingStatsView;
import com.webinnovation.motolink.dto.SubscriptionDtos.CreateSubscriptionRequest;
import com.webinnovation.motolink.dto.SubscriptionDtos.DeviceWithoutSubView;
import com.webinnovation.motolink.dto.SubscriptionDtos.ExtendRequest;
import com.webinnovation.motolink.dto.SubscriptionDtos.SubscriptionView;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.exception.ForbiddenException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.SubscriptionRepository.Subscription;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import com.webinnovation.motolink.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Super Admin subscription management endpoints.
 * Search, view stats, and extend subscriptions.
 */
@RestController
@RequestMapping("/admin/subscriptions")
@RequiredArgsConstructor
@Slf4j
public class AdminSubscriptionController {

    private static final String ROLE_SUPER = "SUPER_ADMIN";

    private final SubscriptionService subscriptionService;
    private final AuditService audit;

    // ─────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public BillingStatsView getStats() {
        requireSuperAdmin();
        return BillingStatsView.of(subscriptionService.getStats());
    }

    // ─────────────────────────────────────────────────────────────
    // Search
    // ─────────────────────────────────────────────────────────────

    /**
     * Search subscriptions with filters.
     * @param orgId Filter by organization
     * @param imei Filter by IMEI pattern (prefix match)
     * @param status Filter by status (ACTIVE, GRACE, SUSPENDED, CANCELLED)
     * @param dueBefore Filter by due date (before this date)
     * @param expired If true, show only expired subscriptions
     * @param limit Max results (default 50, max 200)
     */
    @GetMapping
    public List<SubscriptionView> search(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) String imei,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate dueBefore,
            @RequestParam(required = false) Boolean expired,
            @RequestParam(defaultValue = "50") int limit) {
        requireSuperAdmin();

        // Cap the limit
        int actualLimit = Math.min(Math.max(1, limit), 200);

        List<Subscription> results;

        if (Boolean.TRUE.equals(expired)) {
            results = subscriptionService.findExpired();
        } else if (imei != null && !imei.isBlank() && orgId == null && status == null && dueBefore == null) {
            results = subscriptionService.searchByImei(imei);
        } else {
            results = subscriptionService.search(orgId, imei, status, dueBefore, actualLimit);
        }

        return results.stream()
                .limit(actualLimit)
                .map(s -> SubscriptionView.of(s, subscriptionService.getEffectiveStatus(s.deviceImei())))
                .toList();
    }

    @GetMapping("/due-soon")
    public List<SubscriptionView> findDueSoon(@RequestParam(defaultValue = "7") int days) {
        requireSuperAdmin();
        return subscriptionService.findDueSoon(days).stream()
                .map(s -> SubscriptionView.of(s, subscriptionService.getEffectiveStatus(s.deviceImei())))
                .toList();
    }

    @GetMapping("/expired")
    public List<SubscriptionView> findExpired() {
        requireSuperAdmin();
        return subscriptionService.findExpired().stream()
                .map(s -> SubscriptionView.of(s, subscriptionService.getEffectiveStatus(s.deviceImei())))
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // Single subscription operations
    // ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    public SubscriptionView get(@PathVariable UUID id) {
        requireSuperAdmin();
        Subscription sub = subscriptionService.getById(id)
                .orElseThrow(() -> new NotFoundException("subscription", id.toString()));
        return SubscriptionView.of(sub, subscriptionService.getEffectiveStatus(sub.deviceImei()));
    }

    /**
     * Extend a subscription.
     * Either provide additionalDays (adds days to current/today) or newDueAt (sets specific date).
     */
    @PatchMapping("/{id}/extend")
    public SubscriptionView extend(@PathVariable UUID id, @Valid @RequestBody ExtendRequest body) {
        requireSuperAdmin();

        // Validate we have at least one way to extend
        if (!body.hasAdditionalDays() && !body.hasNewDueAt()) {
            throw new DomainException("INVALID_EXTEND",
                    "Provide either additionalDays or newDueAt");
        }

        Subscription before = subscriptionService.getById(id)
                .orElseThrow(() -> new NotFoundException("subscription", id.toString()));

        if (body.hasNewDueAt()) {
            subscriptionService.setExpiryDate(id, body.newDueAt());
            audit.record("ADMIN_SUBSCRIPTION_EXTEND", "subscription", id.toString(),
                    Map.of("deviceImei", before.deviceImei(),
                           "oldDueAt", before.nextDueAt().toString(),
                           "newDueAt", body.newDueAt().toString()));
            log.info("Super admin set subscription {} expiry to {}", id, body.newDueAt());
        } else {
            subscriptionService.extendSubscription(id, body.additionalDays());
            audit.record("ADMIN_SUBSCRIPTION_EXTEND", "subscription", id.toString(),
                    Map.of("deviceImei", before.deviceImei(),
                           "oldDueAt", before.nextDueAt().toString(),
                           "additionalDays", body.additionalDays()));
            log.info("Super admin extended subscription {} by {} days", id, body.additionalDays());
        }

        Subscription after = subscriptionService.getById(id).orElseThrow();
        return SubscriptionView.of(after, subscriptionService.getEffectiveStatus(after.deviceImei()));
    }

    /**
     * Update subscription status directly.
     */
    @PatchMapping("/{id}/status")
    public SubscriptionView updateStatus(@PathVariable UUID id, @RequestParam String status) {
        requireSuperAdmin();

        String normalizedStatus = status.toUpperCase();
        if (!List.of("ACTIVE", "GRACE", "SUSPENDED", "CANCELLED").contains(normalizedStatus)) {
            throw new DomainException("INVALID_STATUS",
                    "Status must be one of: ACTIVE, GRACE, SUSPENDED, CANCELLED");
        }

        Subscription before = subscriptionService.getById(id)
                .orElseThrow(() -> new NotFoundException("subscription", id.toString()));

        subscriptionService.updateStatus(id, normalizedStatus);

        audit.record("ADMIN_SUBSCRIPTION_STATUS", "subscription", id.toString(),
                Map.of("deviceImei", before.deviceImei(),
                       "oldStatus", before.status(),
                       "newStatus", normalizedStatus));

        log.info("Super admin updated subscription {} status from {} to {}",
                id, before.status(), normalizedStatus);

        Subscription after = subscriptionService.getById(id).orElseThrow();
        return SubscriptionView.of(after, normalizedStatus);
    }

    // ─────────────────────────────────────────────────────────────
    // Devices without subscriptions
    // ─────────────────────────────────────────────────────────────

    /**
     * Get devices that don't have any subscription.
     * These are devices registered before the subscription system was implemented.
     */
    @GetMapping("/devices-without-subscription")
    public Map<String, Object> getDevicesWithoutSubscription(
            @RequestParam(defaultValue = "100") int limit) {
        requireSuperAdmin();

        var devices = subscriptionService.findDevicesWithoutSubscription(limit);
        int total = subscriptionService.countDevicesWithoutSubscription();

        return Map.of(
                "total", total,
                "devices", devices.stream()
                        .map(d -> new DeviceWithoutSubView(d.imei(), d.orgId(), d.orgName(), d.deviceName()))
                        .toList()
        );
    }

    /**
     * Create subscription for an existing device that doesn't have one.
     */
    @PostMapping("/create")
    public SubscriptionView createSubscription(@Valid @RequestBody CreateSubscriptionRequest body) {
        requireSuperAdmin();

        if (body.imei() == null || body.imei().isBlank()) {
            throw new DomainException("INVALID_IMEI", "IMEI is required");
        }
        if (body.orgId() == null) {
            throw new DomainException("INVALID_ORG", "Organization ID is required");
        }

        // Check if device already has a subscription
        var existing = subscriptionService.getSubscriptionInfo(body.imei());
        if (existing.isPresent()) {
            throw new DomainException("SUBSCRIPTION_EXISTS",
                    "Device already has a subscription. Use extend instead.");
        }

        UUID subId = subscriptionService.createSubscriptionForDevice(
                body.orgId(),
                body.imei(),
                body.getPlanTierOrDefault(),
                body.getMonthlyPriceBdtOrDefault(),
                body.getDaysOrDefault()
        );

        audit.record("ADMIN_SUBSCRIPTION_CREATE", "subscription", subId.toString(),
                Map.of("deviceImei", body.imei(),
                       "orgId", body.orgId().toString(),
                       "planTier", body.getPlanTierOrDefault(),
                       "days", body.getDaysOrDefault()));

        log.info("Super admin created subscription {} for existing device IMEI={}", subId, body.imei());

        Subscription sub = subscriptionService.getById(subId).orElseThrow();
        return SubscriptionView.of(sub, subscriptionService.getEffectiveStatus(sub.deviceImei()));
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private void requireSuperAdmin() {
        String role = TenantContext.currentRole();
        if (!ROLE_SUPER.equals(role)) {
            throw new ForbiddenException("Super Admin role required");
        }
    }
}
