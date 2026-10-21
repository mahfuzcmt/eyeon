package com.webinnovation.eyeon.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * The rules for watching a drawn route to or from a trusted place. Pure: no I/O, unit-tested.
 *
 * <p><b>When.</b> "To School" is watched from an hour before the place's arrival time until an
 * hour after the time plus grace, and only while the person is not yet there. "From School" is
 * watched for 90 minutes after they left the place, when they left around its leaving time.
 *
 * <p><b>What.</b> A watch only starts judging once the person has been on the line (they set off
 * from where it starts); someone who is somewhere else at that hour is not "off route". After that,
 * more than the route's width away for {@link #OFF_FOR} raises one alert; coming back within the
 * width says so; reaching the far end finishes the watch.
 */
public final class RouteWatch {

    private RouteWatch() {}

    public enum Direction { TO, FROM }

    public enum Event { NONE, OFF_ROUTE, BACK_ON_ROUTE }

    /** Off the line this long before an alert: a short detour or a GPS jump is not a different route. */
    static final Duration OFF_FOR = Duration.ofMinutes(2);
    static final Duration BEFORE_ARRIVAL = Duration.ofMinutes(60);
    static final Duration AFTER_ARRIVAL = Duration.ofMinutes(60);
    /** How far around the leaving time a departure still counts as "going home from here". */
    static final Duration LEAVE_EARLY = Duration.ofMinutes(120);
    static final Duration LEAVE_LATE = Duration.ofMinutes(180);
    static final Duration TRIP_LENGTH = Duration.ofMinutes(90);
    /** Within this of the line's far end the trip is over. */
    static final double END_RADIUS_M = 150;
    /** At most this many alerts per trip, however often the person leaves and rejoins the line. */
    static final int MAX_ALERTS = 3;

    public record Pt(double lat, double lng) {}

    /**
     * @param expected today's arrival (TO) or leaving (FROM) time
     * @param inside   whether the person is inside the place now (null = never seen there)
     * @param changedAt when that last changed
     * @return when the watch ends, or null when this is not a time to watch
     */
    public static Instant watchUntil(Direction dir, Instant expected, int graceMinutes, Boolean inside,
                                     Instant changedAt, Instant now) {
        Instant deadline = expected.plus(Duration.ofMinutes(graceMinutes));
        if (dir == Direction.TO) {
            Instant start = expected.minus(BEFORE_ARRIVAL);
            Instant end = deadline.plus(AFTER_ARRIVAL);
            if (now.isBefore(start) || !now.isBefore(end) || Boolean.TRUE.equals(inside)) return null;
            return end;
        }
        if (!Boolean.FALSE.equals(inside) || changedAt == null) return null;
        if (changedAt.isBefore(expected.minus(LEAVE_EARLY)) || changedAt.isAfter(deadline.plus(LEAVE_LATE))) return null;
        Instant end = changedAt.plus(TRIP_LENGTH);
        return now.isBefore(end) && !now.isBefore(changedAt) ? end : null;
    }

    /** State of one person on one route for one trip. */
    public static final class Trip {
        boolean joined;
        boolean offRoute;
        boolean done;
        int alerts;
        Instant outsideSince;

        public boolean done() {
            return done;
        }
    }

    /**
     * @param distanceM      distance from the fix to the line
     * @param toEndM         distance from the fix to the line's far end
     */
    public static Event onFix(Trip t, double distanceM, double toEndM, int widthM, Instant ts) {
        if (t.done) return Event.NONE;
        if (toEndM <= Math.max(END_RADIUS_M, widthM)) {
            t.done = true;
            return Event.NONE;
        }
        if (distanceM <= widthM) {
            t.joined = true;
            t.outsideSince = null;
            if (t.offRoute) {
                t.offRoute = false;
                return Event.BACK_ON_ROUTE;
            }
            return Event.NONE;
        }
        if (!t.joined || t.offRoute) return Event.NONE;
        if (t.outsideSince == null) {
            t.outsideSince = ts;
            return Event.NONE;
        }
        if (t.alerts < MAX_ALERTS && Duration.between(t.outsideSince, ts).compareTo(OFF_FOR) >= 0) {
            t.offRoute = true;
            t.alerts++;
            return Event.OFF_ROUTE;
        }
        return Event.NONE;
    }

    /** Shortest distance in metres from a point to a polyline (flat-earth per segment; fine at city scale). */
    public static double distanceToPath(double lat, double lng, List<Pt> path) {
        if (path.isEmpty()) return Double.MAX_VALUE;
        if (path.size() == 1) return StayDetector.meters(lat, lng, path.get(0).lat(), path.get(0).lng());
        double mPerDegLat = 111_320;
        double mPerDegLng = 111_320 * Math.cos(Math.toRadians(lat));
        double best = Double.MAX_VALUE;
        for (int i = 1; i < path.size(); i++) {
            Pt a = path.get(i - 1);
            Pt b = path.get(i);
            double ax = (a.lng() - lng) * mPerDegLng, ay = (a.lat() - lat) * mPerDegLat;
            double bx = (b.lng() - lng) * mPerDegLng, by = (b.lat() - lat) * mPerDegLat;
            double dx = bx - ax, dy = by - ay;
            double len2 = dx * dx + dy * dy;
            double u = len2 == 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
            double px = ax + u * dx, py = ay + u * dy;
            best = Math.min(best, Math.sqrt(px * px + py * py));
        }
        return best;
    }

    public static double length(List<Pt> path) {
        double m = 0;
        for (int i = 1; i < path.size(); i++) {
            m += StayDetector.meters(path.get(i - 1).lat(), path.get(i - 1).lng(), path.get(i).lat(), path.get(i).lng());
        }
        return m;
    }
}
