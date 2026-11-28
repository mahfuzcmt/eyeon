package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.domain.enums.GeofenceKind;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository.Fields;
import com.webinnovation.eyeon.repository.PlaceRouteRepository.Route;
import com.webinnovation.eyeon.repository.StayRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository.Watchable;
import com.webinnovation.eyeon.service.RouteWatch.Direction;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
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
 * <p>A parent draws routes to and from a place ("Home to School", "School to Coaching"), each with
 * its days, hours and alert level, by tapping points or by picking a past trip ({@link #fromHistory}); {@link #snap} turns them
 * into a road line. The minute sweep works out which person is on which trip right now (rules in
 * {@link RouteWatch#watchWindow} for a route with its own days and hours, {@link RouteWatch#watchUntil}
 * for one from before V38, which follows its place's arrival or leaving time), and {@link #onFix} compares every fix of those people with the line. Alerts go to the
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
    static final int MAX_ROUTES_PER_PLACE = 10;
    static final int MAX_NAME = 80;

    private final PlaceRouteRepository repo;
    private final GeofenceService geofences;
    private final RoadMatcher roads;
    private final AlarmService alarmService;
    private final StayRepository stays;

    /** imei -> routeId -> the trip being watched. */
    private final Map<String, Map<UUID, Watch>> watches = new ConcurrentHashMap<>();

    /** @param startedAt when the person set off on this trip, when that is known */
    record Watch(Watchable route, Instant until, RouteWatch.Trip trip, Instant startedAt) {}

    public record Snapped(List<Pt> path, double lengthM, boolean roads) {}

    // ---- managing routes (owner only: getOrThrow is a 404 for anyone else) ----

    /** What a client sends for a route. {@code weekdays}, {@code timeFrom}, {@code timeTo}: all or none. */
    public record Input(String direction, String name, String mode, List<Pt> waypoints, List<Pt> path, Integer widthM,
                        UUID otherGeofenceId, List<Integer> weekdays, String timeFrom, String timeTo, String severity) {}

    public List<Route> list(UUID orgId, UUID ownerUserId, UUID geofenceId) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        return repo.listForGeofence(geofenceId);
    }

    public Route create(UUID orgId, UUID ownerUserId, UUID geofenceId, Input in) {
        Fields f = check(orgId, ownerUserId, geofenceId, in);
        if (repo.listForGeofence(geofenceId).size() >= MAX_ROUTES_PER_PLACE) {
            throw new IllegalArgumentException("A place can have at most " + MAX_ROUTES_PER_PLACE + " routes");
        }
        UUID id = repo.insert(orgId, geofenceId, f);
        return repo.find(geofenceId, id).orElseThrow();
    }

    public Route update(UUID orgId, UUID ownerUserId, UUID geofenceId, UUID routeId, Input in) {
        Fields f = check(orgId, ownerUserId, geofenceId, in);
        if (repo.update(geofenceId, routeId, f) == 0) throw new NotFoundException("Route not found: " + routeId);
        return repo.find(geofenceId, routeId).orElseThrow();
    }

    /**
     * The call of apps from before named routes ("the route to this place"): replaces the line of
     * the oldest route in that direction and leaves its name, days and alert level alone, or
     * makes the first one.
     */
    public Route saveByDirection(UUID orgId, UUID ownerUserId, UUID geofenceId, String direction, String mode,
                                 List<Pt> waypoints, List<Pt> path, Integer widthM) {
        String dir = direction(direction);
        Route old = repo.listForGeofence(geofenceId).stream().filter(r -> r.direction().equals(dir)).findFirst().orElse(null);
        Input in = old == null
                ? new Input(dir, null, mode, waypoints, path, widthM, null, null, null, null, null)
                : new Input(dir, old.name(), mode, waypoints, path, widthM, old.otherGeofenceId(), old.weekdays(),
                        old.timeFrom() == null ? null : old.timeFrom().toString(),
                        old.timeTo() == null ? null : old.timeTo().toString(), old.severity());
        return old == null ? create(orgId, ownerUserId, geofenceId, in) : update(orgId, ownerUserId, geofenceId, old.id(), in);
    }

    public void delete(UUID orgId, UUID ownerUserId, UUID geofenceId, UUID routeId) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        if (repo.delete(geofenceId, routeId) == 0) throw new NotFoundException("Route not found: " + routeId);
    }

    public void deleteByDirection(UUID orgId, UUID ownerUserId, UUID geofenceId, String direction) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        String dir = direction(direction);
        Route old = repo.listForGeofence(geofenceId).stream().filter(r -> r.direction().equals(dir)).findFirst()
                .orElseThrow(() -> new NotFoundException("Route not found: " + dir));
        repo.delete(geofenceId, old.id());
    }

    private Fields check(UUID orgId, UUID ownerUserId, UUID geofenceId, Input in) {
        requirePlace(geofences.getOrThrow(orgId, ownerUserId, geofenceId));
        String dir = direction(in.direction());
        String m = mode(in.mode());
        int width = in.widthM() == null ? DEFAULT_WIDTH_M : in.widthM();
        if (width < MIN_WIDTH_M || width > MAX_WIDTH_M) {
            throw new IllegalArgumentException("widthM must be between " + MIN_WIDTH_M + " and " + MAX_WIDTH_M);
        }
        checkPoints(in.waypoints(), 2, MAX_WAYPOINTS, "waypoints");
        checkPoints(in.path(), 2, MAX_PATH_POINTS, "path");
        if (RouteWatch.length(in.path()) > MAX_LENGTH_M) {
            throw new IllegalArgumentException("A route can be at most " + (int) (MAX_LENGTH_M / 1000) + " km long");
        }
        String name = in.name() == null || in.name().isBlank() ? null : in.name().trim();
        if (name != null && name.length() > MAX_NAME) throw new IllegalArgumentException("name can be at most " + MAX_NAME + " characters");
        if (in.otherGeofenceId() != null) {
            if (in.otherGeofenceId().equals(geofenceId)) throw new IllegalArgumentException("A route cannot start and end at the same place");
            requirePlace(geofences.getOrThrow(orgId, ownerUserId, in.otherGeofenceId()));   // the owner's own place
        }
        boolean hasDays = in.weekdays() != null && !in.weekdays().isEmpty();
        boolean hasTimes = in.timeFrom() != null || in.timeTo() != null;
        List<Integer> days = null;
        LocalTime from = null, to = null;
        if (hasDays || hasTimes) {
            if (!hasDays || in.timeFrom() == null || in.timeTo() == null) {
                throw new IllegalArgumentException("weekdays, timeFrom and timeTo go together");
            }
            days = in.weekdays().stream().distinct().sorted().toList();
            if (days.stream().anyMatch(d -> d == null || d < 1 || d > 7)) {
                throw new IllegalArgumentException("weekdays are 1 (Monday) to 7 (Sunday)");
            }
            from = time(in.timeFrom(), "timeFrom");
            to = time(in.timeTo(), "timeTo");
            if (!from.isBefore(to)) throw new IllegalArgumentException("timeFrom must be before timeTo");
        }
        return new Fields(dir, m, in.waypoints(), in.path(), width, name, in.otherGeofenceId(), days, from, to,
                severity(in.severity()));
    }

    private static void requirePlace(Geofence place) {
        if (!GeofenceKind.TRUSTED_PLACE.name().equals(place.kind())) {
            throw new IllegalArgumentException("Routes can only be drawn for a trusted place");
        }
    }

    private static LocalTime time(String hhmm, String field) {
        try {
            return LocalTime.parse(hhmm).withSecond(0).withNano(0);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(field + " must be HH:mm");
        }
    }

    private static String severity(String s) {
        if (s == null || s.isBlank()) return AlarmSeverity.WARNING.name();
        try {
            return AlarmSeverity.valueOf(s.toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("severity must be INFO, WARNING or CRITICAL");
        }
    }

    /**
     * The trips to (or from) the place found in one day of a person's positions, to save one as the
     * route instead of drawing it. The caller checks that the user may see the person.
     */
    public List<RouteFromHistory.Candidate> fromHistory(UUID orgId, UUID ownerUserId, UUID geofenceId, String imei,
                                                        LocalDate date, String direction) {
        Geofence place = geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        requirePlace(place);
        if (place.center() == null) throw new IllegalArgumentException("The place has no centre");
        Direction dir = Direction.valueOf(direction(direction));
        ZoneId zone = ExpectedTimeService.zoneOf(repo.timezoneOf(orgId));
        if (date == null || date.isAfter(LocalDate.now(zone))) throw new IllegalArgumentException("date must not be in the future");
        // A trip that ends at the place just after midnight, or starts just before, still belongs
        // to the day: look a few hours either side.
        Instant from = date.atStartOfDay(zone).minusHours(3).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(zone).plusHours(3).toInstant();
        List<StayDetector.Point> pts = new ArrayList<>(stays.points(orgId, imei, from, to));
        // A tracker lying still goes quiet, so the day often begins and ends inside a silence:
        // where the person already was, and where they stayed after the last position, count.
        stays.lastBefore(orgId, imei, from).ifPresent(p -> pts.add(0, new StayDetector.Point(from, p.lat(), p.lng())));
        if (!pts.isEmpty()) {
            StayDetector.Point last = pts.get(pts.size() - 1);
            Instant end = to.isBefore(Instant.now()) ? to : Instant.now();
            StayDetector.Point after = stays.firstFrom(orgId, imei, to).orElse(null);
            // nothing heard since: still there; heard again later: there until then
            if (after == null || java.time.Duration.between(last.ts(), after.ts()).compareTo(StayDetector.MAX_GAP) <= 0) {
                if (end.isAfter(last.ts())) pts.add(new StayDetector.Point(end, last.lat(), last.lng()));
            }
        }
        return RouteFromHistory.candidates(pts, dir, place.center().lat(),
                place.center().lng(), place.radiusM() == null ? 100 : place.radiusM());
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
                if (w.weekdays() == null) continue;
                Direction dir = Direction.valueOf(w.direction());
                Instant until;
                Instant startedAt;
                if (w.timeFrom() != null && w.timeTo() != null) {
                    Set<Integer> days = new HashSet<>(w.weekdays());
                    Instant from = ExpectedTimeCheck.deadlineToday(w.timeFrom(), days, zone, now);
                    Instant to = ExpectedTimeCheck.deadlineToday(w.timeTo(), days, zone, now);
                    if (from == null || to == null) continue;
                    RouteWatch.Window win = RouteWatch.watchWindow(dir, from, to, w.inside(), w.changedAt(),
                            w.otherInside(), w.otherChangedAt(), now);
                    if (win == null) continue;
                    until = win.until();
                    startedAt = win.startedAt();
                } else {
                    if (w.localTime() == null) continue;
                    Instant expected = ExpectedTimeCheck.deadlineToday(w.localTime(), new HashSet<>(w.weekdays()), zone, now);
                    if (expected == null) continue;
                    until = RouteWatch.watchUntil(dir, expected, w.graceMinutes(), w.inside(), w.changedAt(), now);
                    if (until == null) continue;
                    startedAt = dir == Direction.FROM ? w.changedAt() : null;
                }
                Watch running = watches.getOrDefault(w.imei(), Map.of()).get(w.routeId());
                Watch kept = next.computeIfAbsent(w.imei(), k -> new HashMap<>()).get(w.routeId());
                if (kept != null && !until.isAfter(kept.until())) continue;   // two schedules: keep the longer window
                RouteWatch.Trip trip = running != null ? running.trip() : kept != null ? kept.trip() : new RouteWatch.Trip();
                next.get(w.imei()).put(w.routeId(), new Watch(w, until, trip, startedAt));
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
        for (Watch w : List.copyOf(mine.values())) {
            if (ts.isAfter(w.until())) continue;
            // A Wi-Fi / tower position coarser than the route is wide cannot say which street.
            if (accuracyM != null && accuracyM > Math.max(MAX_NETWORK_ACCURACY_M, w.route().widthM())) continue;
            List<Pt> path = w.route().path();
            double distance = RouteWatch.distanceToPath(lat, lng, path);
            Pt start = path.get(0);
            Pt end = path.get(path.size() - 1);
            double toStart = StayDetector.meters(lat, lng, start.lat(), start.lng());
            double toEnd = StayDetector.meters(lat, lng, end.lat(), end.lng());
            RouteWatch.Event e;
            synchronized (w.trip()) {
                e = RouteWatch.onFix(w.trip(), distance, toEnd, toStart, w.route().widthM(), ts, w.startedAt());
            }
            AlarmSeverity chosen = severityOf(w.route());
            if (e == RouteWatch.Event.OFF_ROUTE) {
                raise(w.route(), AlarmType.ROUTE_DEVIATION, chosen, ts, lat, lng, distance);
            } else if (e == RouteWatch.Event.NOT_TAKEN) {
                raise(w.route(), AlarmType.ROUTE_NOT_TAKEN, chosen, ts, lat, lng, distance);
            } else if (e == RouteWatch.Event.BACK_ON_ROUTE) {
                raise(w.route(), AlarmType.BACK_ON_ROUTE, AlarmSeverity.INFO, ts, lat, lng, distance);
            }
        }
    }

    private static AlarmSeverity severityOf(Watchable r) {
        try {
            return r.severity() == null ? AlarmSeverity.WARNING : AlarmSeverity.valueOf(r.severity());
        } catch (IllegalArgumentException e) {
            return AlarmSeverity.WARNING;
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
        if (r.routeName() != null) meta.put("routeName", r.routeName());
        if (r.otherName() != null) meta.put("otherPlaceName", r.otherName());
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
