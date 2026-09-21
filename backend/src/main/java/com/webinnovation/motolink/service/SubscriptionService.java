package com.webinnovation.motolink.service;

import com.webinnovation.motolink.repository.SubscriptionRepository;
import com.webinnovation.motolink.repository.SubscriptionRepository.BillingStats;
import com.webinnovation.motolink.repository.SubscriptionRepository.SubInfo;
import com.webinnovation.motolink.repository.SubscriptionRepository.Subscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Business logic for subscription management.
 * Handles trial creation, expiry checks, and admin operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepo;

    // Trial period: 30 days active + 3 days grace = 33 days total
    private static final int TRIAL_DAYS = 33;
    private static final int GRACE_PERIOD_DAYS = 3;

    /**
     * Creates a trial subscription for a device.
     * 33-day trial (30 days ACTIVE, auto-transition to GRACE for last 3 days).
     */
    public UUID createTrialSubscription(UUID orgId, String imei) {
        log.info("Creating trial subscription for IMEI={} in org={}", imei, orgId);
        return subscriptionRepo.createTrialSubscription(orgId, imei);
    }

    /**
     * Check if a device's subscription is expired (blocked from actions).
     * Returns true if SUSPENDED, CANCELLED, or past due date.
     */
    public boolean isDeviceExpired(String imei) {
        Optional<SubInfo> subOpt = subscriptionRepo.latestForImei(imei);
        if (subOpt.isEmpty()) {
            // No subscription = treat as expired (blocked)
            return true;
        }

        SubInfo sub = subOpt.get();
        String status = sub.status();
        LocalDate dueAt = sub.nextDueAt();
        LocalDate today = LocalDate.now();

        // SUSPENDED or CANCELLED = blocked
        if ("SUSPENDED".equals(status) || "CANCELLED".equals(status)) {
            return true;
        }

        // Past due date = blocked
        return dueAt != null && dueAt.isBefore(today);
    }

    /**
     * Get the effective subscription status for a device.
     * Computes GRACE status based on due date.
     */
    public String getEffectiveStatus(String imei) {
        Optional<SubInfo> subOpt = subscriptionRepo.latestForImei(imei);
        if (subOpt.isEmpty()) {
            return "NO_SUBSCRIPTION";
        }

        SubInfo sub = subOpt.get();
        String status = sub.status();
        LocalDate dueAt = sub.nextDueAt();
        LocalDate today = LocalDate.now();

        // If past due date
        if (dueAt != null && dueAt.isBefore(today)) {
            return "SUSPENDED";
        }

        // If within grace period (last 3 days)
        if (dueAt != null && "ACTIVE".equals(status)) {
            LocalDate graceStart = dueAt.minusDays(GRACE_PERIOD_DAYS);
            if (!today.isBefore(graceStart)) {
                return "GRACE";
            }
        }

        return status;
    }

    /**
     * Get subscription info for a device.
     */
    public Optional<SubInfo> getSubscriptionInfo(String imei) {
        return subscriptionRepo.latestForImei(imei);
    }

    /**
     * Get subscription info for a device within an org.
     */
    public Optional<SubInfo> getSubscriptionInfo(UUID orgId, String imei) {
        return subscriptionRepo.latestForImei(orgId, imei);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // User billing queries
    // ───────────────────────────────────────────────────────────────────────────

    /** List all subscriptions for an org. */
    public List<Subscription> listForOrg(UUID orgId) {
        return subscriptionRepo.findByOrgId(orgId);
    }

    /** Get subscription by ID (org-scoped). */
    public Optional<Subscription> getById(UUID orgId, UUID id) {
        return subscriptionRepo.findById(orgId, id);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Admin operations
    // ───────────────────────────────────────────────────────────────────────────

    /** Get subscription by ID (admin - no org filter). */
    public Optional<Subscription> getById(UUID id) {
        return subscriptionRepo.findById(id);
    }

    /** Extend subscription by adding days (Super Admin). */
    public void extendSubscription(UUID id, int additionalDays) {
        Optional<Subscription> subOpt = subscriptionRepo.findById(id);
        if (subOpt.isEmpty()) {
            throw new IllegalArgumentException("Subscription not found: " + id);
        }

        Subscription sub = subOpt.get();
        LocalDate currentDue = sub.nextDueAt();
        LocalDate today = LocalDate.now();

        // If already past due, extend from today
        LocalDate baseDate = currentDue.isBefore(today) ? today : currentDue;
        LocalDate newDueAt = baseDate.plusDays(additionalDays);

        log.info("Extending subscription {} from {} to {} (+{} days)",
                id, currentDue, newDueAt, additionalDays);
        subscriptionRepo.extendSubscription(id, newDueAt);
    }

    /** Set specific expiry date (Super Admin). */
    public void setExpiryDate(UUID id, LocalDate newDueAt) {
        log.info("Setting subscription {} expiry to {}", id, newDueAt);
        subscriptionRepo.extendSubscription(id, newDueAt);
    }

    /** Update subscription status (Super Admin). */
    public void updateStatus(UUID id, String status) {
        log.info("Updating subscription {} status to {}", id, status);
        subscriptionRepo.updateStatus(id, status);
    }

    /** Search subscriptions with filters. */
    public List<Subscription> search(UUID orgId, String imeiPattern, String status, LocalDate dueBefore, int limit) {
        return subscriptionRepo.search(orgId, imeiPattern, status, dueBefore, limit);
    }

    /** Search by IMEI pattern. */
    public List<Subscription> searchByImei(String imeiPattern) {
        return subscriptionRepo.searchByImei(imeiPattern);
    }

    /** Find subscriptions due soon. */
    public List<Subscription> findDueSoon(int days) {
        return subscriptionRepo.findDueSoon(days);
    }

    /** Find expired subscriptions. */
    public List<Subscription> findExpired() {
        return subscriptionRepo.findExpired();
    }

    /** Get billing statistics. */
    public BillingStats getStats() {
        return subscriptionRepo.getStats();
    }

    /** Get devices without subscriptions (Super Admin). */
    public List<SubscriptionRepository.DeviceWithoutSub> findDevicesWithoutSubscription(int limit) {
        return subscriptionRepo.findDevicesWithoutSubscription(limit);
    }

    /** Count devices without subscriptions (Super Admin). */
    public int countDevicesWithoutSubscription() {
        return subscriptionRepo.countDevicesWithoutSubscription();
    }

    /** Create subscription for existing device (Super Admin). */
    public UUID createSubscriptionForDevice(UUID orgId, String imei, String planTier, int monthlyPriceBdt, int days) {
        log.info("Creating subscription for existing device IMEI={} in org={}: plan={}, days={}",
                imei, orgId, planTier, days);
        return subscriptionRepo.createSubscriptionForDevice(orgId, imei, planTier, monthlyPriceBdt, days);
    }
}
