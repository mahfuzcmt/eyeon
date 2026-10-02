package com.webinnovation.eyeon.repository;

import com.webinnovation.eyeon.service.StayDetector.Point;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads for the stay report: a person's valid positions in a period, the positions just outside
 * it, and the shared cache of area names (V26). Off the ingestion path.
 */
@Repository
@RequiredArgsConstructor
public class StayRepository {

    /** A month of a tracker reporting every 10 s for several hours a day stays well below this. */
    public static final int MAX_POINTS = 150_000;

    private final NamedParameterJdbcTemplate jdbc;

    /** Valid positions (GPS and good Wi-Fi estimates) in [from, to), oldest first. */
    public List<Point> points(UUID orgId, String imei, Instant from, Instant to) {
        return jdbc.query("""
                SELECT ts, latitude, longitude
                  FROM locations
                 WHERE org_id = :orgId AND device_imei = :imei
                   AND ts >= :from AND ts < :to AND valid = true
                 ORDER BY ts
                 LIMIT :limit
                """, range(orgId, imei, from, to).addValue("limit", MAX_POINTS),
                (rs, rn) -> new Point(rs.getTimestamp("ts").toInstant(),
                        rs.getDouble("latitude"), rs.getDouble("longitude")));
    }

    /** The last valid position before {@code ts}: where the person already was when the period began. */
    public Optional<Point> lastBefore(UUID orgId, String imei, Instant ts) {
        return neighbour(orgId, imei, ts, "ts < :ts ORDER BY ts DESC");
    }

    /** The first valid position at or after {@code ts}: where the person still was when the period ended. */
    public Optional<Point> firstFrom(UUID orgId, String imei, Instant ts) {
        return neighbour(orgId, imei, ts, "ts >= :ts ORDER BY ts");
    }

    private Optional<Point> neighbour(UUID orgId, String imei, Instant ts, String tail) {
        return jdbc.query("""
                SELECT ts, latitude, longitude
                  FROM locations
                 WHERE org_id = :orgId AND device_imei = :imei AND valid = true AND
                """ + " " + tail + " LIMIT 1",
                new MapSqlParameterSource("orgId", orgId).addValue("imei", imei).addValue("ts", Timestamp.from(ts)),
                (rs, rn) -> new Point(rs.getTimestamp("ts").toInstant(),
                        rs.getDouble("latitude"), rs.getDouble("longitude")))
                .stream().findFirst();
    }

    /** cell -> name for the cells already looked up; an empty name means the map has nothing there. */
    public Map<String, String> cachedNames(Collection<String> cells, String lang) {
        Map<String, String> out = new HashMap<>();
        if (cells.isEmpty()) return out;
        jdbc.query("SELECT cell, name FROM place_names WHERE lang = :lang AND cell IN (:cells)",
                new MapSqlParameterSource("lang", lang).addValue("cells", cells),
                rs -> { out.put(rs.getString("cell"), rs.getString("name")); });
        return out;
    }

    public void saveName(String cell, String lang, String name) {
        jdbc.update("""
                INSERT INTO place_names (cell, lang, name) VALUES (:cell, :lang, :name)
                ON CONFLICT (cell, lang) DO UPDATE SET name = EXCLUDED.name, created_at = now()
                """, new MapSqlParameterSource("cell", cell).addValue("lang", lang).addValue("name", name));
    }

    private static MapSqlParameterSource range(UUID orgId, String imei, Instant from, Instant to) {
        return new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to));
    }
}
