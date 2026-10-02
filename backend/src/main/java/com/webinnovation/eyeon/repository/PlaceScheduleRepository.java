package com.webinnovation.eyeon.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Expected times on trusted places (V25) and the per-day bookkeeping shared with battery reminders. */
@Repository
@RequiredArgsConstructor
public class PlaceScheduleRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record Schedule(UUID id, UUID geofenceId, String kind, LocalTime localTime, List<Integer> weekdays,
                           boolean active, Instant createdAt) {}

    /** One schedule for one assigned person, with everything the sweep needs to decide. */
    public record Due(UUID scheduleId, String kind, LocalTime localTime, List<Integer> weekdays,
                      UUID geofenceId, UUID orgId, String placeName, String placeType, UUID ownerUserId,
                      String timezone, String imei, Boolean inside) {}

    private static List<Integer> ints(Array a) throws SQLException {
        List<Integer> out = new ArrayList<>();
        if (a == null) return out;
        for (Object o : (Object[]) a.getArray()) out.add(((Number) o).intValue());
        return out;
    }

    public List<Schedule> listForGeofence(UUID geofenceId) {
        return jdbc.query("""
                SELECT id, geofence_id, kind, local_time, weekdays, is_active, created_at
                FROM place_schedules WHERE geofence_id = :gid ORDER BY local_time, created_at
                """, new MapSqlParameterSource("gid", geofenceId),
                (rs, rn) -> new Schedule(rs.getObject("id", UUID.class), rs.getObject("geofence_id", UUID.class),
                        rs.getString("kind"), rs.getObject("local_time", LocalTime.class), ints(rs.getArray("weekdays")),
                        rs.getBoolean("is_active"), rs.getObject("created_at", OffsetDateTime.class).toInstant()));
    }

    public UUID insert(UUID orgId, UUID geofenceId, String kind, LocalTime at, List<Integer> weekdays) {
        return jdbc.queryForObject("""
                INSERT INTO place_schedules (org_id, geofence_id, kind, local_time, weekdays)
                VALUES (:orgId, :gid, :kind, :at, CAST(:days AS smallint[]))
                RETURNING id
                """, new MapSqlParameterSource("orgId", orgId).addValue("gid", geofenceId).addValue("kind", kind)
                .addValue("at", at)
                .addValue("days", "{" + String.join(",", weekdays.stream().map(String::valueOf).toList()) + "}"),
                UUID.class);
    }

    public int delete(UUID geofenceId, UUID scheduleId) {
        return jdbc.update("DELETE FROM place_schedules WHERE id = :id AND geofence_id = :gid",
                new MapSqlParameterSource("id", scheduleId).addValue("gid", geofenceId));
    }

    /** Every active schedule x every person assigned to its (active) place, with their current state. */
    public List<Due> listActiveWithState() {
        return jdbc.query("""
                SELECT s.id, s.kind, s.local_time, s.weekdays,
                       g.id AS geofence_id, g.org_id, g.name, g.place_type, g.owner_user_id,
                       o.timezone, gd.device_imei, st.is_inside
                FROM place_schedules s
                JOIN geofences g ON g.id = s.geofence_id AND g.is_active
                JOIN organizations o ON o.id = g.org_id
                JOIN geofence_devices gd ON gd.geofence_id = g.id
                LEFT JOIN geofence_states st ON st.geofence_id = g.id AND st.device_imei = gd.device_imei
                WHERE s.is_active
                """, new MapSqlParameterSource(),
                (rs, rn) -> new Due(rs.getObject("id", UUID.class), rs.getString("kind"),
                        rs.getObject("local_time", LocalTime.class), ints(rs.getArray("weekdays")),
                        rs.getObject("geofence_id", UUID.class), rs.getObject("org_id", UUID.class),
                        rs.getString("name"), rs.getString("place_type"), rs.getObject("owner_user_id", UUID.class),
                        rs.getString("timezone"), rs.getString("device_imei"), (Boolean) rs.getObject("is_inside")));
    }

    // ---- daily_checks ----

    /** @return the day's status for this check and person, or null when nothing was recorded yet */
    public String checkStatus(String key, String imei, LocalDate day) {
        List<String> rows = jdbc.queryForList("""
                SELECT status FROM daily_checks WHERE check_key = :key AND device_imei = :imei AND day = :day
                """, new MapSqlParameterSource("key", key).addValue("imei", imei).addValue("day", day), String.class);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public void setCheck(String key, String imei, LocalDate day, String status) {
        jdbc.update("""
                INSERT INTO daily_checks (check_key, device_imei, day, status) VALUES (:key, :imei, :day, :status)
                ON CONFLICT (check_key, device_imei, day) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
                """, new MapSqlParameterSource("key", key).addValue("imei", imei).addValue("day", day)
                .addValue("status", status));
    }

    /** Claims the check for today. @return true only for the first caller (safe with several instances). */
    public boolean claimCheck(String key, String imei, LocalDate day, String status) {
        return jdbc.update("""
                INSERT INTO daily_checks (check_key, device_imei, day, status) VALUES (:key, :imei, :day, :status)
                ON CONFLICT (check_key, device_imei, day) DO NOTHING
                """, new MapSqlParameterSource("key", key).addValue("imei", imei).addValue("day", day)
                .addValue("status", status)) == 1;
    }

    /** Old bookkeeping rows are of no use after a few days. */
    public int purgeChecksBefore(LocalDate day) {
        return jdbc.update("DELETE FROM daily_checks WHERE day < :day", new MapSqlParameterSource("day", day));
    }

    /** A battery-powered tracker that reported recently, for the charge reminders. */
    public record BatteryRow(UUID orgId, String imei, int batteryPercent, Double lat, Double lng, String timezone) {}

    public List<BatteryRow> listRecentBatteries(int withinHours) {
        return jdbc.query("""
                SELECT d.org_id, d.imei, d.battery_percent,
                       ST_Y(d.last_location::geometry) AS lat, ST_X(d.last_location::geometry) AS lng, o.timezone
                FROM devices d JOIN organizations o ON o.id = d.org_id
                WHERE d.battery_percent IS NOT NULL
                  AND d.last_seen_at > now() - make_interval(hours => :hours)
                """, new MapSqlParameterSource("hours", withinHours),
                (rs, rn) -> new BatteryRow(rs.getObject("org_id", UUID.class), rs.getString("imei"),
                        rs.getInt("battery_percent"),
                        rs.getObject("lat") == null ? null : rs.getDouble("lat"),
                        rs.getObject("lng") == null ? null : rs.getDouble("lng"),
                        rs.getString("timezone")));
    }
}
