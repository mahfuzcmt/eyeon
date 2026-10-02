package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository.BatteryRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Evening "charge it tonight" and morning "may not last the day", once a day, never while charging. */
class BatteryReminderServiceTest {

    private static final String IMEI = "868322070079370";
    private static final Instant EVENING = Instant.parse("2026-10-04T15:05:00Z");   // 21:05 in Dhaka
    private static final Instant MORNING = Instant.parse("2026-10-05T01:10:00Z");   // 07:10 in Dhaka
    private static final Instant NOON = Instant.parse("2026-10-04T06:00:00Z");

    private final UUID orgId = UUID.randomUUID();
    private PlaceScheduleRepository repo;
    private AlarmService alarms;
    private DeviceCommandService commands;
    private BatteryReminderService service;

    @BeforeEach
    void setUp() {
        repo = mock(PlaceScheduleRepository.class);
        alarms = mock(AlarmService.class);
        commands = mock(DeviceCommandService.class);
        when(repo.claimCheck(anyString(), eq(IMEI), any(), anyString())).thenReturn(true);
        service = new BatteryReminderService(repo, alarms, commands);
    }

    private BatteryRow battery(int percent) {
        return new BatteryRow(orgId, IMEI, percent, 23.75, 90.39, "Asia/Dhaka");
    }

    @Test
    void low_in_the_evening_is_a_calm_reminder() {
        service.evaluate(battery(30), EVENING);

        verify(repo).claimCheck("battery:evening", IMEI, LocalDate.of(2026, 10, 4), "ALERTED");
        verify(alarms).raise(eq(orgId), eq(IMEI), eq(AlarmType.CHARGE_REMINDER), eq(AlarmSeverity.INFO),
                eq(EVENING), any(), any(), any());
    }

    @Test
    void low_in_the_morning_is_a_warning() {
        service.evaluate(battery(20), MORNING);

        verify(repo).claimCheck("battery:morning", IMEI, LocalDate.of(2026, 10, 5), "ALERTED");
        verify(alarms).raise(eq(orgId), eq(IMEI), eq(AlarmType.CHARGE_REMINDER), eq(AlarmSeverity.WARNING),
                eq(MORNING), any(), any(), any());
    }

    @Test
    void a_healthy_battery_or_another_time_of_day_is_left_alone() {
        service.evaluate(battery(85), EVENING);
        service.evaluate(battery(10), NOON);

        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void a_tracker_on_the_charger_is_not_nagged() {
        when(commands.isOnline(IMEI)).thenReturn(true);
        when(commands.sendRaw(orgId, IMEI, "BMT#"))
                .thenReturn(CompletableFuture.completedFuture("Charger In:vBat=3.69,iChr=0.00,vChr=0.00, Percent:15"));

        service.evaluate(battery(15), EVENING);

        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void only_one_reminder_per_slot_per_day() {
        when(repo.claimCheck(anyString(), eq(IMEI), any(), anyString())).thenReturn(false);

        service.evaluate(battery(30), EVENING);

        verify(alarms, never()).raise(any(), anyString(), any(), any(), any(), any(), any(), any());
    }
}
