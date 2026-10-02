package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.domain.enums.GeofenceKind;
import com.webinnovation.eyeon.repository.GeofenceRepository;
import com.webinnovation.eyeon.repository.StayRepository;
import com.webinnovation.eyeon.service.StayDetector.Point;
import com.webinnovation.eyeon.service.StayDetector.Stay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Where a person stayed and for how long (the popup's "here for 2 h" and the Stays report).
 *
 * <p>Stays are computed on request from {@code locations}; nothing is stored. Each stay is named
 * after the caller's <b>own</b> trusted place when it lies inside one ("Home", "School" - places
 * are private per user, so two parents may see different names for the same stay), otherwise
 * after the street / area from {@link PlaceNameService}.
 */
@Service
@RequiredArgsConstructor
public class StayService {

    /** A fix just outside a place's circle still counts as that place. */
    static final int PLACE_MARGIN_M = 30;

    private final StayRepository repo;
    private final GeofenceRepository geofences;
    private final PlaceNameService placeNames;

    /**
     * @param openStart the person was already there when the period began
     * @param ongoing   the person is there right now: {@code to} is the moment of the request
     * @param name      null while the area name is still being looked up (see {@link Result#namesPending})
     */
    public record StayView(Instant from, Instant to, long seconds, double latitude, double longitude,
                           String name, UUID placeId, String placeType,
                           boolean openStart, boolean ongoing) {}

    public record Result(List<StayView> stays, boolean namesPending) {}

    /**
     * @param online whether the tracker is connected now; only then is the last stay reported as ongoing
     * @param names  false skips naming (the map popup shows its own address)
     */
    public Result stays(UUID orgId, UUID userId, String imei, Instant from, Instant to,
                        boolean online, boolean names, String lang, Instant now) {
        List<Point> pts = new ArrayList<>(repo.points(orgId, imei, from, to));

        // The tracker goes quiet while it is not moving, so the period often starts and ends in
        // the middle of a silence. Borrow the neighbouring positions, clamped to the period.
        boolean seededStart = false;
        var before = repo.lastBefore(orgId, imei, from);
        if (before.isPresent() && Duration.between(before.get().ts(), from).compareTo(StayDetector.MAX_GAP) <= 0) {
            pts.add(0, new Point(from, before.get().lat(), before.get().lng()));
            seededStart = true;
        }
        boolean reachesNow = !to.isBefore(now.minusSeconds(120));
        if (!reachesNow) {
            var after = repo.firstFrom(orgId, imei, to);
            if (after.isPresent() && !pts.isEmpty()
                    && Duration.between(pts.get(pts.size() - 1).ts(), after.get().ts()).compareTo(StayDetector.MAX_GAP) <= 0) {
                pts.add(new Point(to, after.get().lat(), after.get().lng()));
            }
        } else if (online && !pts.isEmpty()) {
            // Connected and not seen anywhere else: still where the last position was.
            Point last = pts.get(pts.size() - 1);
            if (now.isAfter(last.ts())) pts.add(new Point(now, last.lat(), last.lng()));
        }

        List<Stay> stays = StayDetector.detect(pts);
        if (stays.isEmpty()) return new Result(List.of(), false);

        List<Geofence> places = names
                ? geofences.listForOwner(orgId, userId, GeofenceKind.TRUSTED_PLACE.name())
                : List.of();
        String language = PlaceNameService.lang(lang);
        Set<String> cells = new LinkedHashSet<>();
        if (names) for (Stay s : stays) cells.add(PlaceNameService.cell(s.lat(), s.lng()));
        Map<String, String> cached = names ? placeNames.cached(cells, language) : Map.of();

        boolean pending = false;
        Instant lastTs = pts.get(pts.size() - 1).ts();
        List<StayView> out = new ArrayList<>(stays.size());
        for (Stay s : stays) {
            String name = null;
            UUID placeId = null;
            String placeType = null;
            if (names) {
                Geofence place = placeAt(places, s.lat(), s.lng());
                if (place != null) {
                    name = place.name();
                    placeId = place.id();
                    placeType = place.placeType();
                } else {
                    String cell = PlaceNameService.cell(s.lat(), s.lng());
                    String hit = cached.get(cell);
                    if (hit != null) {
                        name = hit.isEmpty() ? null : hit;
                    } else if (placeNames.resolveLater(s.lat(), s.lng(), language)) {
                        pending = true;
                    }
                }
            }
            boolean openStart = seededStart && s.from().equals(from);
            boolean ongoing = reachesNow && online && s.to().equals(lastTs);
            out.add(new StayView(s.from(), s.to(), s.seconds(), s.lat(), s.lng(),
                    name, placeId, placeType, openStart, ongoing));
        }
        return new Result(out, pending);
    }

    /** The caller's trusted place this position lies in; the nearest centre wins when circles overlap. */
    static Geofence placeAt(List<Geofence> places, double lat, double lng) {
        Geofence best = null;
        double bestDistance = Double.MAX_VALUE;
        for (Geofence g : places) {
            if (g.center() == null || g.radiusM() == null) continue;
            double d = StayDetector.meters(g.center().lat(), g.center().lng(), lat, lng);
            if (d <= g.radiusM() + PLACE_MARGIN_M && d < bestDistance) {
                best = g;
                bestDistance = d;
            }
        }
        return best;
    }
}
