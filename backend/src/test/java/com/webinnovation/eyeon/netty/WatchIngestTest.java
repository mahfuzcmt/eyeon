package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.protocol.NetworkScan;
import com.webinnovation.eyeon.protocol.PacketType;
import com.webinnovation.eyeon.protocol.WatchReportTest;
import com.webinnovation.eyeon.service.AlarmService;
import com.webinnovation.eyeon.service.DeviceService;
import com.webinnovation.eyeon.service.LocationService;
import com.webinnovation.eyeon.service.NetworkLocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.core.task.support.TaskExecutorAdapter;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * A smart watch's frames, read off the relay, become a device with presence, battery,
 * locations and alarms. Payloads are the ones a real watch sent to production.
 */
class WatchIngestTest {

    private static final String WATCH_ID = "1378748302";
    private static final String FULL_IMEI = "355913787483028";
    private static final UUID ORG = UUID.randomUUID();

    private DeviceService deviceService;
    private LocationService locationService;
    private AlarmService alarmService;
    private NetworkLocationService networkLocationService;
    private WatchIngest.Connection watch;

    @BeforeEach
    void setUp() {
        deviceService = mock(DeviceService.class);
        locationService = mock(LocationService.class);
        alarmService = mock(AlarmService.class);
        networkLocationService = mock(NetworkLocationService.class);
        when(networkLocationService.onScan(anyString(), any(), anyInt(), any(), any(), anyBoolean()))
                .thenReturn(Optional.empty());
        // frames are handled on the calling thread, so every assertion below sees a finished frame
        WatchIngest ingest = new WatchIngest(deviceService, locationService, alarmService, networkLocationService,
                new TaskExecutorAdapter(Runnable::run));
        watch = ingest.open("/37.111.212.151:40112");
    }

    private Device knownAs(String imei) {
        Device d = mock(Device.class);
        when(d.imei()).thenReturn(imei);
        when(d.orgId()).thenReturn(ORG);
        return d;
    }

    private void send(String content) {
        send(WATCH_ID, content);
    }

    private void send(String id, String content) {
        watch.onBytes(String.format("[3G*%s*%04X*%s]", id, content.length(), content).getBytes(StandardCharsets.ISO_8859_1));
    }

    @Test
    void anUnknownWatchIsAutoRegisteredUnderItsIdOnceAndShownOnline() {
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.empty());
        Device created = knownAs(WATCH_ID);
        when(deviceService.autoRegister(WATCH_ID)).thenReturn(created);

        send("CONFIG,TY:g601x,UL:10");
        send("RYIMEI," + FULL_IMEI);
        send("LK,0,0,57");

