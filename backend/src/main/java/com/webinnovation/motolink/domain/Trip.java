package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

public record Trip(
        UUID id,
        UUID orgId,
        String deviceImei,
        Instant startedAt,
        Instant endedAt,
        Double startLat,
        Double startLng,
        Double endLat,
        Double endLng,
        int distanceM,
        Integer durationS,
        int maxSpeed,
        int avgSpeed,
        int idleTimeS,
        String status,
        Instant createdAt
) {}
