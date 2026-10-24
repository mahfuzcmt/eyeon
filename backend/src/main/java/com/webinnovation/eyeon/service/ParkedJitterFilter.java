package com.webinnovation.eyeon.service;

import org.springframework.stereotype.Component;

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
 *       (within {@link #AGREE_M}): one stray fix is ignored;</li>
 *   <li>a fix at {@link #MOVING_KMH} or more always moves it.</li>
 * </ul>
 *
 * <p>Until 2026-10-24 the first fix outside the radius became the shown spot and stayed there.
 * The first fixes after the GPS comes back (leaving a building) are the worst - median 23 m,
 * up to 105 m off, settling over about a minute - so the marker froze on the wrong side of the
 * road while the later, better fixes all fell within 30 m of it. Replayed over three days of the
 * two 2G trackers' still periods, the median distance of the shown spot from where the tracker
 * lay dropped from 14 m to 8 m with about the same number of marker moves. The worst 10 % stay
 * near 30 m: that is the accuracy of a single fix from this hardware, not something to filter away.
 *
 * <p>Someone walking still moves in steps of about the radius: these trackers report speed 0
 * at walking pace. State is in memory: after a restart the first fix becomes the shown position.
 */
@Component
public class ParkedJitterFilter {

    /** Wobble of a still tracker; beyond this the move is taken as real. */
    static final double RADIUS_M = 30;
    /** Reported speed at or above which a fix is always taken as movement. */
    static final int MOVING_KMH = 6;
    /** Two fixes outside the radius this close to each other confirm a move. */
    static final double AGREE_M = 2 * RADIUS_M;
    /** Fixes kept per cluster for the median (about five minutes at one fix per 10 s). */
    static final int CLUSTER_SIZE = 30;
    /** The shown spot follows the cluster median only when it has shifted this far. */
    static final double DEADBAND_M = 10;

    public record Position(double latitude, double longitude) {}

    private static final class State {
        Position shown;
        Position pending;
        final Deque<Position> cluster = new ArrayDeque<>();

        void restart(Position fix) {
            shown = fix;
            pending = null;
            cluster.clear();
            cluster.add(fix);
        }
    }

    private final Map<String, State> states = new ConcurrentHashMap<>();

    /** The position to show for this fix: the fix itself, or the held one when it is only wobble. */
    public Position apply(String imei, double latitude, double longitude, int speedKmh) {
        Position fix = new Position(latitude, longitude);
        State s = states.computeIfAbsent(imei, k -> new State());
        synchronized (s) {
            if (s.shown == null || speedKmh >= MOVING_KMH) {
                s.restart(fix);
                return fix;
            }
            if (distanceM(s.shown, fix) <= RADIUS_M) {
                s.pending = null;
                s.cluster.addLast(fix);
                if (s.cluster.size() > CLUSTER_SIZE) s.cluster.removeFirst();
                Position median = median(s.cluster);
                if (distanceM(s.shown, median) > DEADBAND_M) s.shown = median;
                return s.shown;
            }
            if (s.pending != null && distanceM(s.pending, fix) <= AGREE_M) {
                s.restart(fix);
                return fix;
            }
            s.pending = fix;
            return s.shown;
        }
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
