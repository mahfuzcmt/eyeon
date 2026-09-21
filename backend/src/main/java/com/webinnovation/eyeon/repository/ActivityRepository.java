package com.webinnovation.eyeon.repository;

import com.webinnovation.eyeon.domain.Activity;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Day activity computed from {@code locations} with window functions. Read-only and off the
 * ingestion path: it runs when someone opens a person's statistics, not per packet.
 *
 * <p>A segment is the step from one valid fix to the next. It counts as <b>moving</b> when the
 * tracker reported at least {@value #MOVING_KMH} km/h (GPS doppler speed is far steadier than
 * position), and is ignored entirely when it is implausible (faster than {@value #MAX_MPS} m/s,
 * i.e. a GPS jump) or spans a reporting gap longer than {@value #MAX_GAP_S} s, where we simply
 * do not know what happened.
 */
@Repository
@RequiredArgsConstructor
public class ActivityRepository {

    static final int MOVING_KMH = 2;
    static final int MAX_MPS = 45;
    static final int MAX_GAP_S = 600;

    private static final String SEGMENTS = """
            WITH pts AS (
                SELECT ts, geom, speed,
                       LAG(ts)   OVER w AS prev_ts,
                       LAG(geom) OVER w AS prev_geom
                  FROM locations
                 WHERE org_id = :orgId AND device_imei = :imei
                   AND ts >= :from AND ts < :to AND valid = true
                WINDOW w AS (ORDER BY ts)
            ), seg AS (
                SELECT ts, speed,
                       EXTRACT(EPOCH FROM (ts - prev_ts)) AS dt,
                       ST_Distance(geom, prev_geom)       AS d
                  FROM pts
            ), ok AS (
                SELECT ts, speed, dt, d,
                       (dt IS NOT NULL AND dt > 0 AND dt <= %d AND d / dt <= %d) AS usable
                  FROM seg
            )
            """.formatted(MAX_GAP_S, MAX_MPS);

    private final NamedParameterJdbcTemplate jdbc;

    public Activity summarize(UUID orgId, String imei, Instant from, Instant to) {
        return jdbc.queryForObject(SEGMENTS + """
                SELECT COALESCE(SUM(d)  FILTER (WHERE usable AND speed >= :movingKmh), 0) AS distance_m,
                       COALESCE(SUM(dt) FILTER (WHERE usable AND speed >= :movingKmh), 0) AS moving_s,
                       COALESCE(SUM(dt) FILTER (WHERE usable AND speed <  :movingKmh), 0) AS still_s,
                       COALESCE(MAX(speed), 0) AS max_speed,
                       COUNT(*)                AS points,
                       MIN(ts) AS first_ts, MAX(ts) AS last_ts
                  FROM ok
                """, params(orgId, imei, from, to), (rs, rn) -> new Activity(
                        Math.round(rs.getDouble("distance_m")),
                        Math.round(rs.getDouble("moving_s")),
                        Math.round(rs.getDouble("still_s")),
                        rs.getInt("max_speed"),
                        rs.getInt("points"),
                        toInstant(rs.getTimestamp("first_ts")),
                        toInstant(rs.getTimestamp("last_ts"))));
    }

    /** One row per Asia/Dhaka calendar day that has data. */
    public List<Activity.Day> daily(UUID orgId, String imei, Instant from, Instant to) {
        return jdbc.query(SEGMENTS + """
                SELECT (ts AT TIME ZONE 'Asia/Dhaka')::date AS day,
                       COALESCE(SUM(d)  FILTER (WHERE usable AND speed >= :movingKmh), 0) AS distance_m,
                       COALESCE(SUM(dt) FILTER (WHERE usable AND speed >= :movingKmh), 0) AS moving_s,
                       COUNT(*) AS points
                  FROM ok
                 GROUP BY 1
                 ORDER BY 1
                """, params(orgId, imei, from, to), (rs, rn) -> new Activity.Day(
                        rs.getDate("day").toLocalDate(),
                        Math.round(rs.getDouble("distance_m")),
                        Math.round(rs.getDouble("moving_s")),
                        rs.getInt("points")));
    }

    private static MapSqlParameterSource params(UUID orgId, String imei, Instant from, Instant to) {
        return new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to))
                .addValue("movingKmh", MOVING_KMH);
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
