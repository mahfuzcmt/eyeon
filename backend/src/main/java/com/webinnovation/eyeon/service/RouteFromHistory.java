package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.RouteWatch.Direction;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import com.webinnovation.eyeon.service.StayDetector.Point;
import com.webinnovation.eyeon.service.StayDetector.Stay;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * "Use a past trip as the route": finds, in one day's positions, the trips that ended at a place
 * (TO) or began there (FROM). Pure: no I/O, unit-tested.
 *
 * <p>A trip is what lies between two stays ({@link StayDetector}). It is offered when the stay at
 * the place's end of it is at the place, when it is long enough to be a way somewhere, and with
 * the wobble taken out of its line.
 */
public final class RouteFromHistory {

    private RouteFromHistory() {}

    /** A stay this far outside the place's edge still counts as being at the place. */
    static final double PLACE_SLACK_M = 150;
    static final double MIN_LENGTH_M = 200;
    /** Points nearer than this to the simplified line are dropped from it. */
    static final double SIMPLIFY_M = 12;
    static final int MAX_WAYPOINTS = 25;

    /**
     * @param waypoints up to 25 points along the line, so the route can be edited like a drawn one
     * @param path      the line the person travelled
     */
    public record Candidate(Instant from, Instant to, double lengthM, List<Pt> waypoints, List<Pt> path) {}

    /**
     * @param points the day's positions, oldest first
     * @param radiusM the place's radius
     */
    public static List<Candidate> candidates(List<Point> points, Direction dir, double placeLat, double placeLng,
                                             double radiusM) {
        List<Stay> stays = new ArrayList<>(StayDetector.detect(points));
        // Positions that begin on the move (a tracker switched on at the door): where they begin
        // is where that first trip set off from.
        if (!points.isEmpty() && (stays.isEmpty() || stays.get(0).from().isAfter(points.get(0).ts().plusSeconds(60)))) {
            Point first = points.get(0);
            stays.add(0, new Stay(first.ts(), first.ts(), first.lat(), first.lng(), 1));
        }
        List<Candidate> out = new ArrayList<>();
        for (int i = 1; i < stays.size(); i++) {
            Stay a = stays.get(i - 1), b = stays.get(i);
            Stay atPlace = dir == Direction.TO ? b : a;
            if (StayDetector.meters(atPlace.lat(), atPlace.lng(), placeLat, placeLng) > radiusM + PLACE_SLACK_M) continue;
            List<Pt> line = new ArrayList<>();
            line.add(dir == Direction.FROM ? new Pt(placeLat, placeLng) : new Pt(a.lat(), a.lng()));
            for (Point p : points) {
                if (p.ts().isAfter(a.to()) && p.ts().isBefore(b.from())) line.add(new Pt(p.lat(), p.lng()));
            }
            line.add(dir == Direction.TO ? new Pt(placeLat, placeLng) : new Pt(b.lat(), b.lng()));
            if (line.size() < 3) continue;   // nothing recorded on the way
            List<Pt> path = simplify(line, SIMPLIFY_M);
            double length = RouteWatch.length(path);
            if (length < MIN_LENGTH_M) continue;
            out.add(new Candidate(a.to(), b.from(), length, sample(path, MAX_WAYPOINTS), path));
        }
        return out;
    }

    /** Douglas-Peucker: keeps the points that shape the line. */
    static List<Pt> simplify(List<Pt> line, double toleranceM) {
        if (line.size() < 3) return List.copyOf(line);
        boolean[] keep = new boolean[line.size()];
        keep[0] = true;
        keep[line.size() - 1] = true;
        java.util.ArrayDeque<int[]> todo = new java.util.ArrayDeque<>();
        todo.push(new int[] {0, line.size() - 1});
        while (!todo.isEmpty()) {
            int[] seg = todo.pop();
            double worst = 0;
            int at = -1;
            List<Pt> chord = List.of(line.get(seg[0]), line.get(seg[1]));
            for (int i = seg[0] + 1; i < seg[1]; i++) {
                double d = RouteWatch.distanceToPath(line.get(i).lat(), line.get(i).lng(), chord);
                if (d > worst) {
                    worst = d;
                    at = i;
                }
            }
            if (at >= 0 && worst > toleranceM) {
                keep[at] = true;
                todo.push(new int[] {seg[0], at});
                todo.push(new int[] {at, seg[1]});
            }
        }
        List<Pt> out = new ArrayList<>();
        for (int i = 0; i < line.size(); i++) if (keep[i]) out.add(line.get(i));
        return out;
    }

    /** At most {@code max} points spread evenly along the list, always with both ends. */
    static List<Pt> sample(List<Pt> path, int max) {
        if (path.size() <= max) return List.copyOf(path);
        List<Pt> out = new ArrayList<>();
        for (int i = 0; i < max; i++) out.add(path.get((int) Math.round(i * (path.size() - 1) / (double) (max - 1))));
        return out;
    }
}
