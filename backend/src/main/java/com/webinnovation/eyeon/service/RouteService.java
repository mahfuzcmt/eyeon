package com.webinnovation.eyeon.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.eyeon.domain.Location;
import com.webinnovation.eyeon.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A person's route for the map: {@link RoutePlanner} pieces, the moving GPS pieces snapped to the
 * road ({@link RoadMatcher}, cached in {@code route_matches}). At most {@link #MATCH_BUDGET}
 * matching calls per request; pieces not yet matched are returned raw with
 * {@code snapPending = true}, and the next refresh picks them up.
 */
@Service
@RequiredArgsConstructor
public class RouteService {

    static final int MATCH_BUDGET = 4;
    /** Pieces slower than this are a person standing or wandering indoors: drawn raw, never snapped. */
    static final int SNAP_MIN_KMH = 4;
    /** A piece still growing is re-matched at most this often. */
    static final Duration REMATCH_AFTER = Duration.ofSeconds(60);

    private final LocationRepository locations;
    private final RoadMatcher matcher;
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    /**
     * @param coords [lat, lng] pairs to draw
     * @param kind   TRACK (solid) or ESTIMATE (dashed: Wi-Fi estimate or a silence)
     * @param snapped the coordinates follow the road
     */
    public record PieceView(String kind, Instant from, Instant to, int speedKmh, boolean snapped, List<double[]> coords) {}

    public record RouteView(List<PieceView> pieces, boolean snapPending) {}

    private record Cached(Instant endTs, int points, List<double[]> geometry, Instant createdAt) {}

    public RouteView route(UUID orgId, String imei, Instant from, Instant to) {
        List<RoutePlanner.Pt> pts = new ArrayList<>();
        for (Location l : locations.findHistory(orgId, imei, from, to, 20_000)) {
            if (!l.valid() || (l.latitude() == 0 && l.longitude() == 0)) continue;
            pts.add(new RoutePlanner.Pt(l.ts(), l.latitude(), l.longitude(), l.speed(), l.source() == null));
        }
        int budget = MATCH_BUDGET;
        boolean pending = false;
        List<PieceView> out = new ArrayList<>();
        for (RoutePlanner.Piece p : RoutePlanner.plan(pts)) {
            List<double[]> raw = p.points().stream().map(x -> new double[] {x.lat(), x.lng()}).toList();
            int speed = p.medianSpeedKmh();
            if (p.kind() != RoutePlanner.Kind.TRACK || speed < SNAP_MIN_KMH || p.points().size() < 3 || !matcher.enabled()) {
                out.add(new PieceView(p.kind().name(), p.from(), p.to(), speed, false, raw));
                continue;
            }
            Cached c = cached(imei, p.from());
            boolean fresh = c != null && (c.points() == p.points().size()
                    || c.createdAt().isAfter(Instant.now().minus(REMATCH_AFTER)));
            if (!fresh) {
                if (budget > 0) {
                    budget--;
                    String profile = RoadMatcher.profileFor(speed);
                    var m = matcher.match(p.points(), profile);
                    store(imei, p, profile, m.map(RoadMatcher.Match::coords).orElse(null), m.map(RoadMatcher.Match::confidence).orElse(null));
                    c = new Cached(p.to(), p.points().size(), m.map(RoadMatcher.Match::coords).orElse(null), Instant.now());
                } else {
                    pending = true;
                }
            }
            boolean snapped = c != null && c.geometry() != null;
            out.add(new PieceView(p.kind().name(), p.from(), p.to(), speed, snapped, snapped ? c.geometry() : raw));
        }
        return new RouteView(out, pending);
    }

    private Cached cached(String imei, Instant start) {
        return jdbc.query("""
                SELECT end_ts, points, geometry::text AS geometry, created_at FROM route_matches
                 WHERE device_imei = :imei AND start_ts = :start
                """, new MapSqlParameterSource("imei", imei).addValue("start", Timestamp.from(start)),
                (rs, rn) -> new Cached(rs.getTimestamp("end_ts").toInstant(), rs.getInt("points"),
                        parse(rs.getString("geometry")), rs.getTimestamp("created_at").toInstant()))
                .stream().findFirst().orElse(null);
    }

    private void store(String imei, RoutePlanner.Piece p, String profile, List<double[]> geometry, Double confidence) {
        String json;
        try {
            json = geometry == null ? null : objectMapper.writeValueAsString(geometry);
        } catch (Exception e) {
            json = null;
        }
        jdbc.update("""
                INSERT INTO route_matches (device_imei, start_ts, end_ts, points, profile, geometry, confidence)
                VALUES (:imei, :start, :end, :points, :profile, CAST(:geometry AS jsonb), :confidence)
                ON CONFLICT (device_imei, start_ts) DO UPDATE
                   SET end_ts = EXCLUDED.end_ts, points = EXCLUDED.points, profile = EXCLUDED.profile,
                       geometry = EXCLUDED.geometry, confidence = EXCLUDED.confidence, created_at = now()
                """, new MapSqlParameterSource("imei", imei).addValue("start", Timestamp.from(p.from()))
                .addValue("end", Timestamp.from(p.to())).addValue("points", p.points().size())
                .addValue("profile", profile).addValue("geometry", json).addValue("confidence", confidence));
    }

    private List<double[]> parse(String json) {
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<double[]>>() {});
        } catch (Exception e) {
            return null;
        }
    }
}
