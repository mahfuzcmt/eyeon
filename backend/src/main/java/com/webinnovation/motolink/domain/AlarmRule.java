package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public record AlarmRule(
        UUID id,
        UUID orgId,
        UUID ownerUserId,
        String name,
        String ruleType,
        Double threshold,
        LocalTime windowStart,
        LocalTime windowEnd,
        int cooldownSeconds,
        String severity,
        boolean active,
        boolean appliesToAll,
        Instant createdAt,
        Instant updatedAt
) {}
