package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

public record Location(
        Long id,
        String deviceImei,
        UUID orgId,
        Instant ts,
        Instant receivedAt,
        double latitude,
        double longitude,
        int speed,
        int course,
        Integer altitude,
        Integer satellites,
        boolean valid,
        Boolean accOn,
        Integer voltageMv,
        Long mileageM,
        Integer gsmSignal,
        Integer engineHoursSeconds
) {}
