package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.Geofence;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Geofence persistence backed by PostGIS GEOGRAPHY.
 *
 * <p>Storage convention:
 * <ul>
 *   <li>CIRCLE  — {@code geom} is the buffered polygon ({@code ST_Buffer}); {@code center}
 *                 and {@code radius_m} are persisted separately so reads can render the
 *                 exact circle without going through the polygon approximation.</li>
 *   <li>POLYGON — {@code geom} is the polygon directly; {@code center} and {@code radius_m}
 *                 are NULL.</li>
 * </ul>
 *
 * <p>The hot-path evaluator uses {@code ST_Covers(geom, point)} which works uniformly for
 * both shapes — see {@link #findActiveForDeviceWithState}.
 */
@Repository
@RequiredArgsConstructor
public class GeofenceRepository {

    /** Matches a `lng lat` coordinate pair from WKT, possibly with negative sign. */
    private static final Pattern WKT_COORD =
            Pattern.compile("(-?\\d+(?:\\.\\d+)?)\\s+(-?\\d+(?:\\.\\d+)?)");

    private final NamedParameterJdbcTemplate jdbc;

    private static final RowMapper<Geofence> ROW_MAPPER = (rs, rn) -> {
        UUID id = rs.getObject("id", UUID.class);
        UUID orgId = rs.getObject("org_id", UUID.class);
        String name = rs.getString("name");
        String type = rs.getString("type");
        String notifyOn = rs.getString("notify_on");
        String color = rs.getString("color");
        boolean active = rs.getBoolean("is_active");
        Object centerLatObj = rs.getObject("center_lat");
        Object centerLngObj = rs.getObject("center_lng");
        Object radiusObj = rs.getObject("radius_m");
        Geofence.LatLng center = (centerLatObj == null || centerLngObj == null)
                ? null
                : new Geofence.LatLng(rs.getDouble("center_lat"), rs.getDouble("center_lng"));
        Integer radius = radiusObj == null ? null : rs.getInt("radius_m");

        List<Geofence.LatLng> polygon = Collections.emptyList();
        if ("POLYGON".equalsIgnoreCase(type)) {
            polygon = parsePolygonWkt(rs.getString("geom_wkt"));
        }

        return new Geofence(
                id, orgId, name, type, notifyOn, color, active,
                center, radius, polygon,
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant()
        );
    };

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, name, type, notify_on, color, is_active,
                   ST_Y(center::geometry) AS center_lat,
                   ST_X(center::geometry) AS center_lng,
                   radius_m,
                   ST_AsText(geom::geometry) AS geom_wkt,
                   created_at, updated_at
            FROM geofences
            """;

    public List<Geofence> listForOrg(UUID orgId) {
        return jdbc.query(
                SELECT_FIELDS + " WHERE org_id = :orgId AND is_active = true ORDER BY created_at DESC",
                new MapSqlParameterSource("orgId", orgId),
                ROW_MAPPER);
    }

    public Optional<Geofence> findByOrgAndId(UUID orgId, UUID id) {
        try {
            Geofence g = jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE org_id = :orgId AND id = :id",
                    new MapSqlParameterSource("orgId", orgId).addValue("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(g);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public UUID insertCircle(UUID orgId, String name, String notifyOn, String color,
                             double centerLat, double centerLng, int radiusM) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("name", name)
                .addValue("notifyOn", notifyOn)
                .addValue("color", color)
                .addValue("lat", centerLat)
                .addValue("lng", centerLng)
                .addValue("radius", radiusM);
        jdbc.update("""
                INSERT INTO geofences
                  (id, org_id, name, type, geom, radius_m, center, color, notify_on, is_active)
                VALUES
                  (:id, :orgId, :name, 'CIRCLE',
                   ST_Buffer(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius),
                   :radius,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                   COALESCE(:color, '#0F2742'),
                   :notifyOn,
                   true)
                """, params);
        return id;
    }

    public UUID insertPolygon(UUID orgId, String name, String notifyOn, String color,
                              List<Geofence.LatLng> vertices) {
        if (vertices == null || vertices.size() < 3) {
            throw new IllegalArgumentException("Polygon needs at least 3 vertices");
        }
        UUID id = UUID.randomUUID();
        String wkt = toClosedRingWkt(vertices);
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("name", name)
                .addValue("notifyOn", notifyOn)
                .addValue("color", color)
                .addValue("wkt", wkt);
        jdbc.update("""
                INSERT INTO geofences
                  (id, org_id, name, type, geom, color, notify_on, is_active)
                VALUES
                  (:id, :orgId, :name, 'POLYGON',
                   ST_SetSRID(ST_GeomFromText(:wkt), 4326)::geography,
                   COALESCE(:color, '#0F2742'),
                   :notifyOn,
                   true)
                """, params);
        return id;
    }

    public boolean softDelete(UUID orgId, UUID id) {
        int n = jdbc.update("""
                UPDATE geofences SET is_active = false, updated_at = now()
                WHERE org_id = :orgId AND id = :id
                """, new MapSqlParameterSource("orgId", orgId).addValue("id", id));
        return n > 0;
    }

    public void assignDevice(UUID geofenceId, String imei) {
        jdbc.update("""
                INSERT INTO geofence_devices (geofence_id, device_imei)
                VALUES (:gid, :imei)
                ON CONFLICT (geofence_id, device_imei) DO NOTHING
                """, new MapSqlParameterSource("gid", geofenceId).addValue("imei", imei));
    }

    public void unassignDevice(UUID geofenceId, String imei) {
        jdbc.update("""
                DELETE FROM geofence_devices
                WHERE geofence_id = :gid AND device_imei = :imei
                """, new MapSqlParameterSource("gid", geofenceId).addValue("imei", imei));
    }

    public List<String> listAssignedImeis(UUID geofenceId) {
        return jdbc.queryForList("""
                SELECT device_imei FROM geofence_devices WHERE geofence_id = :gid
                """, new MapSqlParameterSource("gid", geofenceId), String.class);
    }

    /**
     * Hot-path evaluation query. Returns one row per geofence assigned to the device,
     * each carrying the freshly computed inside flag and the previous inside flag from
     * {@code geofence_states}. Empty list means no geofences assigned — no work to do.
     */
    public List<EvaluationRow> findActiveForDeviceWithState(UUID orgId, String imei,
                                                            double lat, double lng) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("lat", lat)
                .addValue("lng", lng);
        return jdbc.query("""
                SELECT g.id, g.name, g.notify_on,
                       ST_Covers(g.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS inside,
                       gs.is_inside AS prev_inside
                FROM geofences g
                JOIN geofence_devices gd
                  ON gd.geofence_id = g.id AND gd.device_imei = :imei
                LEFT JOIN geofence_states gs
                  ON gs.geofence_id = g.id AND gs.device_imei = :imei
                WHERE g.org_id = :orgId AND g.is_active = true
                """, params, (rs, rn) -> new EvaluationRow(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getString("notify_on"),
                        rs.getBoolean("inside"),
                        (Boolean) rs.getObject("prev_inside")
                ));
    }

    public void upsertState(UUID geofenceId, String imei, boolean inside) {
        jdbc.update("""
                INSERT INTO geofence_states (geofence_id, device_imei, is_inside, last_change_at)
                VALUES (:gid, :imei, :inside, now())
                ON CONFLICT (geofence_id, device_imei) DO UPDATE
                SET is_inside = EXCLUDED.is_inside,
                    last_change_at = EXCLUDED.last_change_at
                """, new MapSqlParameterSource("gid", geofenceId)
                        .addValue("imei", imei)
                        .addValue("inside", inside));
    }

    /** Per-fence inside/prev-inside snapshot used by {@link com.webinnovation.motolink.service.GeofenceService}. */
    public record EvaluationRow(UUID geofenceId, String name, String notifyOn,
                                boolean inside, Boolean previousInside) {}

    private static String toClosedRingWkt(List<Geofence.LatLng> vertices) {
        StringBuilder sb = new StringBuilder("POLYGON((");
        for (int i = 0; i < vertices.size(); i++) {
            Geofence.LatLng v = vertices.get(i);
            if (i > 0) sb.append(", ");
            sb.append(v.lng()).append(' ').append(v.lat());
        }
        Geofence.LatLng first = vertices.get(0);
        Geofence.LatLng last = vertices.get(vertices.size() - 1);
        if (first.lat() != last.lat() || first.lng() != last.lng()) {
            sb.append(", ").append(first.lng()).append(' ').append(first.lat());
        }
        sb.append("))");
        return sb.toString();
    }

    private static List<Geofence.LatLng> parsePolygonWkt(String wkt) {
        if (wkt == null) return List.of();
        Matcher m = WKT_COORD.matcher(wkt);
        List<Geofence.LatLng> out = new ArrayList<>();
        while (m.find()) {
            double lng = Double.parseDouble(m.group(1));
            double lat = Double.parseDouble(m.group(2));
            out.add(new Geofence.LatLng(lat, lng));
        }
        return out;
    }
}
