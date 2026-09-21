package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.ScheduledCommand;
import com.webinnovation.motolink.dto.ScheduledCommandDtos.ScheduleRequest;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.repository.ScheduledCommandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Schedule create/list/cancel and tick-driven dispatch. Recurring schedules
 * resolve in {@code Asia/Dhaka} — see {@link DashboardService} for the same
 * single-region assumption.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledCommandService {

    private static final ZoneId BD_ZONE = ZoneId.of("Asia/Dhaka");
    private static final int CLAIM_BATCH = 50;

    private final ScheduledCommandRepository repo;
    private final DeviceCommandService deviceCommandService;

    public UUID schedule(UUID orgId, UUID userId, ScheduleRequest req) {
        validate(req);
        String commandText = renderCommandText(req);
        Instant nextRun = computeFirstRunAt(req);
        return repo.insert(
                orgId,
                req.deviceImei(),
                req.commandType(),
                commandText,
                req.scheduleKind(),
                "ONE_TIME".equals(req.scheduleKind()) ? req.runAt() : null,
                "DAILY".equals(req.scheduleKind()) ? req.daysOfWeek() : null,
                "DAILY".equals(req.scheduleKind()) ? req.timeOfDay() : null,
                nextRun,
                userId
        );
    }

    public List<ScheduledCommand> list(UUID orgId, int limit, int offset) {
        return repo.listForOrg(orgId, limit, offset);
    }

    public boolean cancel(UUID orgId, UUID id) {
        return repo.cancel(orgId, id);
    }

    /**
     * Dispatcher tick. Claims a batch of due commands, fires them through
     * {@link DeviceCommandService}, then either recomputes next_run_at (DAILY)
     * or marks SUCCEEDED/FAILED (ONE_TIME).
     */
    public void tick() {
        List<ScheduledCommand> due = repo.claimDue(Instant.now(), CLAIM_BATCH);
        for (ScheduledCommand cmd : due) {
            dispatch(cmd);
        }
    }

    private void dispatch(ScheduledCommand cmd) {
        try {
            String reply = deviceCommandService
                    .sendRaw(cmd.orgId(), cmd.deviceImei(), cmd.commandText())
                    .get();   // dispatcher already runs on a worker; block is fine
            applySuccess(cmd, reply);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            log.warn("Scheduled command {} failed for imei={}: {}", cmd.id(), cmd.deviceImei(),
                    cause.getMessage());
            applyFailure(cmd, cause.getMessage());
        }
    }

    private void applySuccess(ScheduledCommand cmd, String reply) {
        if ("DAILY".equals(cmd.scheduleKind())) {
            Instant next = computeNextDailyAfter(cmd.timeOfDay(), cmd.daysOfWeek(), Instant.now());
            repo.markSucceeded(cmd.id(), reply, next, "PENDING");
        } else {
            // ONE_TIME — no further runs; pin next_run_at far enough out that the partial
            // index excludes it.
            repo.markSucceeded(cmd.id(), reply, cmd.nextRunAt(), "SUCCEEDED");
        }
    }

    private void applyFailure(ScheduledCommand cmd, String error) {
        if ("DAILY".equals(cmd.scheduleKind())) {
            // Recurring — log the error, schedule the next occurrence.
            Instant next = computeNextDailyAfter(cmd.timeOfDay(), cmd.daysOfWeek(), Instant.now());
            repo.markFailed(cmd.id(), error, next, "PENDING");
        } else {
            repo.markFailed(cmd.id(), error, cmd.nextRunAt(), "FAILED");
        }
    }

    private void validate(ScheduleRequest req) {
        if (req.deviceImei() == null || req.deviceImei().isBlank()) {
            throw new DomainException("VALIDATION", "deviceImei is required");
        }
        if (req.commandType() == null || req.commandType().isBlank()) {
            throw new DomainException("VALIDATION", "commandType is required");
        }
        switch (req.commandType()) {
            case "CUT_FUEL", "RESTORE_FUEL", "QUERY_ADDRESS" -> {
                if (req.devicePassword() == null || req.devicePassword().isBlank()) {
                    throw new DomainException("VALIDATION", "devicePassword required for " + req.commandType());
                }
            }
            case "RAW" -> {
                if (req.rawCommand() == null || req.rawCommand().isBlank()) {
                    throw new DomainException("VALIDATION", "rawCommand required for RAW commands");
                }
            }
            default -> throw new DomainException("VALIDATION", "Unknown commandType: " + req.commandType());
        }
        if ("ONE_TIME".equals(req.scheduleKind())) {
            if (req.runAt() == null) {
                throw new DomainException("VALIDATION", "runAt required for ONE_TIME");
            }
            if (req.runAt().isBefore(Instant.now().minusSeconds(60))) {
                throw new DomainException("VALIDATION", "runAt is in the past");
            }
        } else if ("DAILY".equals(req.scheduleKind())) {
            if (req.timeOfDay() == null) {
                throw new DomainException("VALIDATION", "timeOfDay required for DAILY");
            }
            if (req.daysOfWeek() != null && (req.daysOfWeek() < 0 || req.daysOfWeek() > 127)) {
                throw new DomainException("VALIDATION", "daysOfWeek bitmask out of range (0-127)");
            }
        } else {
            throw new DomainException("VALIDATION", "scheduleKind must be ONE_TIME or DAILY");
        }
    }

    private String renderCommandText(ScheduleRequest req) {
        return switch (req.commandType()) {
            case "CUT_FUEL" -> "DYD," + req.devicePassword() + "#";
            case "RESTORE_FUEL" -> "HFYD," + req.devicePassword() + "#";
            case "QUERY_ADDRESS" -> "WHERE," + req.devicePassword() + "#";
            case "RAW" -> req.rawCommand();
            default -> throw new DomainException("VALIDATION", "Unknown commandType: " + req.commandType());
        };
    }

    private Instant computeFirstRunAt(ScheduleRequest req) {
        if ("ONE_TIME".equals(req.scheduleKind())) {
            return req.runAt();
        }
        return computeNextDailyAfter(req.timeOfDay(), req.daysOfWeek(), Instant.now());
    }

    /**
     * Find the next instant matching {@code timeOfDay} (in BD timezone) on a day
     * permitted by {@code daysMask}. Mask bit 0 = Sunday, ..., bit 6 = Saturday.
     * Null mask means every day.
     */
    private Instant computeNextDailyAfter(LocalTime timeOfDay, Integer daysMask, Instant after) {
        ZonedDateTime cursor = after.atZone(BD_ZONE);
        // Try today's slot first; if it's already passed, start from tomorrow.
        ZonedDateTime candidate = cursor.toLocalDate().atTime(timeOfDay).atZone(BD_ZONE);
        if (!candidate.toInstant().isAfter(after)) {
            candidate = candidate.plusDays(1);
        }
        for (int i = 0; i < 8; i++) {
            if (dayPermitted(candidate.getDayOfWeek(), daysMask)) {
                return candidate.toInstant();
            }
            candidate = candidate.plusDays(1);
        }
        // No day in the mask is set — should be caught by validation, but fall back
        // to a far-future timestamp so the row stops dispatching.
        return after.plusSeconds(86400L * 365);
    }

    private boolean dayPermitted(DayOfWeek dow, Integer mask) {
        if (mask == null) return true;
        // DayOfWeek: MONDAY=1 ... SUNDAY=7. Mask bit 0 = Sunday.
        int bit = dow == DayOfWeek.SUNDAY ? 0 : dow.getValue();   // 0..6
        return (mask & (1 << bit)) != 0;
    }
}
