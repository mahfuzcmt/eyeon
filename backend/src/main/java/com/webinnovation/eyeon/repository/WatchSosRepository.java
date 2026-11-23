package com.webinnovation.eyeon.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** {@code watch_sos_numbers} (V37): the SOS numbers a carer set on a smart watch. */
@Repository
@RequiredArgsConstructor
public class WatchSosRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /** {@code numbers}: 0-3 cleaned numbers, in the order the watch calls them. */
    public record Row(String imei, List<String> numbers, String status, Instant syncedAt) {}

    public Optional<Row> find(String imei) {
        return jdbc.query("""
                SELECT device_imei, numbers, status, synced_at FROM watch_sos_numbers WHERE device_imei = :imei
                """, new MapSqlParameterSource("imei", imei), (rs, i) -> row(rs)).stream().findFirst();
    }

    public List<Row> listPending() {
        return jdbc.query("""
                SELECT device_imei, numbers, status, synced_at FROM watch_sos_numbers WHERE status = 'PENDING'
                """, (rs, i) -> row(rs));
    }

    /** What the carer wants; waits as PENDING until the watch has answered. */
    public void saveWanted(UUID orgId, String imei, List<String> numbers) {
        jdbc.update("""
                INSERT INTO watch_sos_numbers (device_imei, org_id, numbers, status, updated_at)
                VALUES (:imei, :orgId, :numbers, 'PENDING', now())
                ON CONFLICT (device_imei) DO UPDATE
                   SET numbers = EXCLUDED.numbers, status = 'PENDING', updated_at = now()
                """, new MapSqlParameterSource("imei", imei).addValue("orgId", orgId)
                .addValue("numbers", String.join(",", numbers)));
    }

    /** Send the stored numbers again (the watch restarted and may have lost them). */
    public void markPending(String imei) {
        jdbc.update("UPDATE watch_sos_numbers SET status = 'PENDING', updated_at = now() WHERE device_imei = :imei",
                new MapSqlParameterSource("imei", imei));
    }

    /** The watch answered with these numbers; ignored when the carer changed them meanwhile. */
    public void markSynced(String imei, List<String> numbers) {
        jdbc.update("""
                UPDATE watch_sos_numbers SET status = 'SYNCED', synced_at = now()
                 WHERE device_imei = :imei AND numbers = :numbers
                """, new MapSqlParameterSource("imei", imei).addValue("numbers", String.join(",", numbers)));
    }

    private static Row row(java.sql.ResultSet rs) throws java.sql.SQLException {
        Timestamp synced = rs.getTimestamp("synced_at");
        String stored = rs.getString("numbers");
        List<String> numbers = stored == null || stored.isEmpty() ? List.of() : Arrays.asList(stored.split(","));
        return new Row(rs.getString("device_imei"), List.copyOf(numbers), rs.getString("status"),
                synced == null ? null : synced.toInstant());
    }
}