        verify(deviceService, times(1)).findByWatchId(WATCH_ID);
        verify(deviceService, times(1)).autoRegister(WATCH_ID);
        verify(deviceService).applyHeartbeatStatus(WATCH_ID, null, 57, null);
        // the start-up messages carry nothing to store but prove the watch is connected
        verify(deviceService, times(3)).markOnline(WATCH_ID);
    }

    @Test
    void aWatchAddedByHandUnderItsFullImeiIsThatDevice() {
        Device byHand = knownAs(FULL_IMEI);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(byHand));

        send("LK,0,0,16");

        verify(deviceService, never()).autoRegister(anyString());
        verify(deviceService).applyHeartbeatStatus(FULL_IMEI, null, 16, null);
    }

    @Test
    void aGpsFixIsStoredThroughTheTrackerPath() {
        Device d = knownAs(WATCH_ID);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));

        send(WatchReportTest.FIX);

        ArgumentCaptor<LocationData> loc = ArgumentCaptor.forClass(LocationData.class);
        verify(locationService).saveAndBroadcast(loc.capture());
        LocationData l = loc.getValue();
        assertThat(l.getImei()).isEqualTo(WATCH_ID);
        assertThat(l.getOrgId()).isEqualTo(ORG);
        assertThat(l.isValid()).isTrue();
        assertThat(l.getLatitude()).isEqualTo(23.752181);
        assertThat(l.getLongitude()).isEqualTo(90.3841902);
        assertThat(l.getSpeed()).isEqualTo(4);
        assertThat(l.getCourse()).isEqualTo(341);
        assertThat(l.getSatellites()).isEqualTo(5);
        assertThat(l.getTimestamp()).isEqualTo(Instant.parse("2026-11-12T04:33:05Z"));
        assertThat(l.getPositionSource()).isNull();
        assertThat(l.getProtocolNumber()).isEqualTo(PacketType.WATCH_3G);
        assertThat(l.getMcc()).isEqualTo(470);
        assertThat(l.getCellId()).isEqualTo(25761547L);
        assertThat(new String(l.getRawPayload(), StandardCharsets.ISO_8859_1)).isEqualTo(WatchReportTest.FIX);
        verify(deviceService).applyHeartbeatStatus(WATCH_ID, 83, 50, null);
        verifyNoInteractions(networkLocationService, alarmService);
    }

    @Test
    void withoutAFixTheRepeatedCoordinatesAreNotStoredTheScanIsResolvedInstead() {
        Device d = knownAs(WATCH_ID);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));

        send(WatchReportTest.NO_FIX);

        verify(locationService, never()).saveAndBroadcast(any());
        ArgumentCaptor<NetworkScan> scan = ArgumentCaptor.forClass(NetworkScan.class);
        verify(networkLocationService).onScan(eq(WATCH_ID), eq(ORG), eq(PacketType.WATCH_3G), scan.capture(), any(), eq(false));
        assertThat(scan.getValue().radio()).isEqualTo("lte");
        assertThat(scan.getValue().mcc()).isEqualTo(470);
        assertThat(scan.getValue().cells()).containsExactly(new NetworkScan.Cell(1166, 3494914, 158));
        assertThat(scan.getValue().wifi()).hasSize(3);
        verify(deviceService).applyHeartbeatStatus(WATCH_ID, 77, 37, null);
    }

    @Test
    void lowBatteryAlarmIsRaisedAtTheResolvedPosition() {
        Device d = knownAs(WATCH_ID);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));
        LocationData resolved = new LocationData();
        resolved.setLatitude(23.7501);
        resolved.setLongitude(90.3899);
        when(networkLocationService.onScan(eq(WATCH_ID), eq(ORG), anyInt(), any(), any(), eq(true)))
                .thenReturn(Optional.of(resolved));

        send(WatchReportTest.LOW_BATTERY);

        verify(alarmService).raise(eq(ORG), eq(WATCH_ID), eq(AlarmType.LOW_BATTERY), eq(AlarmSeverity.WARNING),
                eq(Instant.parse("2026-11-12T20:27:46Z")), eq(23.7501), eq(90.3899), any());
        verify(alarmService, never()).raise(any(), any(), eq(AlarmType.SOS), any(), any(), any(), any(), any());
    }

    @Test
    void sosWithoutAnyPositionFallsBackToTheLastKnownOne() {
        Device d = knownAs(WATCH_ID);
        when(d.lastLatitude()).thenReturn(23.70);
        when(d.lastLongitude()).thenReturn(90.40);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));
        when(deviceService.findByImei(WATCH_ID)).thenReturn(Optional.of(d));

        send("AL,121126,202746,V,0.000000,N,0.0000000,E,0.00,0.0,0.0,0,61,80,0,0,00010000,0,0,0.0");

        verify(alarmService).raise(eq(ORG), eq(WATCH_ID), eq(AlarmType.SOS), eq(AlarmSeverity.CRITICAL),
                any(), eq(23.70), eq(90.40), any());
        verify(locationService, never()).saveAndBroadcast(any());
    }

    @Test
    void aReportStampedAheadOfNowIsStoredAtReceiveTime() {
        Device d = knownAs(WATCH_ID);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));
        Instant before = Instant.now();

        send(WatchReportTest.FIX.replace("121126,043305", "010199,000000"));  // 2099

        ArgumentCaptor<LocationData> loc = ArgumentCaptor.forClass(LocationData.class);
        verify(locationService).saveAndBroadcast(loc.capture());
        assertThat(loc.getValue().getTimestamp()).isBetween(before, Instant.now());
    }

    @Test
    void framesAreHandledInArrivalOrder() {
        Device d = knownAs(WATCH_ID);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));

        String a = WatchReportTest.FIX;
        String b = WatchReportTest.FIX.replace("043305", "043315").replace("23.752181", "23.752999");
        watch.onBytes(String.format("[3G*%s*%04X*%s][3G*%s*%04X*%s]", WATCH_ID, a.length(), a, WATCH_ID, b.length(), b)
                .getBytes(StandardCharsets.ISO_8859_1));

        ArgumentCaptor<LocationData> loc = ArgumentCaptor.forClass(LocationData.class);
        InOrder order = inOrder(locationService);
        order.verify(locationService, times(2)).saveAndBroadcast(loc.capture());
        assertThat(loc.getAllValues()).extracting(LocationData::getLatitude).containsExactly(23.752181, 23.752999);
    }

    @Test
    void aFailedLookupDoesNotRegisterAndIsNotRetriedOnEveryFrame() {
        when(deviceService.findByWatchId(WATCH_ID)).thenThrow(new IllegalStateException("database away"));

        send("LK,0,0,57");
        send("LK,0,0,57");
        send(WatchReportTest.FIX);

        verify(deviceService, times(1)).findByWatchId(WATCH_ID);
        verify(deviceService, never()).autoRegister(anyString());
        verifyNoInteractions(locationService);
    }

    @Test
    void anythingThatIsNotATenDigitWatchIdCreatesNoDevice() {
        send("abc", "LK,0,0,57");
        send("12345", "LK,0,0,57");
        send("355913787483028", "LK,0,0,57");

        verifyNoInteractions(deviceService, locationService, alarmService, networkLocationService);
    }

    @Test
    void aBrokenReportStillCountsAsPresence() {
        Device d = knownAs(WATCH_ID);
        when(deviceService.findByWatchId(WATCH_ID)).thenReturn(Optional.of(d));

        send("UD_LTE,121126,0433");

        verify(locationService, never()).saveAndBroadcast(any());
        verify(deviceService, times(2)).markOnline(WATCH_ID);  // once at lookup, once for the frame
    }
}
