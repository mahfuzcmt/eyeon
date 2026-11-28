package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository;
import com.webinnovation.eyeon.repository.PlaceRouteRepository.Watchable;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlaceRouteServiceTest {

    private static final String IMEI = "357445100734645";
    private static final UUID OWNER = UUID.randomUUID();
    /** Home (west) to School (east) along one street, ~1.1 km. */
    private static final List<Pt> PATH = List.of(new Pt(23.7460, 90.3700), new Pt(23.7460, 90.3810));
    /** Wednesday 2026-10-21, 06:30 Dhaka. */
    private static final Instant NOW = Instant.parse("2026-10-21T00:30:00Z");

    private AlarmService alarms;
    private RoadMatcher roads;
    private PlaceRouteService service;
    private PlaceRouteRepository repo;
    private GeofenceService geofences;
    private Watchable route;

    @BeforeEach
    void setUp() {
        alarms = mock(AlarmService.class);
        roads = mock(RoadMatcher.class);
        repo = mock(PlaceRouteRepository.class);
        geofences = mock(GeofenceService.class);
        service = new PlaceRouteService(repo, geofences, roads, alarms,
                mock(com.webinnovation.eyeon.repository.StayRepository.class));
        // A route from before named routes: watched around the place's 07:00 arrival time.
        route = new Watchable(UUID.randomUUID(), "TO", PATH, 100, "WARNING", null, UUID.randomUUID(), UUID.randomUUID(),
                "School", "SCHOOL", OWNER, "Asia/Dhaka", IMEI, List.of(7, 1, 2, 3, 4), LocalTime.of(7, 0), 5,
                null, null, false, null, null, null, null);
    }

    /** "Home to School", Sunday-Thursday 06:00-08:00, with the parent's alert level; Home is the start place. */
    private Watchable named(String severity, Boolean atHome, Instant leftHomeAt) {
        return new Watchable(UUID.randomUUID(), "TO", PATH, 100, severity, "Home to School", UUID.randomUUID(),
                UUID.randomUUID(), "School", "SCHOOL", OWNER, "Asia/Dhaka", IMEI, List.of(7, 1, 2, 3, 4), null, 0,
                LocalTime.of(6, 0), LocalTime.of(8, 0), false, null, "Home", atHome, leftHomeAt);
    }

    @Test
    void aRouteWithItsOwnHoursIsWatchedWithoutAnyExpectedTime() {
        service.refresh(List.of(named("CRITICAL", null, null)), NOW);                 // 06:30, inside 06:00-08:00
        assertThat(service.watchedImeis()).containsExactly(IMEI);
        service.refresh(List.of(named("CRITICAL", null, null)), NOW.plusSeconds(2 * 3600));   // 08:30
        assertThat(service.watchedImeis()).isEmpty();
        service.refresh(List.of(named("CRITICAL", null, null)), Instant.parse("2026-10-23T00:30:00Z"));   // Friday
        assertThat(service.watchedImeis()).isEmpty();
    }

    @Test
    void theAlertCarriesTheLevelAndTheNameTheParentChose() {
        service.refresh(List.of(named("CRITICAL", null, null)), NOW);
        service.onFix(IMEI, 23.7460, 90.3705, NOW, null);
        service.onFix(IMEI, 23.7490, 90.3740, NOW.plusSeconds(10), null);
        service.onFix(IMEI, 23.7495, 90.3750, NOW.plusSeconds(130), null);
        ArgumentCaptor<Map<String, Object>> meta = ArgumentCaptor.captor();
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.ROUTE_DEVIATION), eq(AlarmSeverity.CRITICAL), any(),
                anyDouble(), anyDouble(), meta.capture());
        assertThat(meta.getValue()).containsEntry("routeName", "Home to School").containsEntry("otherPlaceName", "Home");

        service.onFix(IMEI, 23.7461, 90.3770, NOW.plusSeconds(300), null);
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.BACK_ON_ROUTE), eq(AlarmSeverity.INFO), any(),
                anyDouble(), anyDouble(), any());
    }

    @Test
    void leftHomeAndNeverOnTheLineIsToldAsNotTaken() {
        Instant left = NOW.minusSeconds(60);
        service.refresh(List.of(named("WARNING", false, left)), NOW);
        // driven north from the gate: never within 100 m of the street to school
        service.onFix(IMEI, 23.7500, 90.3700, NOW.plusSeconds(150), null);     // 3.5 min after leaving, ~445 m off
        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
        service.onFix(IMEI, 23.7540, 90.3700, NOW.plusSeconds(250), null);
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.ROUTE_NOT_TAKEN), eq(AlarmSeverity.WARNING), any(),
                anyDouble(), anyDouble(), any());
        service.onFix(IMEI, 23.7580, 90.3700, NOW.plusSeconds(350), null);     // told once
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.ROUTE_NOT_TAKEN), any(), any(), anyDouble(), anyDouble(), any());
    }

    @Test
    void stillAtHomeIsNotANotTakenRoute() {
        service.refresh(List.of(named("WARNING", true, NOW.minusSeconds(3600))), NOW);
        service.onFix(IMEI, 23.7500, 90.3700, NOW.plusSeconds(300), null);
        service.onFix(IMEI, 23.7540, 90.3700, NOW.plusSeconds(400), null);
        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    private com.webinnovation.eyeon.domain.Geofence place(UUID id, String kind) {
        var g = mock(com.webinnovation.eyeon.domain.Geofence.class);
        when(g.kind()).thenReturn(kind);
        return g;
    }

    private PlaceRouteService.Input input(List<Integer> days, String from, String to, String severity, UUID other) {
        return new PlaceRouteService.Input("TO", "  Home to School ", "WALK", PATH, PATH, 150, other, days, from, to, severity);
    }

    @Test
    void savingChecksDaysHoursLevelAndTheOtherPlace() {
        UUID org = UUID.randomUUID(), school = UUID.randomUUID(), home = UUID.randomUUID(), boundary = UUID.randomUUID();
        var schoolPlace = place(school, "TRUSTED_PLACE");
        var homePlace = place(home, "TRUSTED_PLACE");
        var boundaryZone = place(boundary, "BOUNDARY");
        when(geofences.getOrThrow(org, OWNER, school)).thenReturn(schoolPlace);
        when(geofences.getOrThrow(org, OWNER, home)).thenReturn(homePlace);
        when(geofences.getOrThrow(org, OWNER, boundary)).thenReturn(boundaryZone);
        UUID id = UUID.randomUUID();
        when(repo.insert(eq(org), eq(school), any())).thenReturn(id);
        when(repo.find(school, id)).thenReturn(java.util.Optional.of(mock(PlaceRouteRepository.Route.class)));

        service.create(org, OWNER, school, input(List.of(4, 1, 1), "07:00", "08:30", "critical", home));
        ArgumentCaptor<PlaceRouteRepository.Fields> saved = ArgumentCaptor.captor();
        verify(repo).insert(eq(org), eq(school), saved.capture());
        assertThat(saved.getValue().name()).isEqualTo("Home to School");
        assertThat(saved.getValue().weekdays()).containsExactly(1, 4);
        assertThat(saved.getValue().timeFrom()).isEqualTo(LocalTime.of(7, 0));
        assertThat(saved.getValue().severity()).isEqualTo("CRITICAL");
        assertThat(saved.getValue().otherGeofenceId()).isEqualTo(home);

        assertThatThrownBy(() -> service.create(org, OWNER, school, input(List.of(1), "09:00", "08:00", null, null)))
                .hasMessageContaining("timeFrom must be before timeTo");
        assertThatThrownBy(() -> service.create(org, OWNER, school, input(List.of(1), "07:00", null, null, null)))
                .hasMessageContaining("go together");
        assertThatThrownBy(() -> service.create(org, OWNER, school, input(List.of(8), "07:00", "08:00", null, null)))
                .hasMessageContaining("weekdays");
        assertThatThrownBy(() -> service.create(org, OWNER, school, input(List.of(1), "07:00", "08:00", "LOUD", null)))
                .hasMessageContaining("severity");
        assertThatThrownBy(() -> service.create(org, OWNER, school, input(List.of(1), "07:00", "08:00", null, school)))
                .hasMessageContaining("same place");
        assertThatThrownBy(() -> service.create(org, OWNER, school, input(List.of(1), "07:00", "08:00", null, boundary)))
                .hasMessageContaining("trusted place");
    }

    @Test
    void anOldAppSavingByDirectionKeepsTheRoutesNameDaysAndLevel() {
        UUID org = UUID.randomUUID(), school = UUID.randomUUID(), id = UUID.randomUUID();
        var schoolPlace = place(school, "TRUSTED_PLACE");
        when(geofences.getOrThrow(org, OWNER, school)).thenReturn(schoolPlace);
        var old = new PlaceRouteRepository.Route(id, school, "TO", "WALK", PATH, PATH, 100, true, NOW, "Home to School",
                null, List.of(1, 2), LocalTime.of(7, 0), LocalTime.of(8, 0), "CRITICAL");
        when(repo.listForGeofence(school)).thenReturn(List.of(old));
        when(repo.update(eq(school), eq(id), any())).thenReturn(1);
        when(repo.find(school, id)).thenReturn(java.util.Optional.of(old));

        service.saveByDirection(org, OWNER, school, "to", "VEHICLE", PATH, PATH, 200);
        ArgumentCaptor<PlaceRouteRepository.Fields> saved = ArgumentCaptor.captor();
        verify(repo).update(eq(school), eq(id), saved.capture());
        assertThat(saved.getValue().widthM()).isEqualTo(200);
        assertThat(saved.getValue().name()).isEqualTo("Home to School");
        assertThat(saved.getValue().weekdays()).containsExactly(1, 2);
        assertThat(saved.getValue().severity()).isEqualTo("CRITICAL");
    }

    @Test
    void offTheRouteForTwoMinutesAlertsTheOwnerThenBackOnRoute() {
        service.refresh(List.of(route), NOW);
        assertThat(service.watchedImeis()).containsExactly(IMEI);

        service.onFix(IMEI, 23.7460, 90.3705, NOW, null);                     // at home, on the line
        service.onFix(IMEI, 23.7490, 90.3740, NOW.plusSeconds(10), null);     // ~330 m north
        service.onFix(IMEI, 23.7495, 90.3750, NOW.plusSeconds(130), null);
        ArgumentCaptor<Map<String, Object>> meta = ArgumentCaptor.captor();
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.ROUTE_DEVIATION), eq(AlarmSeverity.WARNING), any(),
                anyDouble(), anyDouble(), meta.capture());
        assertThat(meta.getValue()).containsEntry(AlarmRepository.GEOFENCE_OWNER_KEY, OWNER.toString())
                .containsEntry("direction", "TO").containsEntry("geofenceName", "School");

        service.onFix(IMEI, 23.7461, 90.3770, NOW.plusSeconds(300), null);
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.BACK_ON_ROUTE), eq(AlarmSeverity.INFO), any(),
                anyDouble(), anyDouble(), any());
    }

    @Test
    void aRunningTripSurvivesTheNextSweep() {
        service.refresh(List.of(route), NOW);
        service.onFix(IMEI, 23.7460, 90.3705, NOW, null);
        service.refresh(List.of(route), NOW.plusSeconds(60));
        service.onFix(IMEI, 23.7490, 90.3740, NOW.plusSeconds(70), null);
        service.onFix(IMEI, 23.7495, 90.3750, NOW.plusSeconds(200), null);
        verify(alarms).raise(any(), eq(IMEI), eq(AlarmType.ROUTE_DEVIATION), any(), any(), anyDouble(), anyDouble(), any());
    }

    @Test
    void notWatchedOnADayWithoutTheSchedule() {
        Instant friday = Instant.parse("2026-10-23T00:30:00Z");
        service.refresh(List.of(route), friday);
        assertThat(service.watchedImeis()).isEmpty();
    }

    @Test
    void coarseNetworkPositionsAreIgnored() {
        service.refresh(List.of(route), NOW);
        service.onFix(IMEI, 23.7460, 90.3705, NOW, null);
        service.onFix(IMEI, 23.7490, 90.3740, NOW.plusSeconds(10), 120);
        service.onFix(IMEI, 23.7495, 90.3750, NOW.plusSeconds(200), 120);
        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void snapFallsBackToStraightLinesWithoutTheRoadService() {
        when(roads.route(any(), eq("foot"))).thenReturn(java.util.Optional.empty());
        var s = service.snap(PATH, "WALK");
        assertThat(s.roads()).isFalse();
        assertThat(s.path()).isEqualTo(PATH);
        assertThat(s.lengthM()).isBetween(1100.0, 1130.0);
    }

    @Test
    void snapRejectsTooFewPoints() {
        assertThatThrownBy(() -> service.snap(List.of(new Pt(23.7, 90.4)), "VEHICLE"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
