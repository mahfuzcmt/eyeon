package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.AlarmRule;
import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.enums.AlarmType;
import com.webinnovation.motolink.repository.AlarmRuleRepository;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.LocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
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

class AlarmRuleStateTest {

    private AlarmRuleRepository ruleRepo;
    private AlarmService alarmService;
    private DeviceRepository deviceRepo;
    private LocationRepository locationRepo;
    private AlarmRuleService service;
    private DeviceAccessService access;
    private final UUID orgId = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-09-16T10:00:00Z");

    @BeforeEach
    void setUp() {
        ruleRepo = mock(AlarmRuleRepository.class);
        alarmService = mock(AlarmService.class);
        deviceRepo = mock(DeviceRepository.class);
        locationRepo = mock(LocationRepository.class);
        access = mock(DeviceAccessService.class);
        when(access.visibleImeis(any())).thenReturn(null);
        service = new AlarmRuleService(ruleRepo, alarmService, deviceRepo, locationRepo, access);
        when(ruleRepo.tryFire(any(), anyString(), anyInt(), any())).thenReturn(true);
    }

    private AlarmRule rule(String type, double minutes) {
        return new AlarmRule(UUID.randomUUID(), orgId, UUID.randomUUID(), "r", type, minutes, null, null, 3600, "WARNING",
                true, true, now, now);
    }

    private Device device(String status, Instant lastSeen, Integer speed) {
        return new Device(UUID.randomUUID(), orgId, null, "864290061234567", "Bike", null, null, "DHK-1",
                "MOTORBIKE", "GT06", null, null, status, lastSeen, 23.8, 90.4, speed, 0, 12000, 4, 0,
                null, false, now, now);
    }

    @Test
    void offlineTimeoutFiresOnceDeviceHasBeenSilentLongEnough() {
        when(deviceRepo.listForOrg(orgId)).thenReturn(List.of(device("OFFLINE", now.minusSeconds(45 * 60), 0)));
        service.evaluateStateRule(rule("OFFLINE_TIMEOUT", 30), now);
        ArgumentCaptor<AlarmType> type = ArgumentCaptor.forClass(AlarmType.class);
        verify(alarmService).raise(eq(orgId), eq("864290061234567"), type.capture(), any(), any(), any(), any(), any());
        assertEquals(AlarmType.OFFLINE_TIMEOUT, type.getValue());
    }

    @Test
    void offlineTimeoutStaysQuietWhileOnlineOrWithinLimit() {
        when(deviceRepo.listForOrg(orgId)).thenReturn(List.of(
                device("ONLINE", now.minusSeconds(3600), 0),
                device("OFFLINE", now.minusSeconds(10 * 60), 0)));
        service.evaluateStateRule(rule("OFFLINE_TIMEOUT", 30), now);
        verify(alarmService, never()).raise(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void parkingTimeoutUsesLastMovementNotLastPacket() {
        when(deviceRepo.listForOrg(orgId)).thenReturn(List.of(device("ONLINE", now.minusSeconds(60), 0)));
        when(locationRepo.lastMovingAt("864290061234567")).thenReturn(Optional.of(now.minusSeconds(2 * 3600)));
        service.evaluateStateRule(rule("PARKING_TIMEOUT", 90), now);
        ArgumentCaptor<Map<String, Object>> meta = ArgumentCaptor.forClass(Map.class);
        verify(alarmService).raise(eq(orgId), eq("864290061234567"), eq(AlarmType.PARKING_TIMEOUT), any(), any(), any(), any(), meta.capture());
        assertEquals(120L, meta.getValue().get("durationMinutes"));
    }

    @Test
    void idleTimeoutRequiresIgnitionOn() {
        when(deviceRepo.listForOrg(orgId)).thenReturn(List.of(device("ONLINE", now.minusSeconds(60), 0)));
        when(locationRepo.lastMovingAt(anyString())).thenReturn(Optional.of(now.minusSeconds(3600)));
        when(locationRepo.lastAccOn(anyString())).thenReturn(Optional.of(false));
        service.evaluateStateRule(rule("IDLE_TIMEOUT", 15), now);
        verify(alarmService, never()).raise(any(), any(), any(), any(), any(), any(), any(), any());

        when(locationRepo.lastAccOn(anyString())).thenReturn(Optional.of(true));
        service.evaluateStateRule(rule("IDLE_TIMEOUT", 15), now);
        verify(alarmService).raise(eq(orgId), anyString(), eq(AlarmType.ENGINE_IDLE), any(), any(), any(), any(), any());
    }
}
