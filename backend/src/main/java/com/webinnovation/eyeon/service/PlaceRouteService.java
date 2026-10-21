package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.domain.enums.GeofenceKind;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository.Route;
import com.webinnovation.eyeon.repository.PlaceRouteRepository.Watchable;
import com.webinnovation.eyeon.service.RouteWatch.Direction;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The usual way to and from a trusted place, and the "took a different route" alert.
 *
 * <p>A parent draws "to School" and / or "from School" by tapping points; {@link #snap} turns them
 * into a road line. The minute sweep works out which person is on which trip right now (rules in
 * {@link RouteWatch#watchUntil}; a route is only watched on days its place has an arrival or leaving
 * time), and {@link #onFix} compares every fix of those people with the line. Alerts go to the
 * place's owner alone, like the place's other alarms.
 *
 * <p>Trips live in memory. After a restart a trip begins again and waits for the person to be on
 * the line before judging, so a restart never raises an alert by itself.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlaceRouteService {

    static final int MIN_WIDTH_M = 50;
    static final int MAX_WIDTH_M = 500;
    static final int DEFAULT_WIDTH_M = 100;
    static final int MAX_WAYPOINTS = 25;
    static final int MAX_PATH_POINTS = 5000;
    static final double MAX_LENGTH_M = 60_000;
    /** A Wi-Fi / cell position this coarse says nothing about which street someone is on. */
    static final int MAX_NETWORK_ACCURACY_M = 50;

    private final PlaceRouteRepository repo;
    private final GeofenceService geofences;
    private final RoadMatcher roads;
    private final AlarmService alarmService;

    /** imei -> routeId -> the trip being watched. */
    private final Map<String, Map<UUID, Watch>> watches = new ConcurrentHashMap<>();

    record Watch(Watchable route, Instant until, RouteWatch.Trip trip) {}

    public record Snapped(List<Pt> path, double lengthM, boolean roads) {}

    // ---- managing routes (owner only: getOrThrow is a 404 for anyone else) ----

    public List<Route> list(UUID orgId, UUID ownerUserId, UUID geofenceId) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        return repo.listForGeofence(geofenceId);
    }

    public Route save(UUID orgId, UUID ownerUserId, UUID geofenceId, String direction, String mode,
                      List<Pt> waypoints, List<Pt> path, Integer widthM) {
        Geofence place = geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        if (!GeofenceKind.TRUSTED_PLACE.name().equals(place.kind())) {
            throw new IllegalArgumentException("Routes can only be drawn for a trusted place");
        }
        String dir = direction(direction);
        String m = mode(mode);
        int width = widthM == null ? DEFAULT_WIDTH_M : widthM;
        if (width < MIN_WIDTH_M || width > MAX_WIDTH_M) {
            throw new IllegalArgumentException("widthM must be between " + MIN_WIDTH_M + " and " + MAX_WIDTH_M);
        }
        checkPoints(waypoints, 2, MAX_WAYPOINTS, "waypoints");
        checkPoints(path, 2, MAX_PATH_POINTS, "path");
        if (RouteWatch.length(path) > MAX_LENGTH_M) {
            throw new IllegalArgumentException("A route can be at most " + (int) (MAX_LENGTH_M / 1000) + " km long");
        }
        repo.upsert(orgId, geofenceId, dir, m, waypoints, path, width);
        return repo.listForGeofence(geofenceId).stream().filter(r -> r.direction().equals(dir)).findFirst().orElseThrow();
    }

    public void delete(UUID orgId, UUID ownerUserId, UUID geofenceId, String direction) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        if (repo.delete(geofenceId, direction(direction)) == 0) throw new NotFoundException("Route not found: " + direction);
    }

    /** Road line through the tapped points; straight lines when the road service has no answer. */
    public Snapped snap(List<Pt> points, String mode) {
        checkPoints(points, 2, MAX_WAYPOINTS, "points");
        String profile = "WALK".equals(mode(mode)) ? "foot" : "car";
        List<double[]> in = points.stream().map(p -> new double[] {p.lat(), p.lng()}).toList();
        List<Pt> path = roads.route(in, profile)
                .map(line -> line.stream().map(c -> new Pt(c[0], c[1])).toList())
                .orElse(null);
        boolean onRoads = path != null;
        if (path == null) path = points;
        return new Snapped(path, RouteWatch.length(path), onRoads);
    }

    private static String direction(String d) {
        try {
            return Direction.valueOf(String.valueOf(d).toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("direction must be TO or FROM");
        }
    }

    private static String mode(String m) {
        String v = m == null ? "VEHICLE" : m.toUpperCase();
        if (!v.equals("WALK") && !v.equals("VEHICLE")) throw new IllegalArgumentException("mode must be WALK or VEHICLE");
        return v;
    }

    private static void checkPoints(List<Pt> pts, int min, int max, String name) {
        if (pts == null || pts.size() < min || pts.size() > max) {
            throw new IllegalArgumentException(name + " must have " + min + " to " + max + " points");
        }
        for (Pt p : pts) {
            if (p == null || !(p.lat() >= -90 && p.lat() <= 90) || !(p.lng() >= -180 && p.lng() <= 180)) {
                throw new IllegalArgumentException(name + " has an invalid point");
            }
        }
    }

    // ---- watching ----

    @Scheduled(fixedRate = 60_000, initialDelay = 50_000)
    public void sweep() {
        List<Watchable> rows;
        try {
            rows = repo.listWatchable();
        } catch (Exception e) {
            log.warn("Route sweep could not load routes: {}", e.getMessage());
            return;
        }
        refresh(rows, Instant.now());
    }

    /** Starts trips that are due, keeps running ones, drops the ones whose time is over. */
    void refresh(List<Watchable> rows, Instant now) {
        Map<String, Map<UUID, Watch>> next = new HashMap<>();
        for (Watchable w : rows) {
            try {
                ZoneId zone = ExpectedTimeService.zoneOf(w.timezone());
                Instant expected = ExpectedTimeCheck.deadlineToday(w.localTime(), new HashSet<>(w.weekdays()), zone, now);
                if (expected == null) continue;
                Instant until = RouteWatch.watchUntil(Direction.valueOf(w.direction()), expected, w.graceMinutes(),
                        w.inside(), w.changedAt(), now);
                if (until == null) continue;
                Watch running = watches.getOrDefault(w.imei(), Map.of()).get(w.routeId());
                Watch kept = next.computeIfAbsent(w.imei(), k -> new HashMap<>()).get(w.routeId());
                if (kept != null && !until.isAfter(kept.until())) continue;   // two schedules: keep the longer window
                RouteWatch.Trip trip = running != null ? running.trip() : kept != null ? kept.trip() : new RouteWatch.Trip();
                next.get(w.imei()).put(w.routeId(), new Watch(w, until, trip));
            } catch (Exception e) {
                log.warn("Route check failed for route={} imei={}: {}", w.routeId(), w.imei(), e.getMessage());
            }
        }
        watches.keySet().retainAll(next.keySet());
        next.forEach((imei, m) -> watches.put(imei, new ConcurrentHashMap<>(m)));
    }

    /**
     * Called for every valid fix. Cheap when nobody is on a watched trip: one map lookup.
     *
     * @param accuracyM accuracy of a Wi-Fi / cell position, null for GPS
     */
    public void onFix(String imei, double lat, double lng, Instant ts, Integer accuracyM) {
        Map<UUID, Watch> mine = watches.get(imei);
        if (mine == null || mine.isEmpty()) return;
        if (accuracyM != null && accuracyM > MAX_NETWORK_ACCURACY_M) return;
        for (Watch w : List.copyOf(mine.values())) {
            if (ts.isAfter(w.until())) continue;
            List<Pt> path = w.route().path();
            double distance = RouteWatch.distanceToPath(lat, lng, path);
            Pt end = path.get(path.size() - 1);
            double toEnd = StayDetector.meters(lat, lng, end.lat(), end.lng());
            RouteWatch.Event e;
            synchronized (w.trip()) {
                e = RouteWatch.onFix(w.trip(), distance, toEnd, w.route().widthM(), ts);
            }
            if (e == RouteWatch.Event.OFF_ROUTE) {
                raise(w.route(), AlarmType.ROUTE_DEVIATION, AlarmSeverity.WARNING, ts, lat, lng, distance);
            } else if (e == RouteWatch.Event.BACK_ON_ROUTE) {
                raise(w.route(), AlarmType.BACK_ON_ROUTE, AlarmSeverity.INFO, ts, lat, lng, distance);
            }
        }
    }

    private void raise(Watchable r, AlarmType type, AlarmSeverity severity, Instant ts, double lat, double lng,
                       double distanceM) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("geofenceId", r.geofenceId().toString());
        meta.put("geofenceName", r.placeName());
        meta.put("geofenceKind", GeofenceKind.TRUSTED_PLACE.name());
        if (r.placeType() != null) meta.put("placeType", r.placeType());
        if (r.ownerUserId() != null) meta.put(AlarmRepository.GEOFENCE_OWNER_KEY, r.ownerUserId().toString());
        meta.put("routeId", r.routeId().toString());
        meta.put("direction", r.direction());
        meta.put("widthM", r.widthM());
        meta.put("distanceM", (int) Math.round(distanceM));
        alarmService.raise(r.orgId(), r.imei(), type, severity, ts, lat, lng, meta);
        log.info("Route watch: imei={} place={} direction={} {} distance={}m", r.imei(), r.placeName(), r.direction(),
                type, Math.round(distanceM));
    }

    /** People on a watched trip right now (for tests and diagnostics). */
    Set<String> watchedImeis() {
        return new HashSet<>(watches.keySet());
    }

    List<Watch> watchesOf(String imei) {
        return new ArrayList<>(watches.getOrDefault(imei, Map.of()).values());
    }
}
