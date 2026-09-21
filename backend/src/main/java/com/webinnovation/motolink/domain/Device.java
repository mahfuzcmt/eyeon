package com.webinnovation.motolink.domain;

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
        Instant updatedAt
) {}
