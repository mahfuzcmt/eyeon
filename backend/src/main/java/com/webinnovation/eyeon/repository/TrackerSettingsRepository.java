package com.webinnovation.eyeon.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Tracker settings (V27): per tracker and setting, what is wanted and what the tracker reported. */
@Repository
@RequiredArgsConstructor
public class TrackerSettingsRepository {

    public static final String SYNCED = "SYNCED";
    public static final String PENDING = "PENDING";
    public static final String FAILED = "FAILED";
    public static final String UNSUPPORTED = "UNSUPPORTED";

    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    /** @param wanted null when the setting was only read from the tracker and never changed here */
    public record Row(String imei, String key, UUID orgId, Map<String, Object> wanted, Map<String, Object> applied,
                      String syncStatus, String trackerReply, Instant syncedAt) {}

    /** The rest window a tracker has confirmed and switched on, with its organization's timezone. */
    public record Window(LocalTime start, LocalTime end, String timezone) {}

    private final RowMapper<Row> mapper = (rs, rn) -> {
        Timestamp synced = rs.getTimestamp("synced_at");
        return new Row(rs.getString("device_imei"), rs.getString("setting_key"), rs.getObject("org_id", UUID.class),
                fromJson(rs.getString("wanted")), fromJson(rs.getString("applied")),
                rs.getString("sync_status"), rs.getString("tracker_reply"), synced == null ? null : synced.toInstant());
    };

    private static final String FIELDS =
            "device_imei, setting_key, org_id, wanted::text AS wanted, applied::text AS applied, sync_status, tracker_reply, synced_at";

    public List<Row> listForDevice(UUID orgId, String imei) {
        return jdbc.query("SELECT " + FIELDS + " FROM tracker_settings WHERE org_id = :orgId AND device_imei = :imei",
                new MapSqlParameterSource("orgId", orgId).addValue("imei", imei), mapper);
    }

    public List<Row> listPending() {
        return jdbc.query("SELECT " + FIELDS + " FROM tracker_settings WHERE sync_status = 'PENDING' ORDER BY updated_at",
                new MapSqlParameterSource(), mapper);
    }

    /** What the carer wants; PENDING until the tracker reports it. What the tracker last reported is kept. */
    public void saveWanted(UUID orgId, String imei, String key, Map<String, Object> wanted) {
        jdbc.update("""
                INSERT INTO tracker_settings (device_imei, setting_key, org_id, wanted, sync_status)
                VALUES (:imei, :key, :orgId, CAST(:wanted AS jsonb), 'PENDING')
                ON CONFLICT (device_imei, setting_key) DO UPDATE
                   SET wanted = EXCLUDED.wanted, sync_status = 'PENDING', tracker_reply = NULL, updated_at = now()
                """, params(orgId, imei, key).addValue("wanted", toJson(wanted)));
    }

    /**
     * What the tracker reported when asked.
     * @param status SYNCED when it is what was wanted (or nothing was wanted), FAILED when it is not
     */
    public void saveApplied(UUID orgId, String imei, String key, Map<String, Object> applied, String status, String reply) {
        jdbc.update("""
                INSERT INTO tracker_settings (device_imei, setting_key, org_id, applied, sync_status, tracker_reply, synced_at)
                VALUES (:imei, :key, :orgId, CAST(:applied AS jsonb), :status, :reply, now())
                ON CONFLICT (device_imei, setting_key) DO UPDATE
                   SET applied = EXCLUDED.applied, sync_status = EXCLUDED.sync_status,
                       tracker_reply = EXCLUDED.tracker_reply, synced_at = now(), updated_at = now()
                """, params(orgId, imei, key).addValue("applied", toJson(applied)).addValue("status", status)
                .addValue("reply", cut(reply)));
    }

    /** The tracker answered something we cannot read. */
    public void saveUnsupported(UUID orgId, String imei, String key, String reply) {
        jdbc.update("""
                INSERT INTO tracker_settings (device_imei, setting_key, org_id, sync_status, tracker_reply)
                VALUES (:imei, :key, :orgId, 'UNSUPPORTED', :reply)
                ON CONFLICT (device_imei, setting_key) DO UPDATE
                   SET sync_status = 'UNSUPPORTED', tracker_reply = EXCLUDED.tracker_reply, updated_at = now()
                """, params(orgId, imei, key).addValue("reply", cut(reply)));
    }

    public record Unread(UUID orgId, String imei) {}

    /** Connected battery-powered trackers none of whose settings have been read yet. */
    public List<Unread> listOnlineUnread(int limit) {
        return jdbc.query("""
                SELECT d.org_id, d.imei
                  FROM devices d
                 WHERE d.status = 'ONLINE' AND d.battery_percent IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM tracker_settings s WHERE s.device_imei = d.imei)
                 ORDER BY d.last_seen_at DESC
                 LIMIT :limit
                """, new MapSqlParameterSource("limit", limit),
                (rs, rn) -> new Unread(rs.getObject("org_id", UUID.class), rs.getString("imei")));
    }

    /** imei -> the night rest each tracker of the organization has confirmed and has switched on. */
    public Map<String, Window> restWindows(UUID orgId) {
        Map<String, Window> out = new HashMap<>();
        jdbc.query("""
                SELECT s.device_imei, s.applied->>'from' AS start_time, s.applied->>'to' AS end_time, o.timezone
                  FROM tracker_settings s JOIN organizations o ON o.id = s.org_id
                 WHERE s.org_id = :orgId AND s.setting_key = 'NIGHT_REST'
                   AND (s.applied->>'enabled')::boolean = true
                """, new MapSqlParameterSource("orgId", orgId), rs -> {
            try {
                out.put(rs.getString("device_imei"), new Window(LocalTime.parse(rs.getString("start_time")),
                        LocalTime.parse(rs.getString("end_time")), rs.getString("timezone")));
            } catch (RuntimeException ignored) {
                // A value we cannot read is treated as "no rest": never hide an offline tracker by mistake.
            }
        });
        return out;
    }

    private static MapSqlParameterSource params(UUID orgId, String imei, String key) {
        return new MapSqlParameterSource("orgId", orgId).addValue("imei", imei).addValue("key", key);
    }

    private String toJson(Map<String, Object> value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot encode setting value", e);
        }
    }

    private Map<String, Object> fromJson(String json) {
        try {
            return json == null ? null : objectMapper.readValue(json, MAP);
        } catch (Exception e) {
            return null;
        }
    }

    private static String cut(String s) {
        return s == null ? null : s.length() > 300 ? s.substring(0, 300) : s;
    }
}
