package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduledCommand(
        UUID id,
        UUID orgId,
        String deviceImei,
        String commandType,
        String commandText,
        String scheduleKind,
        Instant runAt,
        Integer daysOfWeek,
        LocalTime timeOfDay,
        Instant nextRunAt,
        String status,
        Instant lastAttemptAt,
        String lastReply,
        String lastError,
        int attemptCount,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt
) {}
