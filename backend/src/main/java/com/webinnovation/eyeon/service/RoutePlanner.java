package com.webinnovation.eyeon.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Splits a day's positions into the pieces the map draws (pure, unit-tested):
 * <ul>
 *   <li>{@code TRACK} - consecutive GPS fixes at most {@link #MAX_TRACK_GAP} apart: drawn solid,
 *       and snapped to the road when the person was moving;</li>
 *   <li>{@code ESTIMATE} - a step to or from a Wi-Fi estimate, or across a silence longer than
 *       {@link #MAX_TRACK_GAP}: drawn dashed, because nobody knows the exact path there.</li>
 * </ul>
 * Points within {@link #MIN_STEP_M} of the previous one are dropped (indoor jitter), and a
 * TRACK piece longer than {@link #CHUNK} points is cut so each piece fits one map-matching call.
 */
public final class RoutePlanner {

    public static final double MIN_STEP_M = 15;
    public static final Duration MAX_TRACK_GAP = Duration.ofSeconds(120);
    public static final int CHUNK = 80;

    private RoutePlanner() {}

    /** @param gps true for a satellite fix, false for a Wi-Fi / cell estimate */
    public record Pt(Instant ts, double lat, double lng, int speedKmh, boolean gps) {}

    public enum Kind { TRACK, ESTIMATE }

    public record Piece(Kind kind, List<Pt> points) {
        public Instant from() { return points.get(0).ts(); }
        public Instant to() { return points.get(points.size() - 1).ts(); }

        /** Median reported speed, which decides whether and how the piece is snapped. */
        public int medianSpeedKmh() {
            int[] s = points.stream().mapToInt(Pt::speedKmh).sorted().toArray();
            return s.length == 0 ? 0 : s[s.length / 2];
        }
    }

    public static List<Piece> plan(List<Pt> raw) {
        List<Pt> pts = new ArrayList<>();
        for (Pt p : raw) {
            Pt prev = pts.isEmpty() ? null : pts.get(pts.size() - 1);
            if (prev == null || StayDetector.meters(prev.lat(), prev.lng(), p.lat(), p.lng()) >= MIN_STEP_M) pts.add(p);
        }
        List<Piece> out = new ArrayList<>();
        if (pts.size() < 2) return out;
        Kind kind = null;
        List<Pt> cur = new ArrayList<>();
        for (int i = 1; i < pts.size(); i++) {
            Pt a = pts.get(i - 1), b = pts.get(i);
            Kind k = a.gps() && b.gps() && Duration.between(a.ts(), b.ts()).compareTo(MAX_TRACK_GAP) <= 0
                    ? Kind.TRACK : Kind.ESTIMATE;
            if (k != kind || (k == Kind.TRACK && cur.size() >= CHUNK)) {
                if (kind != null) out.add(new Piece(kind, cur));
                cur = new ArrayList<>();
                cur.add(a);
                kind = k;
            }
            cur.add(b);
        }
        out.add(new Piece(kind, cur));
        return out;
    }
}
