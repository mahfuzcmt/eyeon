package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.ScheduledCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Time;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ScheduledCommandRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, device_imei, command_type, command_text,
                   schedule_kind, run_at, days_of_week, time_of_day,
                   next_run_at, status, last_attempt_at, last_reply, last_error,
                   attempt_count, created_by, created_at, updated_at
            FROM scheduled_commands
            """;

    private static final RowMapper<ScheduledCommand> ROW_MAPPER = (rs, rn) -> {
        OffsetDateTime runAt = rs.getObject("run_at", OffsetDateTime.class);
        Object daysOfWeek = rs.getObject("days_of_week");
        Time timeOfDay = (Time) rs.getObject("time_of_day");
        OffsetDateTime lastAttempt = rs.getObject("last_attempt_at", OffsetDateTime.class);
        return new ScheduledCommand(
                rs.getObject("id", UUID.class),
                rs.getObject("org_id", UUID.class),
                rs.getString("device_imei"),
                rs.getString("command_type"),
                rs.getString("command_text"),
                rs.getString("schedule_kind"),
                runAt == null ? null : runAt.toInstant(),
                daysOfWeek == null ? null : rs.getInt("days_of_week"),
                timeOfDay == null ? null : timeOfDay.toLocalTime(),
                rs.getObject("next_run_at", OffsetDateTime.class).toInstant(),
                rs.getString("status"),
                lastAttempt == null ? null : lastAttempt.toInstant(),
                rs.getString("last_reply"),
                rs.getString("last_error"),
                rs.getInt("attempt_count"),
                rs.getObject("created_by", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant()
        );
    };

    public UUID insert(UUID orgId, String imei, String commandType, String commandText,
                       String scheduleKind, Instant runAt, Integer daysOfWeek, LocalTime timeOfDay,
                       Instant nextRunAt, UUID createdBy) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("type", commandType)
                .addValue("text", commandText)
                .addValue("kind", scheduleKind)
                .addValue("runAt", runAt == null ? null : Timestamp.from(runAt))
                .addValue("days", daysOfWeek)
                .addValue("timeOfDay", timeOfDay == null ? null : Time.valueOf(timeOfDay))
                .addValue("nextRunAt", Timestamp.from(nextRunAt))
                .addValue("createdBy", createdBy);
        jdbc.update("""
                INSERT INTO scheduled_commands
                  (id, org_id, device_imei, command_type, command_text,
                   schedule_kind, run_at, days_of_week, time_of_day, next_run_at, created_by)
                VALUES
                  (:id, :orgId, :imei, :type, :text,
                   :kind, :runAt, :days, :timeOfDay, :nextRunAt, :createdBy)
                """, params);
        return id;
    }

    public List<ScheduledCommand> listForOrg(UUID orgId, int limit, int offset) {
        return jdbc.query(
                SELECT_FIELDS + " WHERE org_id = :orgId ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
                new MapSqlParameterSource("orgId", orgId)
                        .addValue("limit", limit)
                        .addValue("offset", offset),
                ROW_MAPPER);
    }

    public Optional<ScheduledCommand> findByOrgAndId(UUID orgId, UUID id) {
        try {
            ScheduledCommand s = jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE org_id = :orgId AND id = :id",
                    new MapSqlParameterSource("orgId", orgId).addValue("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(s);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    /**
     * Atomically claim due commands. SKIP LOCKED so two backend instances don't
     * grab the same row when we eventually scale beyond a single VPS.
     */
    public List<ScheduledCommand> claimDue(Instant now, int limit) {
        var params = new MapSqlParameterSource()
                .addValue("now", Timestamp.from(now))
                .addValue("limit", limit);
        return jdbc.query("""
                WITH due AS (
                    SELECT id FROM scheduled_commands
                    WHERE status = 'PENDING' AND next_run_at <= :now
                    ORDER BY next_run_at
                    LIMIT :limit
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE scheduled_commands sc
                SET attempt_count = sc.attempt_count + 1,
                    last_attempt_at = :now,
                    updated_at = now()
                FROM due
                WHERE sc.id = due.id
                RETURNING sc.id, sc.org_id, sc.device_imei, sc.command_type, sc.command_text,
                          sc.schedule_kind, sc.run_at, sc.days_of_week, sc.time_of_day,
                          sc.next_run_at, sc.status, sc.last_attempt_at, sc.last_reply, sc.last_error,
                          sc.attempt_count, sc.created_by, sc.created_at, sc.updated_at
                """, params, ROW_MAPPER);
    }

    public void markSucceeded(UUID id, String reply, Instant nextRunAt, String nextStatus) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("reply", reply)
                .addValue("nextRunAt", Timestamp.from(nextRunAt))
                .addValue("status", nextStatus);
        jdbc.update("""
                UPDATE scheduled_commands SET
                  status = :status,
                  last_reply = :reply,
                  last_error = NULL,
                  next_run_at = :nextRunAt,
                  updated_at = now()
                WHERE id = :id
                """, params);
    }

    public void markFailed(UUID id, String error, Instant nextRunAt, String nextStatus) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("error", truncate(error))
                .addValue("nextRunAt", Timestamp.from(nextRunAt))
                .addValue("status", nextStatus);
        jdbc.update("""
                UPDATE scheduled_commands SET
                  status = :status,
                  last_error = :error,
                  next_run_at = :nextRunAt,
                  updated_at = now()
                WHERE id = :id
                """, params);
    }

    public boolean cancel(UUID orgId, UUID id) {
        int n = jdbc.update("""
                UPDATE scheduled_commands SET
                  status = 'CANCELLED', updated_at = now()
                WHERE org_id = :orgId AND id = :id AND status = 'PENDING'
                """, new MapSqlParameterSource("orgId", orgId).addValue("id", id));
        return n > 0;
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() > 1000 ? s.substring(0, 1000) : s;
    }
}
