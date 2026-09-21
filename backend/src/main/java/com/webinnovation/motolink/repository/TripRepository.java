package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.Trip;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class TripRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, device_imei, started_at, ended_at,
                   ST_Y(start_geom::geometry) AS start_lat,
                   ST_X(start_geom::geometry) AS start_lng,
                   ST_Y(end_geom::geometry)   AS end_lat,
                   ST_X(end_geom::geometry)   AS end_lng,
                   distance_m, duration_s, max_speed, avg_speed, idle_time_s,
                   status, created_at
            FROM trips
            """;

    private static final RowMapper<Trip> ROW_MAPPER = (rs, rn) -> {
        OffsetDateTime endedAt = rs.getObject("ended_at", OffsetDateTime.class);
        Object startLat = rs.getObject("start_lat");
        Object startLng = rs.getObject("start_lng");
        Object endLat = rs.getObject("end_lat");
        Object endLng = rs.getObject("end_lng");
        Object durationS = rs.getObject("duration_s");
        return new Trip(
                rs.getObject("id", UUID.class),
                rs.getObject("org_id", UUID.class),
                rs.getString("device_imei"),
                rs.getObject("started_at", OffsetDateTime.class).toInstant(),
                endedAt == null ? null : endedAt.toInstant(),
                startLat == null ? null : rs.getDouble("start_lat"),
                startLng == null ? null : rs.getDouble("start_lng"),
                endLat == null ? null : rs.getDouble("end_lat"),
                endLng == null ? null : rs.getDouble("end_lng"),
                rs.getInt("distance_m"),
                durationS == null ? null : rs.getInt("duration_s"),
                rs.getInt("max_speed"),
                rs.getInt("avg_speed"),
                rs.getInt("idle_time_s"),
                rs.getString("status"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant()
        );
    };

    public Optional<Trip> findOpenForDevice(String imei) {
        try {
            Trip t = jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE device_imei = :imei AND status = 'IN_PROGRESS' LIMIT 1",
                    new MapSqlParameterSource("imei", imei),
                    ROW_MAPPER);
            return Optional.ofNullable(t);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public UUID insertOpen(UUID orgId, String imei, Instant startedAt, double lat, double lng) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("startedAt", Timestamp.from(startedAt))
                .addValue("lat", lat)
                .addValue("lng", lng);
        jdbc.update("""
                INSERT INTO trips
                  (id, org_id, device_imei, started_at, start_geom, end_geom,
                   distance_m, max_speed, avg_speed, idle_time_s, status)
                VALUES
                  (:id, :orgId, :imei, :startedAt,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                   0, 0, 0, 0, 'IN_PROGRESS')
                """, params);
        return id;
    }

    public void appendPoint(UUID tripId, int deltaMeters, int speed, double lat, double lng) {
        var params = new MapSqlParameterSource()
                .addValue("id", tripId)
                .addValue("delta", Math.max(0, deltaMeters))
                .addValue("speed", speed)
                .addValue("lat", lat)
                .addValue("lng", lng);
        jdbc.update("""
                UPDATE trips SET
                  distance_m = distance_m + :delta,
                  max_speed = GREATEST(max_speed, :speed),
                  end_geom = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                WHERE id = :id AND status = 'IN_PROGRESS'
                """, params);
    }

    public void closeTrip(UUID tripId, Instant endedAt, double lat, double lng) {
        var params = new MapSqlParameterSource()
                .addValue("id", tripId)
                .addValue("endedAt", Timestamp.from(endedAt))
                .addValue("lat", lat)
                .addValue("lng", lng);
        jdbc.update("""
                UPDATE trips SET
                  status = 'COMPLETED',
                  ended_at = :endedAt,
                  end_geom = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  duration_s = GREATEST(1, EXTRACT(EPOCH FROM (:endedAt - started_at))::int),
                  avg_speed = CASE WHEN EXTRACT(EPOCH FROM (:endedAt - started_at)) > 0
                                   THEN (distance_m * 36)::int / NULLIF(EXTRACT(EPOCH FROM (:endedAt - started_at))::int, 0) / 10
                                   ELSE 0 END
                WHERE id = :id AND status = 'IN_PROGRESS'
                """, params);
    }

    /**
     * Close a trip without overwriting {@code end_geom}. Used by the sweeper, which has no fresh
     * point — the last appended {@code end_geom} from {@link #appendPoint} is the correct one.
     */
    public void closeTripKeepEndGeom(UUID tripId, Instant endedAt) {
        var params = new MapSqlParameterSource()
                .addValue("id", tripId)
                .addValue("endedAt", Timestamp.from(endedAt));
        jdbc.update("""
                UPDATE trips SET
                  status = 'COMPLETED',
                  ended_at = :endedAt,
                  duration_s = GREATEST(1, EXTRACT(EPOCH FROM (:endedAt - started_at))::int),
                  avg_speed = CASE WHEN EXTRACT(EPOCH FROM (:endedAt - started_at)) > 0
                                   THEN (distance_m * 36)::int / NULLIF(EXTRACT(EPOCH FROM (:endedAt - started_at))::int, 0) / 10
                                   ELSE 0 END
                WHERE id = :id AND status = 'IN_PROGRESS'
                """, params);
    }

    /** Used by the periodic sweeper to close trips that haven't received a location for too long. */
    public List<UUID> findStaleOpenTripIds(int idleSeconds) {
        return jdbc.queryForList("""
                SELECT t.id
                FROM trips t
                LEFT JOIN locations l
                  ON l.device_imei = t.device_imei
                 AND l.ts = (SELECT MAX(ts) FROM locations WHERE device_imei = t.device_imei)
                WHERE t.status = 'IN_PROGRESS'
                  AND (l.ts IS NULL OR l.ts < now() - (:secs || ' seconds')::interval)
                """, new MapSqlParameterSource("secs", idleSeconds), UUID.class);
    }

    public Optional<Trip> findByOrgAndId(UUID orgId, UUID id) {
        try {
            Trip t = jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE org_id = :orgId AND id = :id",
                    new MapSqlParameterSource("orgId", orgId).addValue("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(t);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Trip> listForOrg(UUID orgId, Instant from, Instant to, int limit, int offset) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to))
                .addValue("limit", limit)
                .addValue("offset", offset);
        return jdbc.query(SELECT_FIELDS + """
                 WHERE org_id = :orgId
                   AND started_at >= :from AND started_at < :to
                 ORDER BY started_at DESC
                 LIMIT :limit OFFSET :offset
                """, params, ROW_MAPPER);
    }

    /** Number of in-progress trips for the org. */
    public int countActive(UUID orgId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM trips WHERE org_id = :orgId AND status = 'IN_PROGRESS'",
                new MapSqlParameterSource("orgId", orgId),
                Integer.class);
        return n == null ? 0 : n;
    }

    /** Trips completed in the org since {@code since}. */
    public int countCompletedSince(UUID orgId, Instant since) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM trips WHERE org_id = :orgId AND status = 'COMPLETED' AND ended_at >= :since",
                new MapSqlParameterSource("orgId", orgId).addValue("since", Timestamp.from(since)),
                Integer.class);
        return n == null ? 0 : n;
    }

    /** Sum of completed trip distance (meters) since {@code since}. */
    public long sumDistanceSince(UUID orgId, Instant since) {
        Long n = jdbc.queryForObject(
                "SELECT COALESCE(SUM(distance_m), 0)::bigint FROM trips" +
                        " WHERE org_id = :orgId AND status = 'COMPLETED' AND ended_at >= :since",
                new MapSqlParameterSource("orgId", orgId).addValue("since", Timestamp.from(since)),
                Long.class);
        return n == null ? 0 : n;
    }

    /**
     * Parking state per device: imei → end time of its latest trip. A device whose
     * latest trip is still IN_PROGRESS is absent from the map (it is driving), as is
     * a device with no trips at all (parking time unknown).
     */
    public Map<String, Instant> parkedSinceByImei(UUID orgId) {
        Map<String, Instant> out = new HashMap<>();
        jdbc.query("""
                SELECT DISTINCT ON (device_imei) device_imei, status, ended_at
                FROM trips
                WHERE org_id = :orgId
                ORDER BY device_imei, started_at DESC
                """, new MapSqlParameterSource("orgId", orgId), rs -> {
            if ("COMPLETED".equals(rs.getString("status"))) {
                OffsetDateTime endedAt = rs.getObject("ended_at", OffsetDateTime.class);
                if (endedAt != null) out.put(rs.getString("device_imei"), endedAt.toInstant());
            }
        });
        return out;
    }

    /** Single-device variant of {@link #parkedSinceByImei}. */
    public Optional<Instant> parkedSinceForImei(UUID orgId, String imei) {
        List<Instant> rows = jdbc.query("""
                SELECT status, ended_at
                FROM trips
                WHERE org_id = :orgId AND device_imei = :imei
                ORDER BY started_at DESC
                LIMIT 1
                """,
                new MapSqlParameterSource("orgId", orgId).addValue("imei", imei),
                (rs, rn) -> {
                    if (!"COMPLETED".equals(rs.getString("status"))) return null;
                    OffsetDateTime endedAt = rs.getObject("ended_at", OffsetDateTime.class);
                    return endedAt == null ? null : endedAt.toInstant();
                });
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.get(0));
    }

    /** One aggregate row per Dhaka-local day that had completed trips. */
    public record DailyAgg(LocalDate day, int trips, long distanceM, long durationS, long idleS, int maxSpeed) {}

    public List<DailyAgg> dailyAggregates(UUID orgId, String imei, Instant from, Instant to, String zoneId) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to))
                .addValue("tz", zoneId);
        return jdbc.query("""
                SELECT (started_at AT TIME ZONE :tz)::date AS day,
                       COUNT(*)::int                        AS trips,
                       COALESCE(SUM(distance_m), 0)::bigint AS dist,
                       COALESCE(SUM(COALESCE(duration_s, 0)), 0)::bigint AS dur,
                       COALESCE(SUM(idle_time_s), 0)::bigint AS idle,
                       COALESCE(MAX(max_speed), 0)::int      AS maxspd
                FROM trips
                WHERE org_id = :orgId AND device_imei = :imei AND status = 'COMPLETED'
                  AND started_at >= :from AND started_at < :to
                GROUP BY 1
                ORDER BY 1
                """, params, (rs, rn) -> new DailyAgg(
                rs.getObject("day", LocalDate.class),
                rs.getInt("trips"),
                rs.getLong("dist"),
                rs.getLong("dur"),
                rs.getLong("idle"),
                rs.getInt("maxspd")));
    }

    public List<Trip> listForDevice(UUID orgId, String imei, Instant from, Instant to) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to));
        return jdbc.query(SELECT_FIELDS + """
                 WHERE org_id = :orgId AND device_imei = :imei
                   AND started_at >= :from AND started_at < :to
                 ORDER BY started_at DESC
                """, params, ROW_MAPPER);
    }
}
