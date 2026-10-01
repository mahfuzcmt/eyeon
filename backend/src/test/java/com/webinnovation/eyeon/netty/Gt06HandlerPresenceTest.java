package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.protocol.PacketDecoder;
import com.webinnovation.eyeon.protocol.PacketEncoder;
import com.webinnovation.eyeon.service.AlarmService;
import com.webinnovation.eyeon.service.DeviceCommandService;
import com.webinnovation.eyeon.service.DeviceService;
import com.webinnovation.eyeon.service.LocationService;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufUtil;
import io.netty.buffer.Unpooled;
import io.netty.channel.embedded.EmbeddedChannel;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SimpleAsyncTaskExecutor;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A tracker stays ONLINE only while packets refresh its last-seen time. Field bug (2026-10-01):
 * a battery-powered personal tracker sent only 0x36 heartbeats, which fell into the "unhandled"
 * branch (ACK, nothing else), so it was shown OFFLINE five minutes after every login.
 */
class Gt06HandlerPresenceTest {

    private static final String IMEI = "868322070079370";
    /** Captured from the tracker on production port 5024, byte for byte. */
    private static final String HEARTBEAT_0X36 =
            "78781e3600030400020041040000090d00320101001802017e006a01320007e6340d0a";

    private DeviceService deviceService;
    private LocationService locationService;
    private EmbeddedChannel channel;

    @BeforeEach
    void setUp() {
        deviceService = mock(DeviceService.class);
        locationService = mock(LocationService.class);
        Device device = mock(Device.class);
        when(device.orgId()).thenReturn(UUID.randomUUID());
        when(deviceService.findByImei(IMEI)).thenReturn(Optional.of(device));
        Gt06Handler handler = new Gt06Handler(new PacketDecoder(), new PacketEncoder(), deviceService,
                locationService, mock(AlarmService.class), mock(DeviceCommandService.class),
                new SimpleAsyncTaskExecutor("ingest-"));
        channel = new EmbeddedChannel(handler);
    }

    @AfterEach
    void tearDown() {
        channel.finishAndReleaseAll();
    }

    private static ByteBuf hex(String s) {
        return Unpooled.wrappedBuffer(ByteBufUtil.decodeHexDump(s));
    }

    /** A frame of an arbitrary type with a correct CRC. */
    private static ByteBuf frame(int proto, byte[] content, int serial) {
        byte[] body = new byte[1 + 1 + content.length + 2];
        body[0] = (byte) (1 + content.length + 2 + 2);
        body[1] = (byte) proto;
        System.arraycopy(content, 0, body, 2, content.length);
        body[body.length - 2] = (byte) (serial >> 8);
        body[body.length - 1] = (byte) serial;
        int crc = ChecksumUtil.crcItu(body, 0, body.length);
        return Unpooled.buffer().writeShort(0x7878).writeBytes(body).writeShort(crc).writeShort(0x0D0A);
    }

    private void login() {
        // 15-digit IMEI packed as BCD into 8 bytes with a leading zero nibble
        channel.writeInbound(frame(0x01, ByteBufUtil.decodeHexDump("0" + IMEI), 1));
        verify(deviceService, timeout(3000)).markOnline(IMEI);
        channel.releaseOutbound();
    }

    @Test
    void extended_heartbeat_0x36_is_acked_with_its_own_type_and_refreshes_status() {
        login();

        channel.writeInbound(hex(HEARTBEAT_0X36));

        ByteBuf ack = channel.readOutbound();
        // [78 78][len 05][proto 36][serial 00 07][crc][0d 0a]
        assertEquals("787805360007", ByteBufUtil.hexDump(ack).substring(0, 12));
        ack.release();
        // status block 00 03 04 00 02: GSM strength 4
        verify(deviceService, timeout(3000)).applyHeartbeatStatus(IMEI, 4);
        verify(locationService, never()).saveAndBroadcast(any());
    }

    @Test
    void a_packet_of_an_unknown_type_still_marks_the_tracker_as_seen() {
        login();

        channel.writeInbound(frame(0x99, new byte[] {1, 2, 3}, 2));

        ByteBuf ack = channel.readOutbound();
        assertEquals("787805990002", ByteBufUtil.hexDump(ack).substring(0, 12));
        ack.release();
        verify(deviceService, timeout(3000).times(2)).markOnline(IMEI);  // login + this packet
    }

    @Test
    void an_unknown_packet_before_any_login_changes_nothing() {
        channel.writeInbound(frame(0x99, new byte[] {1, 2, 3}, 1));

        verify(deviceService, after(300).never()).markOnline(any());
    }
}
