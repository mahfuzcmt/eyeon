package com.webinnovation.eyeon.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Drawn routes to / from trusted places (V30, named and scheduled since V38). */
@Repository
@RequiredArgsConstructor
public class PlaceRouteRepository {

    private static final TypeReference<List<Pt>> PTS = new TypeReference<>() {};

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    /** {@code weekdays}, {@code timeFrom}, {@code timeTo} are all null for a route from before V38. */
    public record Route(UUID id, UUID geofenceId, String direction, String mode, List<Pt> waypoints, List<Pt> path,
                        int widthM, boolean active, Instant updatedAt, String name, UUID otherGeofenceId,
                        List<Integer> weekdays, LocalTime timeFrom, LocalTime timeTo, String severity) {}

    /** What is stored for a route besides its place. */
    public record Fields(String direction, String mode, List<Pt> waypoints, List<Pt> path, int widthM, String name,
                         UUID otherGeofenceId, List<Integer> weekdays, LocalTime timeFrom, LocalTime timeTo,
                         String severity) {}

    /**
     * One route x one person assigned to its place, with what the watch needs to decide.
     *
     * <p>A route with its own days ({@code timeFrom} set) comes once per person; a route from
     * before V38 comes once per expected time of the matching kind (ARRIVE_BY for TO, LEAVE_BY for
     * FROM) with {@code localTime} / {@code graceMinutes} set instead.
     *
     * @param inside / changedAt           the person's state at the route's place
     * @param otherInside / otherChangedAt the same at the place on the other end, when there is one
     */
    public record Watchable(UUID routeId, String direction, List<Pt> path, int widthM, String severity, String routeName,
                            UUID geofenceId, UUID orgId, String placeName, String placeType, UUID ownerUserId,
                            String timezone, String imei, List<Integer> weekdays,
                            LocalTime localTime, int graceMinutes, LocalTime timeFrom, LocalTime timeTo,
                            Boolean inside, Instant changedAt,
                            String otherName, Boolean otherInside, Instant otherChangedAt) {}

    private List<Pt> pts(String json) {
        try {
            return objectMapper.readValue(json, PTS);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Bad route JSON", e);
        }
    }

    private String json(List<Pt> pts) {
        try {
            return objectMapper.writeValueAsString(pts);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static List<Integer> ints(Array a) throws SQLException {
        if (a == null) return null;
        List<Integer> out = new ArrayList<>();
        for (Object o : (Object[]) a.getArray()) out.add(((Number) o).intValue());
        return out;
    }

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        OffsetDateTime t = rs.getObject(col, OffsetDateTime.class);
        return t == null ? null : t.toInstant();
    }

    private static final String COLUMNS = """
            id, geofence_id, direction, mode, waypoints::text AS waypoints, path::text AS path, width_m, is_active,
            updated_at, name, other_geofence_id, weekdays, time_from, time_to, severity
            """;

    private RowMapper<Route> routeMapper() {
        return (rs, rn) -> new Route(rs.getObject("id", UUID.class), rs.getObject("geofence_id", UUID.class),
                rs.getString("direction"), rs.getString("mode"), pts(rs.getString("waypoints")),
                pts(rs.getString("path")), rs.getInt("width_m"), rs.getBoolean("is_active"),
                instant(rs, "updated_at"), rs.getString("name"), rs.getObject("other_geofence_id", UUID.class),
                ints(rs.getArray("weekdays")), rs.getObject("time_from", LocalTime.class),
                rs.getObject("time_to", LocalTime.class), rs.getString("severity"));
    }

    /** Routes to the place first, then the ones back, oldest first within each. */
    public List<Route> listForGeofence(UUID geofenceId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM place_routes WHERE geofence_id = :gid"
                + " ORDER BY direction DESC, created_at, id", new MapSqlParameterSource("gid", geofenceId), routeMapper());
    }

