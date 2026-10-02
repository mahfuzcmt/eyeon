package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.protocol.NetworkScan;
import com.webinnovation.eyeon.service.CellLocationService.CellLocation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Indoor positions from Wi-Fi / cell scans. The rules that matter: a usable Wi-Fi estimate is
 * stored like a fix, and a tracker that stays put does not cost a geolocation request every
 * ten seconds.
 */
class NetworkLocationServiceTest {

    private static final String IMEI = "868322070079370";
    private final UUID orgId = UUID.randomUUID();

    private CellLocationService geolocation;
    private LocationService locationService;
    private DeviceService deviceService;
    private NetworkLocationService service;

    @BeforeEach
    void setUp() {
        geolocation = mock(CellLocationService.class);
        locationService = mock(LocationService.class);
        deviceService = mock(DeviceService.class);
        when(geolocation.canLocateScans()).thenReturn(true);
        service = new NetworkLocationService(geolocation, locationService, deviceService);
    }

    private static NetworkScan scan(String... macs) {
        List<NetworkScan.Wifi> wifi = Arrays.stream(macs).map(m -> new NetworkScan.Wifi(m, -60)).toList();
        return new NetworkScan(Instant.parse("2026-10-01T06:46:38Z"), 470, 2, "lte",
                List.of(new NetworkScan.Cell(48111, 33526800L, 55)), wifi);
    }

    private static CellLocation at(double lat, double lng, int accuracy) {
        CellLocation c = new CellLocation();
        c.setLatitude(lat);
        c.setLongitude(lng);
        c.setAccuracyMeters(accuracy);
        c.setSource("google");
        return c;
    }

    @Test
    void a_precise_wifi_estimate_is_stored_like_a_fix() {
        when(geolocation.locate(any())).thenReturn(Optional.of(at(23.7806, 90.4074, 35)));

        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb", "cc"), new byte[] {1});

        ArgumentCaptor<LocationData> saved = ArgumentCaptor.forClass(LocationData.class);
        verify(locationService).saveAndBroadcast(saved.capture());
        LocationData loc = saved.getValue();
        assertTrue(loc.isValid());
        assertEquals("WIFI", loc.getPositionSource());
        assertEquals(35, loc.getAccuracyMeters());
        assertEquals(23.7806, loc.getLatitude());
        assertEquals(Instant.parse("2026-10-01T06:46:38Z"), loc.getTimestamp());
        assertEquals(33526800L, loc.getCellId());
        assertEquals(orgId, loc.getOrgId());
    }

    @Test
    void a_coarse_estimate_is_stored_as_approximate() {
        when(geolocation.locate(any())).thenReturn(Optional.of(at(23.78, 90.40, 1400)));

        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb"), new byte[0]);

        ArgumentCaptor<LocationData> saved = ArgumentCaptor.forClass(LocationData.class);
        verify(locationService).saveAndBroadcast(saved.capture());
        assertFalse(saved.getValue().isValid());
        assertEquals("LBS", saved.getValue().getPositionSource());
    }

    @Test
    void a_tracker_that_stays_put_reuses_the_position_without_asking_again() {
        when(geolocation.locate(any())).thenReturn(Optional.of(at(23.7806, 90.4074, 35)));

        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb", "cc", "dd"), new byte[0]);
        // Ten seconds later: two access points dropped out, a new one appeared.
        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb", "ee"), new byte[0]);

        verify(geolocation, times(1)).locate(any());
        verify(locationService, times(2)).saveAndBroadcast(any());
    }

    @Test
    void new_surroundings_within_the_minimum_interval_only_refresh_presence() {
        when(geolocation.locate(any())).thenReturn(Optional.of(at(23.7806, 90.4074, 35)));

        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb", "cc"), new byte[0]);
        service.onScan(IMEI, orgId, 0xA2, scan("xx", "yy", "zz"), new byte[0]);

        verify(geolocation, times(1)).locate(any());
        verify(locationService, times(1)).saveAndBroadcast(any());
        verify(deviceService).markOnline(IMEI);
    }

    @Test
    void the_cell_only_twin_of_a_wifi_scan_is_not_resolved_separately() {
        when(geolocation.locate(any())).thenReturn(Optional.of(at(23.7806, 90.4074, 35)));

        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb", "cc"), new byte[0]);
        service.onScan(IMEI, orgId, 0xA1, scan(), new byte[0]);

        verify(geolocation, times(1)).locate(any());
        verify(locationService, times(1)).saveAndBroadcast(any());
        verify(deviceService).markOnline(IMEI);
    }

    @Test
    void without_a_geolocation_service_nothing_is_stored_but_the_tracker_stays_online() {
        when(geolocation.canLocateScans()).thenReturn(false);
        when(geolocation.locate(any())).thenReturn(Optional.empty());

        service.onScan(IMEI, orgId, 0xA2, scan("aa", "bb", "cc"), new byte[0]);

        verify(locationService, never()).saveAndBroadcast(any());
        verify(deviceService).markOnline(IMEI);
    }
}
