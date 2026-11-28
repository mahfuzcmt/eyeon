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
 *
 * <p><b>Never on the line.</b> When it is known when the trip began (the person left the place the
 * route starts at), someone who is still not on the line {@link #NOT_TAKEN_AFTER} later, and well
 * away from where it starts, "did not take the route": one alert, on the second such fix. This is
 * the case the first rule cannot see - picked up at the gate and driven another way.
 *
 * <p>A route with its own days and hours (V38) is watched inside that window, see
 * {@link #watchWindow}; an older one around its place's expected time, see {@link #watchUntil}.
 */
public final class RouteWatch {

    private RouteWatch() {}

    public enum Direction { TO, FROM }

    public enum Event { NONE, OFF_ROUTE, BACK_ON_ROUTE, NOT_TAKEN }

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
    /** This long after setting off without ever being on the line: they did not take the route. */
    static final Duration NOT_TAKEN_AFTER = Duration.ofMinutes(3);
    /** ... and at least this far from where the line starts (still at the gate is not "another way"). */
    static final double START_RADIUS_M = 300;
    /** Leaving the start place this long before the window opens still counts as setting off. */
    static final Duration EARLY_START = Duration.ofMinutes(30);
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

    /** @param startedAt when the person set off, when that is known (it enables the "never on the line" rule) */
    public record Window(Instant until, Instant startedAt) {}

    /**
     * When a route with its own hours is watched today.
     *
     * <p>TO: inside the window, while the person is not at the place yet. FROM: for
     * {@link #TRIP_LENGTH} after they left the place, when they left inside the window.
     *
     * @param from / to       today's window
     * @param inside          whether the person is at the route's place now (null = never seen there)
     * @param changedAt       when that last changed
     * @param otherInside     the same for the place at the other end of the route, null when there is none
     * @return null when this is not a time to watch
     */
    public static Window watchWindow(Direction dir, Instant from, Instant to, Boolean inside, Instant changedAt,
                                     Boolean otherInside, Instant otherChangedAt, Instant now) {
        if (dir == Direction.TO) {
            if (now.isBefore(from) || !now.isBefore(to) || Boolean.TRUE.equals(inside)) return null;
            boolean setOff = Boolean.FALSE.equals(otherInside) && otherChangedAt != null
                    && !otherChangedAt.isBefore(from.minus(EARLY_START)) && !otherChangedAt.isAfter(now);
            return new Window(to, setOff ? otherChangedAt : null);
        }
        if (!Boolean.FALSE.equals(inside) || changedAt == null) return null;
        if (changedAt.isBefore(from) || changedAt.isAfter(to)) return null;
        Instant end = changedAt.plus(TRIP_LENGTH);
        return now.isBefore(end) && !now.isBefore(changedAt) ? new Window(end, changedAt) : null;
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

    public static Event onFix(Trip t, double distanceM, double toEndM, int widthM, Instant ts) {
        return onFix(t, distanceM, toEndM, 0, widthM, ts, null);
    }

    /**
     * @param distanceM      distance from the fix to the line
     * @param toEndM         distance from the fix to the line's far end
     * @param toStartM       distance from the fix to where the line starts
     * @param startedAt      when the person set off, null when that is not known
     */
    public static Event onFix(Trip t, double distanceM, double toEndM, double toStartM, int widthM, Instant ts,
                              Instant startedAt) {
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
        if (t.offRoute) return Event.NONE;
        if (!t.joined) {
            if (startedAt == null || t.alerts >= MAX_ALERTS || ts.isBefore(startedAt.plus(NOT_TAKEN_AFTER))
                    || toStartM <= Math.max(START_RADIUS_M, widthM)) {
                return Event.NONE;
            }
            if (t.outsideSince == null) {   // one position is not enough to say so
                t.outsideSince = ts;
                return Event.NONE;
            }
            t.joined = true;
            t.offRoute = true;
            t.alerts++;
            return Event.NOT_TAKEN;
        }
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