    public Optional<Route> find(UUID geofenceId, UUID routeId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM place_routes WHERE geofence_id = :gid AND id = :id",
                new MapSqlParameterSource("gid", geofenceId).addValue("id", routeId), routeMapper()).stream().findFirst();
    }

    private MapSqlParameterSource params(Fields f) {
        return new MapSqlParameterSource("dir", f.direction()).addValue("mode", f.mode())
                .addValue("wp", json(f.waypoints())).addValue("path", json(f.path())).addValue("width", f.widthM())
                .addValue("name", f.name()).addValue("other", f.otherGeofenceId())
                .addValue("days", f.weekdays() == null ? null
                        : "{" + String.join(",", f.weekdays().stream().map(String::valueOf).toList()) + "}")
                .addValue("timeFrom", f.timeFrom()).addValue("timeTo", f.timeTo()).addValue("severity", f.severity());
    }

    public UUID insert(UUID orgId, UUID geofenceId, Fields f) {
        return jdbc.queryForObject("""
                INSERT INTO place_routes (org_id, geofence_id, direction, mode, waypoints, path, width_m, name,
                                          other_geofence_id, weekdays, time_from, time_to, severity)
                VALUES (:orgId, :gid, :dir, :mode, CAST(:wp AS jsonb), CAST(:path AS jsonb), :width, :name,
                        :other, CAST(:days AS smallint[]), :timeFrom, :timeTo, :severity)
                RETURNING id
                """, params(f).addValue("orgId", orgId).addValue("gid", geofenceId), UUID.class);
    }

    public int update(UUID geofenceId, UUID routeId, Fields f) {
        return jdbc.update("""
                UPDATE place_routes SET direction = :dir, mode = :mode, waypoints = CAST(:wp AS jsonb),
                       path = CAST(:path AS jsonb), width_m = :width, name = :name, other_geofence_id = :other,
                       weekdays = CAST(:days AS smallint[]), time_from = :timeFrom, time_to = :timeTo,
                       severity = :severity, is_active = true, updated_at = now()
                 WHERE geofence_id = :gid AND id = :id
                """, params(f).addValue("gid", geofenceId).addValue("id", routeId));
    }

    public int delete(UUID geofenceId, UUID routeId) {
        return jdbc.update("DELETE FROM place_routes WHERE geofence_id = :gid AND id = :id",
                new MapSqlParameterSource("gid", geofenceId).addValue("id", routeId));
    }

    public String timezoneOf(UUID orgId) {
        return jdbc.query("SELECT timezone FROM organizations WHERE id = :id", new MapSqlParameterSource("id", orgId),
                (rs, rn) -> rs.getString(1)).stream().findFirst().orElse(null);
    }

    public List<Watchable> listWatchable() {
        // A route with its own days is watched on those; an older one on the days its place has an
        // expected time of the matching kind (the LEFT JOIN is then an inner join in effect).
        return jdbc.query("""
                SELECT r.id, r.direction, r.path::text AS path, r.width_m, r.severity, r.name AS route_name,
                       g.id AS geofence_id, g.org_id, g.name, g.place_type, g.owner_user_id,
                       o.timezone, gd.device_imei,
                       COALESCE(r.weekdays, s.weekdays) AS weekdays, s.local_time, s.grace_minutes,
                       r.time_from, r.time_to,
                       st.is_inside, st.last_change_at,
                       og.name AS other_name, ost.is_inside AS other_inside, ost.last_change_at AS other_change_at
                FROM place_routes r
                JOIN geofences g ON g.id = r.geofence_id AND g.is_active
                JOIN organizations o ON o.id = g.org_id
                JOIN geofence_devices gd ON gd.geofence_id = g.id
                LEFT JOIN place_schedules s ON r.weekdays IS NULL AND s.geofence_id = g.id AND s.is_active
                     AND s.kind = CASE r.direction WHEN 'TO' THEN 'ARRIVE_BY' ELSE 'LEAVE_BY' END
                LEFT JOIN geofence_states st ON st.geofence_id = g.id AND st.device_imei = gd.device_imei
                LEFT JOIN geofences og ON og.id = r.other_geofence_id AND og.is_active
                LEFT JOIN geofence_states ost ON ost.geofence_id = og.id AND ost.device_imei = gd.device_imei
                WHERE r.is_active AND (r.weekdays IS NOT NULL OR s.id IS NOT NULL)
                """, new MapSqlParameterSource(),
                (rs, rn) -> new Watchable(rs.getObject("id", UUID.class), rs.getString("direction"),
                        pts(rs.getString("path")), rs.getInt("width_m"), rs.getString("severity"),
                        rs.getString("route_name"), rs.getObject("geofence_id", UUID.class),
                        rs.getObject("org_id", UUID.class), rs.getString("name"), rs.getString("place_type"),
                        rs.getObject("owner_user_id", UUID.class), rs.getString("timezone"), rs.getString("device_imei"),
                        ints(rs.getArray("weekdays")), rs.getObject("local_time", LocalTime.class),
                        rs.getInt("grace_minutes"), rs.getObject("time_from", LocalTime.class),
                        rs.getObject("time_to", LocalTime.class), (Boolean) rs.getObject("is_inside"),
                        instant(rs, "last_change_at"), rs.getString("other_name"),
                        (Boolean) rs.getObject("other_inside"), instant(rs, "other_change_at")));
    }
}
