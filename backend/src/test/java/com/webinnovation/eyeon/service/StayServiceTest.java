package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.repository.GeofenceRepository;
import com.webinnovation.eyeon.repository.StayRepository;
import com.webinnovation.eyeon.service.StayDetector.Point;
import com.webinnovation.eyeon.service.StayService.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Naming a stay, and the edges of the reported period. */
class StayServiceTest {

    private static final String IMEI = "868322070079370";
    private static final double HOME_LAT = 23.7461, HOME_LNG = 90.3742;
    private static final double BAZAR_LAT = 23.7515, BAZAR_LNG = 90.3930;
    private static final Instant FROM = Instant.parse("2026-10-03T18:00:00Z");   // midnight in Dhaka
    private static final Instant TO = Instant.parse("2026-10-04T18:00:00Z");
    private static final Instant NOW = Instant.parse("2026-10-06T05:00:00Z");

    private final UUID orgId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID homeId = UUID.randomUUID();

    private StayRepository repo;
    private GeofenceRepository geofences;
    private PlaceNameService names;
    private StayService service;

    @BeforeEach
    void setUp() {
        repo = mock(StayRepository.class);
        geofences = mock(GeofenceRepository.class);
        names = mock(PlaceNameService.class);
        when(repo.lastBefore(any(), anyString(), any())).thenReturn(Optional.empty());
        when(repo.firstFrom(any(), anyString(), any())).thenReturn(Optional.empty());
        when(geofences.listForOwner(orgId, userId, "TRUSTED_PLACE")).thenReturn(List.of(home()));
        when(names.cached(anyCollection(), anyString())).thenReturn(Map.of());
        service = new StayService(repo, geofences, names);
    }

    private Geofence home() {
        return new Geofence(homeId, orgId, "Home", "CIRCLE", "BOTH", "#0F6B5C", true,
                new Geofence.LatLng(HOME_LAT, HOME_LNG), 100, List.of(),
                "TRUSTED_PLACE", "HOME", null, 30, 60, FROM, FROM);
    }

    private static Point p(String time, double lat, double lng) {
        return new Point(Instant.parse(time), lat, lng);
    }

    @Test
    void a_stay_inside_the_callers_own_place_takes_its_name() {
        when(repo.points(orgId, IMEI, FROM, TO)).thenReturn(List.of(
                p("2026-10-04T02:00:00Z", HOME_LAT, HOME_LNG), p("2026-10-04T02:20:00Z", HOME_LAT + 0.0002, HOME_LNG)));

        Result r = service.stays(orgId, userId, IMEI, FROM, TO, false, true, "en", NOW);

        assertEquals(1, r.stays().size());
        assertEquals("Home", r.stays().get(0).name());
        assertEquals(homeId, r.stays().get(0).placeId());
        assertEquals("HOME", r.stays().get(0).placeType());
        assertFalse(r.namesPending());
        verify(names, never()).resolveLater(anyDouble(), anyDouble(), anyString());
    }

    @Test
    void elsewhere_the_cached_area_name_is_used() {
        when(repo.points(orgId, IMEI, FROM, TO)).thenReturn(List.of(
                p("2026-10-04T08:40:00Z", BAZAR_LAT, BAZAR_LNG), p("2026-10-04T08:45:00Z", BAZAR_LAT, BAZAR_LNG)));
        when(names.cached(anyCollection(), eq("bn")))
                .thenReturn(Map.of(PlaceNameService.cell(BAZAR_LAT, BAZAR_LNG), "কারওয়ান বাজার"));

        Result r = service.stays(orgId, userId, IMEI, FROM, TO, false, true, "bn-BD", NOW);

        assertEquals("কারওয়ান বাজার", r.stays().get(0).name());
        assertNull(r.stays().get(0).placeId());
        assertEquals(300, r.stays().get(0).seconds());
        assertFalse(r.namesPending());
    }

    @Test
    void an_unknown_area_is_queued_and_reported_as_pending() {
        when(repo.points(orgId, IMEI, FROM, TO)).thenReturn(List.of(
                p("2026-10-04T08:40:00Z", BAZAR_LAT, BAZAR_LNG), p("2026-10-04T08:45:00Z", BAZAR_LAT, BAZAR_LNG)));
        when(names.resolveLater(anyDouble(), anyDouble(), eq("en"))).thenReturn(true);

        Result r = service.stays(orgId, userId, IMEI, FROM, TO, false, true, "en", NOW);

        assertNull(r.stays().get(0).name());
        assertTrue(r.namesPending());
    }

    @Test
    void the_night_before_the_first_report_of_the_day_counts_from_midnight() {
        // Last seen at home at 23:10; the tracker then said nothing until 06:30.
        when(repo.lastBefore(orgId, IMEI, FROM)).thenReturn(Optional.of(p("2026-10-03T17:10:00Z", HOME_LAT, HOME_LNG)));
        when(repo.points(orgId, IMEI, FROM, TO)).thenReturn(List.of(
                p("2026-10-04T00:30:00Z", HOME_LAT, HOME_LNG), p("2026-10-04T01:40:00Z", HOME_LAT, HOME_LNG)));

        Result r = service.stays(orgId, userId, IMEI, FROM, TO, false, true, "en", NOW);

        assertEquals(1, r.stays().size());
        assertEquals(FROM, r.stays().get(0).from());
        assertTrue(r.stays().get(0).openStart());
        assertEquals(Instant.parse("2026-10-04T01:40:00Z"), r.stays().get(0).to());
    }

    @Test
    void a_connected_tracker_is_still_where_it_was_last_seen() {
        Instant now = Instant.parse("2026-10-04T10:00:00Z");
        when(repo.points(orgId, IMEI, FROM, now)).thenReturn(List.of(
                p("2026-10-04T07:00:00Z", HOME_LAT, HOME_LNG), p("2026-10-04T07:05:00Z", HOME_LAT, HOME_LNG)));

        Result online = service.stays(orgId, userId, IMEI, FROM, now, true, false, null, now);
        assertTrue(online.stays().get(0).ongoing());
        assertEquals(now, online.stays().get(0).to());
        assertEquals(3 * 3600, online.stays().get(0).seconds());
        assertNull(online.stays().get(0).name(), "names=false leaves stays unnamed");

        Result offline = service.stays(orgId, userId, IMEI, FROM, now, false, false, null, now);
        assertFalse(offline.stays().get(0).ongoing());
        assertEquals(300, offline.stays().get(0).seconds());
    }
}
