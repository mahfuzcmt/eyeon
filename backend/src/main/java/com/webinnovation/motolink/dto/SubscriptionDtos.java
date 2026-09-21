package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.repository.SubscriptionRepository.BillingStats;
import com.webinnovation.motolink.repository.SubscriptionRepository.Subscription;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class SubscriptionDtos {

    private SubscriptionDtos() {}

    /** Full subscription view for billing pages. */
    public record SubscriptionView(
            UUID id,
            UUID orgId,
            String deviceImei,
            String planTier,
            int monthlyPriceBdt,
            LocalDate startedAt,
            LocalDate nextDueAt,
            String status,
            String effectiveStatus,
            boolean autoRenew,
            int daysUntilDue,
            boolean isExpiringSoon,
            boolean isExpired,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static SubscriptionView of(Subscription s) {
            return of(s, s.status());
        }

        public static SubscriptionView of(Subscription s, String effectiveStatus) {
            LocalDate today = LocalDate.now();
            LocalDate dueAt = s.nextDueAt();

            int daysUntilDue = dueAt != null
                    ? (int) today.until(dueAt).getDays()
                    : 0;
            boolean isExpiringSoon = daysUntilDue >= 0 && daysUntilDue <= 7;
            boolean isExpired = dueAt != null && dueAt.isBefore(today);

            return new SubscriptionView(
                    s.id(),
                    s.orgId(),
                    s.deviceImei(),
                    s.planTier(),
                    s.monthlyPriceBdt(),
                    s.startedAt(),
                    s.nextDueAt(),
                    s.status(),
                    effectiveStatus,
                    s.autoRenew(),
                    daysUntilDue,
                    isExpiringSoon,
                    isExpired,
                    s.createdAt(),
                    s.updatedAt()
            );
        }
    }

    /** Billing statistics for admin dashboard. */
    public record BillingStatsView(
            int total,
            int active,
            int grace,
            int suspended,
            int cancelled,
            int expiringIn7Days,
            int expiredUnpaid
    ) {
        public static BillingStatsView of(BillingStats s) {
            return new BillingStatsView(
                    s.total(),
                    s.active(),
                    s.grace(),
                    s.suspended(),
                    s.cancelled(),
                    s.expiringIn7Days(),
                    s.expiredUnpaid()
            );
        }
    }

    /** Request to extend a subscription. */
    public record ExtendRequest(
            Integer additionalDays,
            LocalDate newDueAt
    ) {
        public boolean hasAdditionalDays() {
            return additionalDays != null && additionalDays > 0;
        }

        public boolean hasNewDueAt() {
            return newDueAt != null;
        }
    }

    /** Admin search filters. */
    public record SearchFilters(
            UUID orgId,
            String imei,
            String status,
            LocalDate dueBefore,
            Boolean expired
    ) {}

    /** Device without subscription (for admin to create one). */
    public record DeviceWithoutSubView(
            String imei,
            UUID orgId,
            String orgName,
            String deviceName
    ) {}

    /** Request to create subscription for existing device. */
    public record CreateSubscriptionRequest(
            String imei,
            UUID orgId,
            String planTier,
            Integer monthlyPriceBdt,
            Integer days
    ) {
        public String getPlanTierOrDefault() {
            return planTier != null ? planTier : "BASIC";
        }

        public int getMonthlyPriceBdtOrDefault() {
            return monthlyPriceBdt != null ? monthlyPriceBdt : 300;
        }

        public int getDaysOrDefault() {
            return days != null ? days : 30;
        }
    }
}
