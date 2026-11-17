package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository.Due;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** One schedule, one child, through the morning: on time, probe, alert once, late. */
class ExpectedTimeServiceTest {

    private static final String IMEI = "868322070079370";
    // Sunday 2026-10-04, 08:15 in Dhaka.
    private static final Instant DEADLINE = Instant.parse("2026-10-04T02:15:00Z");
    private static final LocalDate DAY = LocalDate.of(2026, 10, 4);

    private final UUID orgId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();
    private final UUID scheduleId = UUID.randomUUID();
    private final UUID placeId = UUID.randomUUID();
    private final String key = "schedule:" + scheduleId;

    private PlaceScheduleRepository repo;
    private AlarmService alarms;
    private DeviceCommandService commands;
    private ExpectedTimeService service;
    private GeofenceService geofences;
    private com.webinnovation.eyeon.repository.TrackerSettingsRepository restRepo;

    @BeforeEach
    void setUp() {
        restRepo = mock(com.webinnovation.eyeon.repository.TrackerSettingsRepository.class);
        when(restRepo.restWindows(any())).thenReturn(Map.of());
        repo = mock(PlaceScheduleRepository.class);
        alarms = mock(AlarmService.class);
        commands = mock(DeviceCommandService.class);
        DeviceRepository devices = mock(DeviceRepository.class);
        when(devices.findByImei(IMEI)).thenReturn(Optional.empty());
        geofences = mock(GeofenceService.class);
        service = new ExpectedTimeService(repo, geofences, alarms, devices, commands, restRepo);
    }

    @Test
    void the_same_expected_time_cannot_be_added_twice_to_a_place() {
        com.webinnovation.eyeon.domain.Geofence place = mock(com.webinnovation.eyeon.domain.Geofence.class);
        when(place.kind()).thenReturn("TRUSTED_PLACE");
        when(geofences.getOrThrow(orgId, ownerId, placeId)).thenReturn(place);
        UUID newId = UUID.randomUUID();
        var existing = new PlaceScheduleRepository.Schedule(scheduleId, placeId, "ARRIVE_BY", LocalTime.of(8, 15),
                List.of(1, 2, 3, 4, 7), 10, true, Instant.now());
        var added = new PlaceScheduleRepository.Schedule(newId, placeId, "LEAVE_BY", LocalTime.of(8, 15),
                List.of(1, 2, 3, 4, 7), 10, true, Instant.now());
        java.util.concurrent.atomic.AtomicBoolean inserted = new java.util.concurrent.atomic.AtomicBoolean();
        when(repo.listForGeofence(placeId))
                .thenAnswer(inv -> inserted.get() ? List.of(existing, added) : List.of(existing));
        when(repo.insert(any(), any(), anyString(), any(), any(), anyInt())).thenAnswer(inv -> {
            inserted.set(true);
            return newId;
        });

        // Same kind, time and days (in another order, with another grace): refused with its own code.
        var duplicate = org.junit.jupiter.api.Assertions.assertThrows(
                com.webinnovation.eyeon.exception.DomainException.class,
                () -> service.create(orgId, ownerId, placeId, "arrive_by", "08:15", List.of(7, 1, 2, 3, 4, 4), 0));
        assertEquals("DUPLICATE_SCHEDULE", duplicate.getCode());
        verify(repo, never()).insert(any(), any(), anyString(), any(), any(), anyInt());

        // Another kind at the same time is a different expectation.
        assertEquals(newId, service.create(orgId, ownerId, placeId, "LEAVE_BY", "08:15", List.of(1, 2, 3, 4, 7), 10).id());
    }

    private Due row(String kind, Boolean inside) {
        return row(kind, inside, null);
    }

    private Due row(String kind, Boolean inside, Instant changedAt) {
        return new Due(scheduleId, kind, LocalTime.of(8, 15), List.of(7, 1, 2, 3, 4), 0, placeId, orgId,
                "School", "SCHOOL", ownerId, "Asia/Dhaka", IMEI, inside, changedAt);
    }

