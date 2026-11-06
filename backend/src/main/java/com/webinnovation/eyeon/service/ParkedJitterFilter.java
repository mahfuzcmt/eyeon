package com.webinnovation.eyeon.service;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps a tracker that is lying still from wandering across the map.
 *
 * <p>A GPS fix indoors or by a window scatters 10-40 m every report while the tracker
 * says it is not moving (two 2G trackers on 2026-10-21: 6-8 satellites, speed 0, a new
 * spot every 10 s). Each fix is still stored as received; only the position shown -
 * {@code devices.last_location}, the live feed and the hot cache - is filtered:
 * <ul>
 *   <li>a slow fix within {@link #RADIUS_M} of the shown spot joins the current cluster, and
 *       the shown spot is the cluster's median, moved only when that median shifts more than
 *       {@link #DEADBAND_M};</li>
 *   <li>a slow fix outside the radius moves the marker only when the next fix agrees with it
 *       (within {@link #AGREE_M}): one stray fix is ignored. If reaching it would have taken more
 *       than {@link #JUMP_MPS} (a jump of over {@link #JUMP_M} while the tracker says it is not
 *       moving), the fixes must keep agreeing for {@link #JUMP_HOLD_S};</li>
 *   <li>a fix at {@link #MOVING_KMH} or more moves it when the fix before was fast too and the
 *       two are at least {@link #STEP_M} apart, or when it lands more than {@link #AGREE_M} away;
 *       a single fast fix close by, or the same fast fix repeated, is noise;</li>
 *   <li>a Wi-Fi position of {@link #ANCHOR_ACCURACY_M} or better is where the tracker is: the
 *       marker goes there, and for {@link #ANCHOR_S} afterwards no GPS fix within
 *       {@link #ANCHOR_RADIUS_M} of it moves the marker, whatever speed it reports (checked
 *       before the fast-fix rule).</li>
 * </ul>
 * While the position is held the speed shown is 0 ({@link Result#held()}).
 *
 * <p>Until 2026-10-24 the first fix outside the radius became the shown spot and stayed there.
 * The first fixes after the GPS comes back (leaving a building) are the worst - median 23 m,
 * up to 105 m off, settling over about a minute - so the marker froze on the wrong side of the
 * road while the later, better fixes all fell within 30 m of it. Replayed over three days of the
 * two 2G trackers' still periods, the median distance of the shown spot from where the tracker
 * lay dropped from 14 m to 8 m with about the same number of marker moves. The worst 10 % stay
 * near 30 m: that is the accuracy of a single fix from this hardware, not something to filter away.
 *
 * <p>2026-10-26: trackers lying still showed as moving. The 2G ones report a few km/h, sometimes
 * 6-15, when their satellites change; a single fix at 6 km/h moved the marker and the held
 * position kept the raw speed. The PL601 indoors (4-8 satellites) drifted 20-80 m with speed 0-9,
 * once 300 m for two minutes, while its Wi-Fi positions in between stayed within 5 m; it also
 * repeats one stale fix at "9 km/h". Replayed over four days of all three trackers: on the PL601's
 * still hour the median error went from 22 m to 5 m (worst 299 m to 82 m). Indoor drift also
 * comes with speeds that match the distance moved (13:05 that day: 90 m out and back at 6, 6 and
 * 13 km/h), which no GPS-only rule can tell from a short walk; hence the strict anchor. Its cost:
 * leaving shows once 120 m from the Wi-Fi spot, about 20 s in a vehicle (one fix in four days of
 * replay lagged more than 100 m behind).
 *
 * <p>2026-11-06 (client feedback "walking, the map does not update"): these trackers report speed 0
 * at walking pace, so a walker was treated as still and the marker moved in 30-40 m steps every
 * 30-40 s, and leaving a Wi-Fi spot on foot showed only 120 m out (about 90 s). Now a walk is
 * recognised from the fixes themselves ({@link #isWalk}): {@link #WALK_STEPS} steps in a row of
 * {@link #WALK_MIN_STEP_M}+ each, every fix farther from where the run began than the one before,
 * the run nearly straight ({@link #WALK_STRAIGHTNESS}), every step within 45 degrees of the run's
 * direction and at least {@link #WALK_MIN_NET_M} long. While walking the marker follows every fix.
 * Still-tracker wobble and drift step in random directions, so they rarely form such a run. Near a
 * fresh Wi-Fi anchor the bar is higher - five steps, and the fix over {@link #WALK_ANCHOR_M} from the
 * anchor - because indoor drift there can run outwards at believable speeds.
 * Simulated side by side with the previous rules (300 runs per case, AR(1) GPS noise; walk 1.2-1.5 m/s,
 * one fix per 10 s, speed 0): the shown spot behind a walker, median 16 m to 6 m, 90th percentile
 * 37 m to 12 m; leaving a Wi-Fi spot on foot shown after about 60 s instead of 110 s; a tracker lying
 * still indoors next to its Wi-Fi spot unchanged (median 0 marker moves an hour, the same worst cases).
 * Outdoors a still tracker's marker moves a little more often (median 34 to 42 small moves an hour)
 * without straying further. Not replayed against production history.
 *
 * <p>State is in memory: after a restart the first fix becomes the shown position.
 */
@Component
public class ParkedJitterFilter {

    /** Wobble of a still tracker; beyond this the move is taken as real. */
    static final double RADIUS_M = 30;
    /** Reported speed at or above which a fix counts as fast. */
    static final int MOVING_KMH = 6;
    /** Two fixes outside the radius this close to each other confirm a move. */
    static final double AGREE_M = 2 * RADIUS_M;
    /** Fixes kept per cluster for the median (about five minutes at one fix per 10 s). */
    static final int CLUSTER_SIZE = 30;
    /** The shown spot follows the cluster median only when it has shifted this far. */
    static final double DEADBAND_M = 10;
    /** Two fast fixes confirm movement only when they are at least this far apart. */
    static final double STEP_M = 10;
    /** A Wi-Fi position at least this accurate anchors the shown spot. */
    static final int ANCHOR_ACCURACY_M = 50;
    /** Slow GPS fixes this close to the Wi-Fi anchor are taken as indoor drift. */
    static final double ANCHOR_RADIUS_M = 120;
    /** How long a Wi-Fi anchor holds (the PL601 sends a scan every 1-5 minutes indoors). */
    static final long ANCHOR_S = 600;
    /** A jump longer than this... */
    static final double JUMP_M = 100;
    /** ...that would have needed more than this speed (about 11 km/h) while reported as slow... */
    static final double JUMP_MPS = 3.0;
    /** ...moves the marker only when the fixes there keep agreeing for this long. */
    static final long JUMP_HOLD_S = 180;

    /** Steps in a row that make a walk away from a Wi-Fi anchor's surroundings. */
    static final int WALK_STEPS = 3;
    /** Each step of a walk at least this long (one fix per 10 s at 1.3 m/s is about 13 m). */
    static final double WALK_MIN_STEP_M = 4;
    /** Faster than this between two slow fixes is not walking. */
    static final double WALK_MAX_MPS = 3.5;
    /** Fixes further apart than this break a walk. */
    static final long WALK_MAX_GAP_S = 30;
    /** Straight-line distance over path length. */
    static final double WALK_STRAIGHTNESS = 0.75;
    /** Every step of a walk points within this angle of the run's overall direction (cos 45 degrees). */
    static final double WALK_MIN_COS = Math.cos(Math.toRadians(45));
    /** A walk covers at least this much ground. */
    static final double WALK_MIN_NET_M = 30;
    /** Near a fresh Wi-Fi anchor, a walk counts only this far from it. */
    static final double WALK_ANCHOR_M = 60;
    /** Fixes remembered for walk detection. */
    private static final int TRAIL_SIZE = WALK_STEPS + 3;

    public record Position(double latitude, double longitude) {}

    private record Fix(Position position, long at) {}

    /** The position to show, and whether it is held (the fix was wobble, so the speed shown is 0). */
    public record Result(Position position, boolean held) {}

    private static final class State {
        Position shown;
        long shownAt;
        Position pending;
        long pendingSince;
        boolean pendingIsJump;
        Position lastFix;
        boolean lastFast;
        Position anchor;
        long anchorAt;
        /** The latest fixes, newest last, for walk detection; not cleared by restart(). */
        final Deque<Fix> trail = new ArrayDeque<>();
        final Deque<Position> cluster = new ArrayDeque<>();

        void restart(Position fix, long at) {
            shown = fix;
            shownAt = at;
            pending = null;
            cluster.clear();
            cluster.add(fix);
        }
    }

    private final Map<String, State> states = new ConcurrentHashMap<>();

    /**
     * The position to show for this fix: the fix itself, or the held one when it is only wobble.
     *
     * @param wifiAccuracyM the accuracy of a position resolved from a Wi-Fi scan; null for GPS
     *                      and cell positions
     */
    public Result apply(String imei, double latitude, double longitude, int speedKmh, Instant ts, Integer wifiAccuracyM) {
        Position fix = new Position(latitude, longitude);
        long at = ts.getEpochSecond();
        State s = states.computeIfAbsent(imei, k -> new State());
        synchronized (s) {
            boolean fast = speedKmh >= MOVING_KMH;
            boolean wasFast = s.lastFast;
            Position previous = s.lastFix;
            s.lastFast = fast;
            s.lastFix = fix;
            if (wifiAccuracyM == null) {
                s.trail.addLast(new Fix(fix, at));
                if (s.trail.size() > TRAIL_SIZE) s.trail.removeFirst();
            }
            if (wifiAccuracyM != null && wifiAccuracyM <= ANCHOR_ACCURACY_M) {
                s.anchor = fix;
                s.anchorAt = at;
                if (s.shown == null || distanceM(s.shown, fix) > RADIUS_M) {
                    s.restart(fix, at);
                    return new Result(fix, false);
                }
            }
            if (s.shown == null) {
                s.restart(fix, at);
                return new Result(fix, false);
            }
            double away = distanceM(s.shown, fix);
            // Near a fresh Wi-Fi position the GPS never moves the marker, fast fixes included: indoors
            // it drifts 50-100 m at a believable 6-13 km/h. Leaving shows once past the radius.
            if (wifiAccuracyM == null && s.anchor != null && at - s.anchorAt <= ANCHOR_S
                    && distanceM(s.anchor, fix) <= ANCHOR_RADIUS_M) {
                if (distanceM(s.anchor, fix) > WALK_ANCHOR_M && isWalk(s.trail, WALK_STEPS + 2)) {
                    s.restart(fix, at);
                    return new Result(fix, false);
                }
                // A spike that got the marker away from here is undone.
                if (distanceM(s.shown, s.anchor) > RADIUS_M) s.restart(s.anchor, s.anchorAt);
                // Not counted as seen at the shown spot: someone walking out of the house must not
                // look like a jump once they pass the anchor radius.
                s.pending = null;
                return new Result(s.shown, true);
            }
            if (wifiAccuracyM == null && isWalk(s.trail, WALK_STEPS)) {
                s.restart(fix, at);
                return new Result(fix, false);
            }
            boolean stepped = previous != null && distanceM(previous, fix) >= STEP_M;
            if (fast && ((wasFast && stepped) || away > AGREE_M)) {
                s.restart(fix, at);
                return new Result(fix, false);
            }
            if (away <= RADIUS_M) {
                s.pending = null;
                s.shownAt = at;
                s.cluster.addLast(fix);
                if (s.cluster.size() > CLUSTER_SIZE) s.cluster.removeFirst();
                Position median = median(s.cluster);
                if (distanceM(s.shown, median) > DEADBAND_M) s.shown = median;
                return new Result(s.shown, true);
            }
            if (s.pending != null && distanceM(s.pending, fix) <= AGREE_M) {
                if (s.pendingIsJump && at - s.pendingSince < JUMP_HOLD_S) {
                    s.pending = fix;
                    return new Result(s.shown, true);
                }
                s.restart(fix, at);
                return new Result(fix, false);
            }
            s.pending = fix;
            s.pendingSince = at;
            s.pendingIsJump = away > JUMP_M && away / Math.max(1, at - s.shownAt) > JUMP_MPS;
            return new Result(s.shown, true);
        }
    }

    /** True when the last {@code steps} steps of the trail (ending at the newest fix) are a walk. */
    static boolean isWalk(Deque<Fix> trail, int steps) {
        if (trail.size() < steps + 1) return false;
        Fix[] all = trail.toArray(new Fix[0]);
        Fix[] run = java.util.Arrays.copyOfRange(all, all.length - steps - 1, all.length);
        Position start = run[0].position();
        double path = 0;
        double lastAway = 0;
        for (int i = 1; i < run.length; i++) {
            double step = distanceM(run[i - 1].position(), run[i].position());
            long dt = run[i].at() - run[i - 1].at();
            if (dt <= 0 || dt > WALK_MAX_GAP_S) return false;
            if (step < WALK_MIN_STEP_M || step / dt > WALK_MAX_MPS) return false;
            double away = distanceM(start, run[i].position());
            if (away <= lastAway) return false;
            lastAway = away;
            path += step;
        }
        if (lastAway < WALK_MIN_NET_M || lastAway < WALK_STRAIGHTNESS * path) return false;
        // GPS drift steps point every which way; a walker keeps a heading.
        double[] net = metres(start, run[run.length - 1].position());
        for (int i = 1; i < run.length; i++) {
            double[] step = metres(run[i - 1].position(), run[i].position());
            double cos = (net[0] * step[0] + net[1] * step[1]) / (Math.hypot(net[0], net[1]) * Math.hypot(step[0], step[1]));
            if (cos < WALK_MIN_COS) return false;
        }
        return true;
    }

    /** {east, north} metres from a to b (flat approximation, fine over a few hundred metres). */
    private static double[] metres(Position a, Position b) {
        double north = Math.toRadians(b.latitude() - a.latitude()) * 6_371_000;
        double east = Math.toRadians(b.longitude() - a.longitude()) * 6_371_000 * Math.cos(Math.toRadians(a.latitude()));
        return new double[] {east, north};
    }

    public void forget(String imei) {
        states.remove(imei);
    }

    private static Position median(Deque<Position> points) {
        double[] lats = points.stream().mapToDouble(Position::latitude).sorted().toArray();
        double[] lngs = points.stream().mapToDouble(Position::longitude).sorted().toArray();
        return new Position(middle(lats), middle(lngs));
    }

    private static double middle(double[] sorted) {
        int n = sorted.length;
        return n % 2 == 1 ? sorted[n / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }

    private static double distanceM(Position a, Position b) {
        return distanceM(a.latitude(), a.longitude(), b.latitude(), b.longitude());
    }

    static double distanceM(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
