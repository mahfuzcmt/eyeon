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
    private Watchable route;

    @BeforeEach
    void setUp() {
        alarms = mock(AlarmService.class);
        roads = mock(RoadMatcher.class);
        service = new PlaceRouteService(mock(PlaceRouteRepository.class), mock(GeofenceService.class), roads, alarms);
        route = new Watchable(UUID.randomUUID(), "TO", PATH, 100, UUID.randomUUID(), UUID.randomUUID(), "School",
                "SCHOOL", OWNER, "Asia/Dhaka", IMEI, LocalTime.of(7, 0), List.of(7, 1, 2, 3, 4), 5, false, null);
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
