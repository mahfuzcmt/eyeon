package com.webinnovation.motolink.security;

import com.webinnovation.motolink.exception.SubscriptionExpiredException;
import com.webinnovation.motolink.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Guards device actions against expired subscriptions.
 * Throws SubscriptionExpiredException if the device subscription is not active.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionGuard {

    private final SubscriptionService subscriptionService;

    /**
     * Require an active subscription for the device.
     * Throws SubscriptionExpiredException if SUSPENDED, CANCELLED, or past due date.
     *
     * @param imei Device IMEI to check
     * @throws SubscriptionExpiredException if subscription is not active
     */
    public void requireActiveSubscription(String imei) {
        String effectiveStatus = subscriptionService.getEffectiveStatus(imei);

        switch (effectiveStatus) {
            case "ACTIVE" -> {
                // All good, subscription is active
            }
            case "GRACE" -> {
                // Grace period - allow but log warning
                log.warn("Device {} is in grace period - subscription expiring soon", imei);
            }
            case "SUSPENDED" -> {
                log.info("Blocking action for device {} - subscription suspended", imei);
                throw new SubscriptionExpiredException(imei, "SUSPENDED");
            }
            case "CANCELLED" -> {
                log.info("Blocking action for device {} - subscription cancelled", imei);
                throw new SubscriptionExpiredException(imei, "CANCELLED");
            }
            case "NO_SUBSCRIPTION" -> {
                log.info("Blocking action for device {} - no subscription found", imei);
                throw new SubscriptionExpiredException(imei);
            }
            default -> {
                log.warn("Unknown subscription status '{}' for device {} - blocking", effectiveStatus, imei);
                throw new SubscriptionExpiredException(imei);
            }
        }
    }

    /**
     * Check if the device has an active subscription without throwing.
     * Useful for UI logic where you want to show warnings instead of blocking.
     *
     * @param imei Device IMEI to check
     * @return true if subscription is active (including grace period)
     */
    public boolean hasActiveSubscription(String imei) {
        String status = subscriptionService.getEffectiveStatus(imei);
        return "ACTIVE".equals(status) || "GRACE".equals(status);
    }

    /**
     * Check if the device is in grace period.
     *
     * @param imei Device IMEI to check
     * @return true if subscription is in grace period
     */
    public boolean isInGracePeriod(String imei) {
        return "GRACE".equals(subscriptionService.getEffectiveStatus(imei));
    }
}
