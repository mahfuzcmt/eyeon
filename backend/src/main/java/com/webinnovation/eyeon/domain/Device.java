package com.webinnovation.eyeon.domain;

import java.time.Instant;
import java.util.UUID;

public record Device(
        UUID id,
        UUID orgId,
        UUID driverId,
        String imei,
        String name,
        String simMsisdn,
        String simIccid,
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
        Instant createdAt,
        Instant updatedAt,
        /** When the uploaded photo last changed; null = no photo, the drawn portrait is used. */
        Instant photoUpdatedAt,
        /** 0-100 as reported by a battery-powered tracker; null when it reports none. */
        Integer batteryPercent
) {}
