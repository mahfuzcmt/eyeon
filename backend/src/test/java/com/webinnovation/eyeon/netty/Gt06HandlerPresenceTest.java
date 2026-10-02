package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.protocol.PacketDecoder;
import com.webinnovation.eyeon.protocol.PacketEncoder;
import com.webinnovation.eyeon.service.AlarmService;
import com.webinnovation.eyeon.service.DeviceCommandService;
import com.webinnovation.eyeon.service.DeviceService;
import com.webinnovation.eyeon.service.LocationService;
import com.webinnovation.eyeon.service.NetworkLocationService;
import com.webinnovation.eyeon.protocol.NetworkScan;
import org.mockito.ArgumentCaptor;
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

    /** Serving cell only, 8 access points: the tracker lying indoors in Dhaka, 2026-10-01 06:46:38 UTC. */
    static final String WIFI_SCAN_CONTENT = "1a0a01062e2681d600020000bbef0000000001ff941037"
            + "0".repeat(156)
            + "0008105a95ead1d1350c80630a52be3d84fc14919b7e40dc8e8dbaabf8447820514b047e47"
            + "125a95ab05b54984fc14ca55484bfebabd66fb264b";

    private DeviceService deviceService;
    private LocationService locationService;
    private NetworkLocationService networkLocationService;
    private DeviceCommandService commandService;
    private AlarmService alarmService;
    private EmbeddedChannel channel;

    @BeforeEach
    void setUp() {
        deviceService = mock(DeviceService.class);
        locationService = mock(LocationService.class);
        networkLocationService = mock(NetworkLocationService.class);
        commandService = mock(DeviceCommandService.class);
        alarmService = mock(AlarmService.class);
        Device device = mock(Device.class);
        when(device.orgId()).thenReturn(UUID.randomUUID());
        when(deviceService.findByImei(IMEI)).thenReturn(Optional.of(device));
        Gt06Handler handler = new Gt06Handler(new PacketDecoder(), new PacketEncoder(), deviceService,
                locationService, alarmService, commandService,
                networkLocationService, new SimpleAsyncTaskExecutor("ingest-"));
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

    /** 0x79 0x79 frame: two-byte length, otherwise the same layout. */
    private static ByteBuf extendedFrame(int proto, byte[] content, int serial) {
        ByteBuf body = Unpooled.buffer().writeShort(1 + content.length + 2 + 2).writeByte(proto)
                .writeBytes(content).writeShort(serial);
        int crc = ChecksumUtil.crcItu(body, 0, body.readableBytes());
        return Unpooled.buffer().writeShort(0x7979).writeBytes(body).writeShort(crc).writeShort(0x0D0A);
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
        // status block 00 03 04 00 02: GSM strength 4; modules 0x006A = 0x32 (50 %), 0x0018 = 0x017E (3.82 V)
        verify(deviceService, timeout(3000)).applyHeartbeatStatus(IMEI, 4, 50, 3820);
        verify(locationService, never()).saveAndBroadcast(any());
    }

    @Test
    void wifi_scan_0xa2_is_acked_and_handed_to_the_network_locator() {
        login();

        // Content of the captured 0xA2 packet (see PacketDecoderTest), re-framed with serial 9.
        channel.writeInbound(frame(0xA2, ByteBufUtil.decodeHexDump(WIFI_SCAN_CONTENT), 9));

        ByteBuf ack = channel.readOutbound();
        assertEquals("787805a20009", ByteBufUtil.hexDump(ack).substring(0, 12));
        ack.release();
        ArgumentCaptor<NetworkScan> scan = ArgumentCaptor.forClass(NetworkScan.class);
        verify(networkLocationService, timeout(3000)).onScan(
                org.mockito.ArgumentMatchers.eq(IMEI), any(), org.mockito.ArgumentMatchers.eq(0xA2), scan.capture(), any());
        assertEquals(8, scan.getValue().wifi().size());
        assertEquals(470, scan.getValue().mcc());
    }

    @Test
    void wifi_scan_0x2c_on_a_2g_cell_goes_to_the_network_locator_too() {
        login();

        channel.writeInbound(frame(0x2C, ByteBufUtil.decodeHexDump(
                "1a0a0208320b81d60002759c000377287a60000c0028" + "0".repeat(60) + "00024c49686db7fe447cf17ee782b746"), 4));

        ArgumentCaptor<NetworkScan> scan = ArgumentCaptor.forClass(NetworkScan.class);
        verify(networkLocationService, timeout(3000)).onScan(
                org.mockito.ArgumentMatchers.eq(IMEI), any(), org.mockito.ArgumentMatchers.eq(0x2C), scan.capture(), any());
        assertEquals("gsm", scan.getValue().radio());
        assertEquals(2, scan.getValue().cells().size());
        assertEquals(2, scan.getValue().wifi().size());
    }

    /** Indoors the PL601 reports low battery (and SOS) as a 0xA9 scan, not as a location alarm. */
    @Test
    void scan_alarm_0xa9_raises_the_alarm_at_the_resolved_position() {
        com.webinnovation.eyeon.protocol.LocationData where = new com.webinnovation.eyeon.protocol.LocationData();
        where.setLatitude(23.7523);
        where.setLongitude(90.3813);
        when(networkLocationService.onScan(org.mockito.ArgumentMatchers.eq(IMEI), any(),
                org.mockito.ArgumentMatchers.eq(0xA9), any(), any(), org.mockito.ArgumentMatchers.eq(true)))
                .thenReturn(Optional.of(where));
        login();

        channel.writeInbound(frame(0xA9, ByteBufUtil.decodeHexDump(
                "1a0a0209272381d6000201010000bd2f000000000202060e430008"
                + "b01921688f9545906a94ad105f48105a95afe5464e789a1884cf764e926a94ad105f4f9eba5f67968e4f"
                + "32169dad27b64f8c86dd0fb02d4f" + "1902"), 6));

        ByteBuf ack = channel.readOutbound();
        assertEquals("787805a90006", ByteBufUtil.hexDump(ack).substring(0, 12));
        ack.release();
        verify(alarmService, timeout(3000)).raise(any(), org.mockito.ArgumentMatchers.eq(IMEI),
                org.mockito.ArgumentMatchers.eq(com.webinnovation.eyeon.domain.enums.AlarmType.LOW_BATTERY),
                org.mockito.ArgumentMatchers.eq(com.webinnovation.eyeon.domain.enums.AlarmSeverity.WARNING),
                org.mockito.ArgumentMatchers.eq(java.time.Instant.parse("2026-10-02T09:39:35Z")),
                org.mockito.ArgumentMatchers.eq(23.7523), org.mockito.ArgumentMatchers.eq(90.3813),
                org.mockito.ArgumentMatchers.anyMap());
    }

    // ---- replies to a 0x80 server command ------------------------------------------------

    @Test
    void gt06_command_reply_0x15_is_matched_by_its_server_flag() {
        login();
        byte[] text = "DYD=Success!".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        ByteBuf content = Unpooled.buffer().writeByte(4 + text.length).writeInt(0x0001A958).writeBytes(text).writeShort(2);

        channel.writeInbound(frame(0x15, ByteBufUtil.getBytes(content), 5));

        verify(commandService).completeReply(0x0001A958, "DYD=Success!");
    }

    @Test
    void jimi_command_reply_0x21_in_an_extended_frame_is_matched_too() {
        login();
        byte[] text = "Battery:3.97V,NORMAL; GPRS:Link Up;".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        ByteBuf content = Unpooled.buffer().writeInt(7).writeByte(1).writeBytes(text);

        channel.writeInbound(extendedFrame(0x21, ByteBufUtil.getBytes(content), 6));

        verify(commandService).completeReply(7, "Battery:3.97V,NORMAL; GPRS:Link Up;");
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
