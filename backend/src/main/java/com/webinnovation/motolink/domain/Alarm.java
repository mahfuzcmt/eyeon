package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record Alarm(
        UUID id,
        UUID orgId,
        String deviceImei,
        String type,
        String severity,
        Instant ts,
        Double latitude,
        Double longitude,
        boolean acknowledged,
        UUID acknowledgedBy,
        Instant acknowledgedAt,
        /** HANDLED / FALSE_ALARM / NO_ACTION, set when acknowledged with a result. */
        String processResult,
        String processNotes,
        Map<String, Object> metadata,
        Instant createdAt
) {}
