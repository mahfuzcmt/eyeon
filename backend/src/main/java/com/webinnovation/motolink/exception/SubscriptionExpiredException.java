package com.webinnovation.motolink.exception;

/**
 * Thrown when a device action is blocked due to expired subscription.
 * Handled by GlobalExceptionHandler to return 403 with SUBSCRIPTION_EXPIRED code.
 */
public class SubscriptionExpiredException extends DomainException {

    public SubscriptionExpiredException(String imei) {
        super("SUBSCRIPTION_EXPIRED", "Device subscription expired or inactive: " + imei);
    }

    public SubscriptionExpiredException(String imei, String status) {
        super("SUBSCRIPTION_EXPIRED",
                "Device subscription " + status.toLowerCase() + ": " + imei + ". Please renew to continue.");
    }
}
