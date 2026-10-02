package com.webinnovation.eyeon.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns a person's location points into <b>stays</b>: "at this spot from 14:40 to 14:45".
 * Pure, so the rules can be tested without a database.
 *
 * <p>The rules follow how the trackers really report (production data, 2026-10-02):
 * <ul>
 *   <li>A stay is a run of points that remain within {@link #RADIUS_M} of where the run began.
 *       The centre is fixed after the first few points; a centre that kept following the points
 *       would turn a slow walk into one long "stay".</li>
 *   <li>A tracker that is not moving goes quiet - gaps of 6 and 9 hours overnight are normal -
 *       so silence does not end a stay. Only being seen somewhere else does, or a silence longer
 *       than {@link #MAX_GAP}, after which we do not claim to know.</li>
 *   <li>One or two stray points (indoor GPS jumping across the road and back) are ignored; three
 *       in a row, or {@link #OUTLIER_SPAN} spent outside, mean the person has left.</li>
 *   <li>Anything shorter than {@link #MIN_STAY} is a pause on the way, not a stay.</li>
 *   <li>Two stays within one radius and {@link #MERGE_GAP} of each other are joined.</li>
 * </ul>
 */
public final class StayDetector {

    public static final int RADIUS_M = 150;
    public static final Duration MIN_STAY = Duration.ofMinutes(5);
    public static final Duration MAX_GAP = Duration.ofHours(24);
    static final int OUTLIER_POINTS = 3;
    static final Duration OUTLIER_SPAN = Duration.ofMinutes(3);
    /** Two stays this close in time and within one radius of each other are one stay. */
    static final Duration MERGE_GAP = Duration.ofMinutes(15);
    /** The centre is the mean of the first points of the run, then stays put. */
    static final int CENTRE_POINTS = 5;

    private StayDetector() {}

    public record Point(Instant ts, double lat, double lng) {}

    /** @param lat,lng mean position of the points in the stay */
    public record Stay(Instant from, Instant to, double lat, double lng, int points) {
        public long seconds() {
            return Duration.between(from, to).getSeconds();
        }
    }

    /** @param pts ordered by time, oldest first */
    public static List<Stay> detect(List<Point> pts) {
        List<Stay> out = new ArrayList<>();
        int n = pts.size();
        int i = 0;
        while (i < n) {
            Point first = pts.get(i);
            double cLat = first.lat(), cLng = first.lng();
            double sumLat = first.lat(), sumLng = first.lng();
            int members = 1;
            int lastInside = i;
            int outsideStart = -1;

            for (int j = i + 1; j < n; j++) {
                Point p = pts.get(j);
                if (Duration.between(pts.get(j - 1).ts(), p.ts()).compareTo(MAX_GAP) > 0) break;
                if (meters(cLat, cLng, p.lat(), p.lng()) <= RADIUS_M) {
                    sumLat += p.lat();
                    sumLng += p.lng();
                    members++;
                    lastInside = j;
                    outsideStart = -1;
                    if (members <= CENTRE_POINTS) {
                        cLat = sumLat / members;
                        cLng = sumLng / members;
                    }
                } else {
                    if (outsideStart < 0) outsideStart = j;
                    boolean gone = j - outsideStart + 1 >= OUTLIER_POINTS
                            || Duration.between(pts.get(outsideStart).ts(), p.ts()).compareTo(OUTLIER_SPAN) > 0;
                    if (gone) break;
                }
            }

            Instant from = first.ts();
            Instant to = pts.get(lastInside).ts();
            if (Duration.between(from, to).compareTo(MIN_STAY) >= 0) {
                out.add(new Stay(from, to, sumLat / members, sumLng / members, members));
                i = lastInside + 1;
            } else {
                i++;
            }
        }
        return merge(out);
    }

    /**
     * Joins neighbouring stays that are really one: a flat's Wi-Fi estimate and the GPS fix at its
     * gate can be 140 m apart, which starts a second circle a couple of minutes after the first.
     */
    static List<Stay> merge(List<Stay> stays) {
        List<Stay> out = new ArrayList<>(stays.size());
        for (Stay s : stays) {
            Stay prev = out.isEmpty() ? null : out.get(out.size() - 1);
            if (prev != null
                    && Duration.between(prev.to(), s.from()).compareTo(MERGE_GAP) <= 0
                    && meters(prev.lat(), prev.lng(), s.lat(), s.lng()) <= RADIUS_M) {
                int n = prev.points() + s.points();
                out.set(out.size() - 1, new Stay(prev.from(), s.to(),
                        (prev.lat() * prev.points() + s.lat() * s.points()) / n,
                        (prev.lng() * prev.points() + s.lng() * s.points()) / n, n));
            } else {
                out.add(s);
            }
        }
        return out;
    }

    /** Great-circle distance in metres (haversine); accurate to well under a metre at these ranges. */
    public static double meters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
