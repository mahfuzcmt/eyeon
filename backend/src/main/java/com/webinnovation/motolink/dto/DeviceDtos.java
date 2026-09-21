package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.repository.SubscriptionRepository.SubInfo;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class DeviceDtos {

    private DeviceDtos() {}

    /**
     * Partial update — null fields are left unchanged. vehicleType drives the
     * map marker picture on the dashboards; iconColor tints it.
     */
    public record DeviceUpdateRequest(
            String name,
            String simMsisdn,
            String vehiclePlate,
            String vehicleType,
            String iconColor
    ) {}

    public record DeviceView(
            UUID id,
            UUID groupId,
            UUID driverId,
            String imei,
            String name,
            String simMsisdn,
            String vehiclePlate,
            String vehicleType,
            String protocol,
            String protocolVariant,
            String model,
            String status,
            Instant lastSeenAt,
            Double lastLatitude,
            Double lastLongitude,
            Integer lastSpeed,
            Integer lastCourse,
            Integer lastVoltageMv,
            Integer lastGsmSignal,
            Integer lastEngineHoursSeconds,
            String iconColor,
            boolean engineLocked,
            String subscriptionStatus,
            LocalDate subscriptionExpiresAt,
            /** End of the latest completed trip — null while driving or if unknown. */
            Instant parkedSince
    ) {
        public static DeviceView of(Device d) {
            return of(d, null, null);
        }

        public static DeviceView of(Device d, SubInfo sub) {
            return of(d, sub, null);
        }

        public static DeviceView of(Device d, SubInfo sub, Instant parkedSince) {
            return of(d, sub, parkedSince, null);
        }

        /** @param groupId the calling user's group for this vehicle (groups are per user), or null. */
        public static DeviceView of(Device d, SubInfo sub, Instant parkedSince, UUID groupId) {
            return new DeviceView(
                    d.id(),
                    groupId,
                    d.driverId(),
                    d.imei(),
                    d.name(),
                    d.simMsisdn(),
                    d.vehiclePlate(),
                    d.vehicleType(),
                    d.protocol(),
                    d.protocolVariant(),
                    d.model(),
                    d.status(),
                    d.lastSeenAt(),
                    d.lastLatitude(),
                    d.lastLongitude(),
                    d.lastSpeed(),
                    d.lastCourse(),
                    d.lastVoltageMv(),
                    d.lastGsmSignal(),
                    d.lastEngineHoursSeconds(),
                    d.iconColor(),
                    d.engineLocked(),
                    sub == null ? null : sub.status(),
                    sub == null ? null : sub.nextDueAt(),
                    parkedSince
            );
        }
    }
}