    @Test
    void at_the_deadline_a_missing_child_triggers_a_probe_not_an_alert() {
        when(repo.claimCheck(key, IMEI, DAY, "PROBED")).thenReturn(true);
        when(commands.isOnline(IMEI)).thenReturn(true);

        service.evaluate(row("ARRIVE_BY", false), DEADLINE.plusSeconds(20));

        verify(commands).liveTracking(orgId, IMEI, 120);
        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void still_missing_after_the_grace_period_alerts_the_owner_once() {
        when(repo.checkStatus(key, IMEI, DAY)).thenReturn("PROBED");

        service.evaluate(row("ARRIVE_BY", false), DEADLINE.plus(ExpectedTimeCheck.MIN_PROBE).plusSeconds(5));

        verify(repo).setCheck(key, IMEI, DAY, "ALERTED");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> meta = ArgumentCaptor.forClass(Map.class);
        verify(alarms).raise(eq(orgId), eq(IMEI), eq(AlarmType.NOT_ARRIVED), eq(AlarmSeverity.WARNING),
                eq(DEADLINE.plus(ExpectedTimeCheck.MIN_PROBE)), any(), any(), meta.capture());
        assertEquals("School", meta.getValue().get("geofenceName"));
        assertEquals("08:15", meta.getValue().get("expectedTime"));
        // The place is the parent's own: only they are told.
        assertEquals(ownerId.toString(), meta.getValue().get(AlarmRepository.GEOFENCE_OWNER_KEY));
    }

    @Test
    void arriving_during_the_grace_period_sends_the_on_time_message() {
        when(repo.checkStatus(key, IMEI, DAY)).thenReturn("PROBED");
        Instant arrived = DEADLINE.plusSeconds(120);

        service.evaluate(row("ARRIVE_BY", true, arrived), DEADLINE.plusSeconds(180));

        verify(repo).setCheck(key, IMEI, DAY, "OK_SENT");
        verify(alarms).raise(eq(orgId), eq(IMEI), eq(AlarmType.ARRIVED_ON_TIME), eq(AlarmSeverity.INFO),
                eq(arrived), any(), any(), any());
    }

    @Test
    void arriving_after_the_alert_sends_a_late_message() {
        when(repo.checkStatus(key, IMEI, DAY)).thenReturn("ALERTED");
        Instant arrived = DEADLINE.plusSeconds(1500);

        service.evaluate(row("ARRIVE_BY", true, arrived), arrived.plusSeconds(30));

        verify(repo).setCheck(key, IMEI, DAY, "LATE");
        verify(alarms).raise(eq(orgId), eq(IMEI), eq(AlarmType.ARRIVED_LATE), eq(AlarmSeverity.INFO),
                eq(arrived), any(), any(), any());
    }

    @Test
    void an_alert_already_sent_today_is_not_repeated() {
        when(repo.checkStatus(key, IMEI, DAY)).thenReturn("ALERTED");

        service.evaluate(row("ARRIVE_BY", false), DEADLINE.plusSeconds(600));

        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
        verify(commands, never()).liveTracking(any(), anyString(), anyInt());
    }

    @Test
    void still_at_coaching_after_the_leaving_time_raises_not_left() {
        service.evaluate(row("LEAVE_BY", true, DEADLINE.minusSeconds(3600)), DEADLINE.plus(ExpectedTimeCheck.MIN_PROBE).plusSeconds(5));

        verify(alarms).raise(eq(orgId), eq(IMEI), eq(AlarmType.NOT_LEFT), eq(AlarmSeverity.WARNING),
                eq(DEADLINE.plus(ExpectedTimeCheck.MIN_PROBE)), any(), any(), any());
    }

    @Test
    void a_deadline_inside_the_trackers_night_rest_is_not_checked() {
        // Resting 00:00-09:00: at 08:15 the tracker is switched off and cannot say where it is.
        when(restRepo.restWindows(orgId)).thenReturn(Map.of(IMEI,
                new com.webinnovation.eyeon.repository.TrackerSettingsRepository.Window(LocalTime.MIDNIGHT, LocalTime.of(9, 0), "Asia/Dhaka")));

        service.evaluate(row("ARRIVE_BY", false), DEADLINE.plus(ExpectedTimeCheck.MIN_PROBE).plusSeconds(5));

        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
        verify(repo, never()).setCheck(anyString(), anyString(), any(), anyString());
    }

    @Test
    void nothing_happens_before_the_deadline_or_on_another_weekday() {
        service.evaluate(row("ARRIVE_BY", false), DEADLINE.minusSeconds(60));
        // Friday 2026-10-02, same local time.
        service.evaluate(row("ARRIVE_BY", false), Instant.parse("2026-10-02T02:20:00Z"));

        verify(repo, never()).checkStatus(anyString(), anyString(), any());
        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }
}
