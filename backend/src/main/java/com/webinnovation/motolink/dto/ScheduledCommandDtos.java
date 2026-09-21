package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.ScheduledCommand;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public final class ScheduledCommandDtos {

    private ScheduledCommandDtos() {}

    public record ScheduledCommandView(
            UUID id,
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
            Instant createdAt
    ) {
        public static ScheduledCommandView of(ScheduledCommand s) {
            return new ScheduledCommandView(
                    s.id(),
                    s.deviceImei(),
                    s.commandType(),
                    s.commandText(),
                    s.scheduleKind(),
                    s.runAt(),
                    s.daysOfWeek(),
                    s.timeOfDay(),
                    s.nextRunAt(),
                    s.status(),
                    s.lastAttemptAt(),
                    s.lastReply(),
                    s.lastError(),
                    s.attemptCount(),
                    s.createdAt()
            );
        }
    }

    /**
     * Schedule create request. For ONE_TIME, {@code runAt} is required and the
     * other recurring fields are ignored. For DAILY, {@code timeOfDay} is required;
     * {@code daysOfWeek} bitmask controls which weekdays (null = every day).
     * For RAW commands, {@code rawCommand} is the literal GT06 ASCII; for the
     * canned types ({@code CUT_FUEL}, {@code RESTORE_FUEL}, {@code QUERY_ADDRESS})
     * the server fills in the device password.
     */
    public record ScheduleRequest(
            String deviceImei,
            String commandType,
            String rawCommand,
            String devicePassword,
            String scheduleKind,
            Instant runAt,
            Integer daysOfWeek,
            LocalTime timeOfDay
    ) {}
}
