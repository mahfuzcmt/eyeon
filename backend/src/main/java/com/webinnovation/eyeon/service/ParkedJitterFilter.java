package com.webinnovation.eyeon.service;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps a tracker that is lying still from wandering across the map.
 *
 * <p>A GPS fix indoors or by a window scatters 10-40 m every report while the tracker
 * says it is not moving (two 2G trackers on 2026-10-21: 6-8 satellites, speed 0, a new
 * spot every 10 s). Each fix is still stored as received; only the position shown -
 * {@code devices.last_location}, the live feed and the hot cache - stays where it was
 * while a slow fix lands within {@link #RADIUS_M} of it. A fix at walking-or-faster speed,
 * or one farther away, moves it. Someone walking therefore moves in steps of about the
 * radius rather than smoothly.
 *
 * <p>State is in memory: after a restart the first fix becomes the shown position.
 */
@Component
public class ParkedJitterFilter {

    /** Wobble of a still tracker; beyond this the move is taken as real. */
    static final double RADIUS_M = 30;
    /** Reported speed at or above which a fix is always taken as movement. */
    static final int MOVING_KMH = 6;

    public record Position(double latitude, double longitude) {}

    private final Map<String, Position> shown = new ConcurrentHashMap<>();

    /** The position to show for this fix: the fix itself, or the held one when it is only wobble. */
    public Position apply(String imei, double latitude, double longitude, int speedKmh) {
        Position fix = new Position(latitude, longitude);
        Position held = shown.get(imei);
        if (held == null || speedKmh >= MOVING_KMH
                || distanceM(held.latitude(), held.longitude(), latitude, longitude) > RADIUS_M) {
            shown.put(imei, fix);
            return fix;
        }
        return held;
    }

    public void forget(String imei) {
        shown.remove(imei);
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
