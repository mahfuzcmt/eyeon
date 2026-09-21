package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.protocol.PacketDecoder;
import com.webinnovation.eyeon.protocol.PacketEncoder;
import com.webinnovation.eyeon.service.AlarmService;
import com.webinnovation.eyeon.service.DeviceCommandService;
import com.webinnovation.eyeon.service.DeviceService;
import com.webinnovation.eyeon.service.LocationService;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.embedded.EmbeddedChannel;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.task.SimpleAsyncTaskExecutor;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reproduces the field bug: a tracker logs in and immediately sends a location and an SOS.
 * The device lookup is deliberately slow (held on a latch), so both packets arrive before the
 * login finishes. Before the LoginGate they were ACKed and silently dropped.
 */
class Gt06HandlerLoginRaceTest {

    private static final String IMEI = "864290061234567";

    private DeviceService deviceService;
    private LocationService locationService;
    private AlarmService alarmService;
    private EmbeddedChannel channel;
    private final CountDownLatch lookupMayFinish = new CountDownLatch(1);
    private final UUID orgId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        deviceService = mock(DeviceService.class);
        locationService = mock(LocationService.class);
        alarmService = mock(AlarmService.class);
        Device device = mock(Device.class);
        when(device.orgId()).thenReturn(orgId);
        when(deviceService.findByImei(IMEI)).thenAnswer(inv -> {
            assertTrue(lookupMayFinish.await(5, TimeUnit.SECONDS));
            return Optional.of(device);
        });
        Gt06Handler handler = new Gt06Handler(new PacketDecoder(), new PacketEncoder(), deviceService,
                locationService, alarmService, mock(DeviceCommandService.class), new SimpleAsyncTaskExecutor("ingest-"));
        channel = new EmbeddedChannel(handler);
    }

    @AfterEach
    void tearDown() {
        lookupMayFinish.countDown();
        channel.finishAndReleaseAll();
    }

    // ---- GT06 frames (same layout as scripts/simulate_device.py) ---------------------------

    private static ByteBuf frame(int proto, byte[] content, int serial) {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        int length = 1 + content.length + 2 + 2;
        body.write(length);
        body.write(proto);
        body.writeBytes(content);
        body.write((serial >> 8) & 0xFF);
        body.write(serial & 0xFF);
        byte[] b = body.toByteArray();
        int crc = ChecksumUtil.crcItu(b, 0, b.length);
        ByteArrayOutputStream f = new ByteArrayOutputStream();
        f.write(0x78);
        f.write(0x78);
        f.writeBytes(b);
        f.write((crc >> 8) & 0xFF);
        f.write(crc & 0xFF);
        f.write(0x0D);
        f.write(0x0A);
        return Unpooled.wrappedBuffer(f.toByteArray());
    }

    private static byte[] bcdImei(String imei) {
        String digits = "0" + imei;
        byte[] out = new byte[8];
        for (int i = 0; i < 8; i++) out[i] = (byte) Integer.parseInt(digits.substring(2 * i, 2 * i + 2), 16);
        return out;
    }

    /** date/time + GPS + LBS, as in V3 location and 0x16 alarm packets (Dhaka, valid fix). */
    private static byte[] gpsLbs() {
        ByteBuffer b = ByteBuffer.allocate(6 + 1 + 4 + 4 + 1 + 2 + 2 + 1 + 2 + 3);
        b.put(new byte[] {26, 9, 21, 2, 2, 0});
        b.put((byte) ((12 << 4) | 12));
        b.putInt((int) Math.round(23.8103 * 1_800_000));
        b.putInt((int) Math.round(90.4125 * 1_800_000));
        b.put((byte) 3);
        b.putShort((short) (90 | 0x1000 | 0x0400));  // valid fix, northern hemisphere, east
        b.putShort((short) 470).put((byte) 1).putShort((short) 0x1234).put(new byte[] {0, 0x12, 0x34});
        return b.array();
    }

    private static byte[] locationV3() {
        ByteBuffer b = ByteBuffer.allocate(gpsLbs().length + 3 + 4);
        b.put(gpsLbs()).put((byte) 1).put((byte) 0).put((byte) 1).putInt(1234);
        return b.array();
    }

    private static byte[] sosAlarm() {
        ByteBuffer b = ByteBuffer.allocate(gpsLbs().length + 5);
        b.put(gpsLbs()).put(new byte[] {0x00, 0x04, 0x03, 0x01, 0x02});  // alarm code 0x01 = SOS
        return b.array();
    }

    // ---- tests -------------------------------------------------------------------------------

    @Test
    void location_and_sos_sent_right_after_login_are_not_lost() {
        channel.writeInbound(frame(0x01, bcdImei(IMEI), 1));
        channel.writeInbound(frame(0x22, locationV3(), 2));
        channel.writeInbound(frame(0x16, sosAlarm(), 3));

        // Every packet is ACKed at once, even while the lookup is still running.
        int acks = 0;
        while (channel.readOutbound() != null) acks++;
        assertEquals(3, acks, "login, location and SOS must each be ACKed immediately");
        verify(locationService, after(200).never()).saveAndBroadcast(any());

        lookupMayFinish.countDown();

        ArgumentCaptor<LocationData> saved = ArgumentCaptor.forClass(LocationData.class);
        verify(locationService, timeout(3000).times(2)).saveAndBroadcast(saved.capture());
        List<LocationData> both = saved.getAllValues();
        assertEquals(IMEI, both.get(0).getImei());
        assertEquals(orgId, both.get(0).getOrgId());
        assertEquals(23.8103, both.get(0).getLatitude(), 1e-4);
        verify(alarmService, timeout(3000)).raise(eq(orgId), eq(IMEI), eq(AlarmType.SOS), any(), any(),
                any(Double.class), any(Double.class), anyMap());
    }

    @Test
    void packets_from_a_tracker_that_cannot_be_registered_are_still_dropped() {
        // doReturn form: when(mock.findByImei(..)) would invoke the latch-waiting stub from setUp.
        doReturn(Optional.empty()).when(deviceService).findByImei(IMEI);
        doThrow(new IllegalStateException("db down")).when(deviceService).autoRegister(anyString());

        channel.writeInbound(frame(0x01, bcdImei(IMEI), 1));
        channel.writeInbound(frame(0x16, sosAlarm(), 2));
        lookupMayFinish.countDown();

        verify(locationService, after(500).never()).saveAndBroadcast(any());
        verify(alarmService, never()).raise(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void a_location_on_a_connection_that_never_logged_in_is_dropped() {
        channel.writeInbound(frame(0x22, locationV3(), 1));
        assertTrue(channel.readOutbound() != null, "still ACKed so the tracker does not reconnect-loop");
        verify(locationService, after(300).never()).saveAndBroadcast(any());
    }
}
