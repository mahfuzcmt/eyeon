package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.AlarmRule;
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
public class AlarmRuleRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, owner_user_id, name, rule_type, threshold,
                   window_start, window_end, cooldown_seconds, severity,
                   is_active, applies_to_all, created_at, updated_at
            FROM alarm_rules
            """;

    private static final RowMapper<AlarmRule> ROW_MAPPER = (rs, rn) -> {
        Object thr = rs.getObject("threshold");
        Time ws = (Time) rs.getObject("window_start");
        Time we = (Time) rs.getObject("window_end");
        return new AlarmRule(
                rs.getObject("id", UUID.class),
                rs.getObject("org_id", UUID.class),
                rs.getObject("owner_user_id", UUID.class),
                rs.getString("name"),
                rs.getString("rule_type"),
                thr == null ? null : rs.getDouble("threshold"),
                ws == null ? null : ws.toLocalTime(),
                we == null ? null : we.toLocalTime(),
                rs.getInt("cooldown_seconds"),
                rs.getString("severity"),
                rs.getBoolean("is_active"),
                rs.getBoolean("applies_to_all"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant()
        );
    };

    public UUID insert(UUID orgId, UUID ownerUserId, String name, String ruleType, Double threshold,
                       LocalTime windowStart, LocalTime windowEnd, int cooldownSeconds,
                       String severity, boolean active, boolean appliesToAll) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("owner", ownerUserId)
                .addValue("name", name)
                .addValue("type", ruleType)
                .addValue("threshold", threshold)
                .addValue("ws", windowStart == null ? null : Time.valueOf(windowStart))
                .addValue("we", windowEnd == null ? null : Time.valueOf(windowEnd))
                .addValue("cooldown", cooldownSeconds)
                .addValue("severity", severity)
                .addValue("active", active)
                .addValue("appliesAll", appliesToAll);
        jdbc.update("""
                INSERT INTO alarm_rules
                  (id, org_id, owner_user_id, name, rule_type, threshold, window_start, window_end,
                   cooldown_seconds, severity, is_active, applies_to_all)
                VALUES
                  (:id, :orgId, :owner, :name, :type, :threshold, :ws, :we,
                   :cooldown, :severity, :active, :appliesAll)
                """, params);
        return id;
    }

    /** Rules are per user: only the owner can read or edit one. */
    public Optional<AlarmRule> findByOwnerAndId(UUID ownerUserId, UUID id) {
        try {
            AlarmRule r = jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE owner_user_id = :owner AND id = :id",
                    new MapSqlParameterSource("owner", ownerUserId).addValue("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(r);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<AlarmRule> listForOwner(UUID ownerUserId) {
        return jdbc.query(
                SELECT_FIELDS + " WHERE owner_user_id = :owner ORDER BY created_at DESC",
                new MapSqlParameterSource("owner", ownerUserId),
                ROW_MAPPER);
    }

    /**
     * Active rules that apply to the given device: explicitly assigned, or
     * applies_to_all rules whose owner may see the device (admins / see_all_devices /
     * a user_devices row) — a restricted user's "all vehicles" means all of theirs.
     */
    public List<AlarmRule> findActiveForDevice(UUID orgId, String imei) {
        return jdbc.query("""
                SELECT DISTINCT ON (r.id) r.id, r.org_id, r.owner_user_id, r.name, r.rule_type, r.threshold,
                       r.window_start, r.window_end, r.cooldown_seconds, r.severity,
                       r.is_active, r.applies_to_all, r.created_at, r.updated_at
                FROM alarm_rules r
                JOIN users u ON u.id = r.owner_user_id
                LEFT JOIN alarm_rule_devices d ON d.rule_id = r.id
                WHERE r.org_id = :orgId
                  AND r.is_active = true
                  AND u.is_active = true
                  AND (d.device_imei = :imei
                       OR (r.applies_to_all = true
                           AND (u.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
                                OR u.see_all_devices = true
                                OR EXISTS (SELECT 1 FROM user_devices ud
                                            WHERE ud.user_id = u.id AND ud.device_imei = :imei))))
                """,
                new MapSqlParameterSource("orgId", orgId).addValue("imei", imei),
                ROW_MAPPER);
    }

    /** Active rules of the given types across every org — the state sweep's work list. */
    public List<AlarmRule> listActiveByTypes(java.util.Collection<String> ruleTypes) {
        if (ruleTypes == null || ruleTypes.isEmpty()) return List.of();
        return jdbc.query("""
                SELECT id, org_id, owner_user_id, name, rule_type, threshold, window_start, window_end,
                       cooldown_seconds, severity, is_active, applies_to_all, created_at, updated_at
                  FROM alarm_rules
                 WHERE is_active = true AND rule_type IN (:types)
                """, new MapSqlParameterSource("types", ruleTypes), ROW_MAPPER);
    }

    public boolean update(UUID ownerUserId, UUID id, String name, Double threshold,
                          LocalTime windowStart, LocalTime windowEnd, Integer cooldownSeconds,
                          String severity, Boolean active, Boolean appliesToAll) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("owner", ownerUserId)
                .addValue("name", name)
                .addValue("threshold", threshold)
                .addValue("ws", windowStart == null ? null : Time.valueOf(windowStart))
                .addValue("we", windowEnd == null ? null : Time.valueOf(windowEnd))
                .addValue("cooldown", cooldownSeconds)
                .addValue("severity", severity)
                .addValue("active", active)
                .addValue("appliesAll", appliesToAll);
        int n = jdbc.update("""
                UPDATE alarm_rules SET
                  name            = COALESCE(:name, name),
                  threshold       = COALESCE(:threshold, threshold),
                  window_start    = COALESCE(:ws, window_start),
                  window_end      = COALESCE(:we, window_end),
                  cooldown_seconds = COALESCE(:cooldown, cooldown_seconds),
                  severity        = COALESCE(:severity, severity),
                  is_active       = COALESCE(:active, is_active),
                  applies_to_all  = COALESCE(:appliesAll, applies_to_all),
                  updated_at      = now()
                WHERE owner_user_id = :owner AND id = :id
                """, params);
        return n > 0;
    }

    public boolean delete(UUID ownerUserId, UUID id) {
        int n = jdbc.update("DELETE FROM alarm_rules WHERE owner_user_id = :owner AND id = :id",
                new MapSqlParameterSource("owner", ownerUserId).addValue("id", id));
        return n > 0;
    }

    public void assignDevice(UUID ruleId, String imei) {
        jdbc.update("""
                INSERT INTO alarm_rule_devices(rule_id, device_imei) VALUES (:rid, :imei)
                ON CONFLICT DO NOTHING
                """, new MapSqlParameterSource("rid", ruleId).addValue("imei", imei));
    }

    public void unassignAllDevices(UUID ruleId) {
        jdbc.update("DELETE FROM alarm_rule_devices WHERE rule_id = :rid",
                new MapSqlParameterSource("rid", ruleId));
    }

    public List<String> listAssignedImeis(UUID ruleId) {
        return jdbc.queryForList(
                "SELECT device_imei FROM alarm_rule_devices WHERE rule_id = :rid ORDER BY device_imei",
                new MapSqlParameterSource("rid", ruleId), String.class);
    }

    /**
     * Atomically check the cooldown and update last_fired_at if cooled-down.
     * Returns true when the rule is allowed to fire (i.e. previous fire is older
     * than {@code cooldownSeconds}, or no previous fire exists). Inserts/updates
     * the state row when returning true.
     */
    public boolean tryFire(UUID ruleId, String imei, int cooldownSeconds, Instant now) {
        var params = new MapSqlParameterSource()
                .addValue("rid", ruleId)
                .addValue("imei", imei)
                .addValue("cooldown", cooldownSeconds)
                .addValue("now", Timestamp.from(now));
        int n = jdbc.update("""
                INSERT INTO alarm_rule_state(rule_id, device_imei, last_fired_at)
                VALUES (:rid, :imei, :now)
                ON CONFLICT (rule_id, device_imei) DO UPDATE
                  SET last_fired_at = EXCLUDED.last_fired_at
                  WHERE alarm_rule_state.last_fired_at < (:now::timestamptz - (:cooldown || ' seconds')::interval)
                """, params);
        return n > 0;
    }
}
