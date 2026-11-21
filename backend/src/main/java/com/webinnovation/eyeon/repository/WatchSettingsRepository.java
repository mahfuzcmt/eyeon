package com.webinnovation.eyeon.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** {@code watch_settings} (V35): the language and time zone a carer chose for a smart watch. */
@Repository
@RequiredArgsConstructor
public class WatchSettingsRepository {

    public static final String PENDING = "PENDING";
    public static final String SYNCED = "SYNCED";

    private final NamedParameterJdbcTemplate jdbc;

    public record Row(String imei, int language, int zoneHours, String status, Instant syncedAt) {}

    public Optional<Row> find(String imei) {
        return jdbc.query("""
                SELECT device_imei, language, zone_hours, status, synced_at
                  FROM watch_settings WHERE device_imei = :imei
                """, new MapSqlParameterSource("imei", imei), (rs, i) -> row(rs)).stream().findFirst();
    }

    public List<Row> listPending() {
        return jdbc.query("""
                SELECT device_imei, language, zone_hours, status, synced_at
                  FROM watch_settings WHERE status = 'PENDING'
                """, (rs, i) -> row(rs));
    }

    /** What the carer wants; waits as PENDING until the watch has answered. */
    public void saveWanted(UUID orgId, String imei, int language, int zoneHours) {
        jdbc.update("""
                INSERT INTO watch_settings (device_imei, org_id, language, zone_hours, status, updated_at)
                VALUES (:imei, :orgId, :language, :zone, 'PENDING', now())
                ON CONFLICT (device_imei) DO UPDATE
                   SET language = EXCLUDED.language, zone_hours = EXCLUDED.zone_hours,
                       status = 'PENDING', updated_at = now()
                """, new MapSqlParameterSource("imei", imei).addValue("orgId", orgId)
                .addValue("language", language).addValue("zone", zoneHours));
    }

    /** Send the stored values again (the watch restarted and may have lost them). */
    public void markPending(String imei) {
        jdbc.update("UPDATE watch_settings SET status = 'PENDING', updated_at = now() WHERE device_imei = :imei",
                new MapSqlParameterSource("imei", imei));
    }

    /** The watch answered a command with these values; ignored when the carer changed them meanwhile. */
    public void markSynced(String imei, int language, int zoneHours) {
        jdbc.update("""
                UPDATE watch_settings SET status = 'SYNCED', synced_at = now()
                 WHERE device_imei = :imei AND language = :language AND zone_hours = :zone
                """, new MapSqlParameterSource("imei", imei)
                .addValue("language", language).addValue("zone", zoneHours));
    }

    private static Row row(java.sql.ResultSet rs) throws java.sql.SQLException {
        Timestamp synced = rs.getTimestamp("synced_at");
        return new Row(rs.getString("device_imei"), rs.getInt("language"), rs.getInt("zone_hours"),
                rs.getString("status"), synced == null ? null : synced.toInstant());
    }
}
