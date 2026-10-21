package com.webinnovation.eyeon.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Drawn routes to / from trusted places (V30). */
@Repository
@RequiredArgsConstructor
public class PlaceRouteRepository {

    private static final TypeReference<List<Pt>> PTS = new TypeReference<>() {};

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public record Route(UUID id, UUID geofenceId, String direction, String mode, List<Pt> waypoints, List<Pt> path,
                        int widthM, boolean active, Instant updatedAt) {}

    /**
     * One route x one person assigned to its place x one expected time of the matching kind
     * (ARRIVE_BY for TO, LEAVE_BY for FROM), with what the watch needs to decide.
     */
    public record Watchable(UUID routeId, String direction, List<Pt> path, int widthM,
                            UUID geofenceId, UUID orgId, String placeName, String placeType, UUID ownerUserId,
                            String timezone, String imei, LocalTime localTime, List<Integer> weekdays, int graceMinutes,
                            Boolean inside, Instant changedAt) {}

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
        List<Integer> out = new ArrayList<>();
        if (a == null) return out;
        for (Object o : (Object[]) a.getArray()) out.add(((Number) o).intValue());
        return out;
    }

    public List<Route> listForGeofence(UUID geofenceId) {
        return jdbc.query("""
                SELECT id, geofence_id, direction, mode, waypoints::text AS waypoints, path::text AS path,
                       width_m, is_active, updated_at
                FROM place_routes WHERE geofence_id = :gid ORDER BY direction DESC
                """, new MapSqlParameterSource("gid", geofenceId),
                (rs, rn) -> new Route(rs.getObject("id", UUID.class), rs.getObject("geofence_id", UUID.class),
                        rs.getString("direction"), rs.getString("mode"), pts(rs.getString("waypoints")),
                        pts(rs.getString("path")), rs.getInt("width_m"), rs.getBoolean("is_active"),
                        rs.getObject("updated_at", OffsetDateTime.class).toInstant()));
    }

    /** Insert or replace the route in this direction. */
    public void upsert(UUID orgId, UUID geofenceId, String direction, String mode, List<Pt> waypoints, List<Pt> path,
                       int widthM) {
        jdbc.update("""
                INSERT INTO place_routes (org_id, geofence_id, direction, mode, waypoints, path, width_m)
                VALUES (:orgId, :gid, :dir, :mode, CAST(:wp AS jsonb), CAST(:path AS jsonb), :width)
                ON CONFLICT (geofence_id, direction) DO UPDATE SET
                  mode = EXCLUDED.mode, waypoints = EXCLUDED.waypoints, path = EXCLUDED.path,
                  width_m = EXCLUDED.width_m, is_active = true, updated_at = now()
                """, new MapSqlParameterSource("orgId", orgId).addValue("gid", geofenceId).addValue("dir", direction)
                .addValue("mode", mode).addValue("wp", json(waypoints)).addValue("path", json(path))
                .addValue("width", widthM));
    }

    public int delete(UUID geofenceId, String direction) {
        return jdbc.update("DELETE FROM place_routes WHERE geofence_id = :gid AND direction = :dir",
                new MapSqlParameterSource("gid", geofenceId).addValue("dir", direction));
    }

    public List<Watchable> listWatchable() {
        return jdbc.query("""
                SELECT r.id, r.direction, r.path::text AS path, r.width_m,
                       g.id AS geofence_id, g.org_id, g.name, g.place_type, g.owner_user_id,
                       o.timezone, gd.device_imei, s.local_time, s.weekdays, s.grace_minutes,
                       st.is_inside, st.last_change_at
                FROM place_routes r
                JOIN geofences g ON g.id = r.geofence_id AND g.is_active
                JOIN organizations o ON o.id = g.org_id
                JOIN geofence_devices gd ON gd.geofence_id = g.id
                JOIN place_schedules s ON s.geofence_id = g.id AND s.is_active
                     AND s.kind = CASE r.direction WHEN 'TO' THEN 'ARRIVE_BY' ELSE 'LEAVE_BY' END
                LEFT JOIN geofence_states st ON st.geofence_id = g.id AND st.device_imei = gd.device_imei
                WHERE r.is_active
                """, new MapSqlParameterSource(),
                (rs, rn) -> new Watchable(rs.getObject("id", UUID.class), rs.getString("direction"),
                        pts(rs.getString("path")), rs.getInt("width_m"), rs.getObject("geofence_id", UUID.class),
                        rs.getObject("org_id", UUID.class), rs.getString("name"), rs.getString("place_type"),
                        rs.getObject("owner_user_id", UUID.class), rs.getString("timezone"), rs.getString("device_imei"),
                        rs.getObject("local_time", LocalTime.class), ints(rs.getArray("weekdays")),
                        rs.getInt("grace_minutes"), (Boolean) rs.getObject("is_inside"),
                        rs.getObject("last_change_at", OffsetDateTime.class) == null ? null
                                : rs.getObject("last_change_at", OffsetDateTime.class).toInstant()));
    }
}
