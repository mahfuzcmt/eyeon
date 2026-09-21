package com.webinnovation.motolink.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.motolink.protocol.LocationData;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.LocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Hot-path behaviour for the fix-gating rule: a location packet without a GPS fix
 * must never advance the device's last-known position (CLAUDE.md §3.2 rule 1 still
 * requires the raw row itself to be persisted either way).
 */
class LocationServiceTest {

    private LocationRepository locationRepo;
    private DeviceRepository deviceRepo;
    private LocationService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        locationRepo = mock(LocationRepository.class);
        deviceRepo = mock(DeviceRepository.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenReturn(mock(ValueOperations.class));

        service = new LocationService(
                locationRepo,
                deviceRepo,
                redis,
                new ObjectMapper(),
                mock(GeofenceService.class),
                mock(TripService.class),
                mock(AlarmRuleService.class),
                mock(CellLocationService.class),
                mock(LocationBufferService.class));
    }

    private static LocationData packet(boolean valid) {
        LocationData d = new LocationData();
        d.setImei("866557085765354");
        d.setOrgId(UUID.randomUUID());
        d.setTimestamp(Instant.parse("2026-08-14T11:27:45Z"));
        d.setLatitude(22.331244);
        d.setLongitude(91.83448);
        d.setSpeed(0);
        d.setCourse(319);
        d.setSatellites(valid ? 12 : 3);
        d.setValid(valid);
        d.setVoltageMv(12340);
        d.setGsmSignal(4);
        return d;
    }

    @Test
    void validFixAdvancesDevicePosition() {
        service.saveAndBroadcast(packet(true));

        verify(locationRepo).insert(any());
        verify(deviceRepo).updateLastPosition(
                eq("866557085765354"), anyDouble(), anyDouble(), anyInt(), anyInt(),
                any(), any(), any(), any());
        verify(deviceRepo, never()).updateLastTelemetryNoFix(
                anyString(), any(), any(), any(), any());
    }

    @Test
    void noFixRefreshesTelemetryButLeavesPositionAlone() {
        service.saveAndBroadcast(packet(false));

        // The row is still stored — history and diagnostics need the raw packet.
        verify(locationRepo).insert(any());
        verify(deviceRepo).updateLastTelemetryNoFix(
                eq("866557085765354"), eq(12340), eq(4), any(), eq(Instant.parse("2026-08-14T11:27:45Z")));
        verify(deviceRepo, never()).updateLastPosition(
                anyString(), anyDouble(), anyDouble(), anyInt(), anyInt(),
                any(), any(), any(), any());
    }
}
