package com.webinnovation.eyeon.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.LocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
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
                mock(LocationBufferService.class),
                new ParkedJitterFilter(),
                mock(org.springframework.beans.factory.ObjectProvider.class));
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
                eq("866557085765354"), eq(12340), eq(4), any(), any());
        verify(deviceRepo, never()).updateLastPosition(
                anyString(), anyDouble(), anyDouble(), anyInt(), anyInt(),
                any(), any(), any(), any());
    }

    /**
     * A tracker without a fix (new, indoors) or replaying buffered points stamps its packets
     * with an old time. last_seen_at must be the server's receive time, otherwise
     * DeviceStatusJob marks a connected tracker OFFLINE on its next sweep.
     */
    @Test
    void lastSeenIsServerReceiveTimeNotThePacketClock() {
        Instant before = Instant.now();

        service.saveAndBroadcast(packet(false));
        service.saveAndBroadcast(packet(true));

        ArgumentCaptor<Instant> noFixSeen = ArgumentCaptor.forClass(Instant.class);
        verify(deviceRepo).updateLastTelemetryNoFix(anyString(), any(), any(), any(), noFixSeen.capture());
        ArgumentCaptor<Instant> fixSeen = ArgumentCaptor.forClass(Instant.class);
        verify(deviceRepo).updateLastPosition(
                anyString(), anyDouble(), anyDouble(), anyInt(), anyInt(),
                any(), any(), any(), fixSeen.capture());

        assertFalse(noFixSeen.getValue().isBefore(before));
        assertFalse(fixSeen.getValue().isBefore(before));
    }

    /**
     * A position resolved from a Wi-Fi scan has no satellites. The "fewer than 4 satellites is
     * not a fix" rule is about GPS and must not demote it, or an indoor tracker never gets a marker.
     */
    @Test
    void wifiPositionAdvancesTheDeviceDespiteHavingNoSatellites() {
        LocationData d = packet(true);
        d.setSatellites(0);
        d.setPositionSource("WIFI");
        d.setAccuracyMeters(35);

        service.saveAndBroadcast(d);

        verify(deviceRepo).updateLastPosition(
                eq("866557085765354"), anyDouble(), anyDouble(), anyInt(), anyInt(),
                any(), any(), any(), any());
    }
}
