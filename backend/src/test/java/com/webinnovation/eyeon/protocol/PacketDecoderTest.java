package com.webinnovation.eyeon.protocol;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PacketDecoderTest {

    private final PacketDecoder decoder = new PacketDecoder();

    @Test
    void decodes_bcd_imei_correctly() {
        // 864290061234567 → padded to "0864290061234567" → 8 bytes
        byte[] bcd = {0x08, 0x64, 0x29, 0x00, 0x61, 0x23, 0x45, 0x67};
        ByteBuf buf = Unpooled.wrappedBuffer(bcd);
        try {
            assertThat(decoder.decodeLoginImei(buf)).isEqualTo("864290061234567");
        } finally {
            buf.release();
        }
    }

    @Test
    void decodes_v3_location_round_trip() {
        // Build a V3 location content payload by hand, then decode and compare.
        double targetLat = 23.7806;
        double targetLng = 90.4193;
        long latRaw = (long) (targetLat * 1_800_000);
        long lngRaw = (long) (targetLng * 1_800_000);

        ByteBuffer bb = ByteBuffer.allocate(64);
        // Date: 2026-05-07 12:34:56 UTC
        bb.put((byte) 26).put((byte) 5).put((byte) 7).put((byte) 12).put((byte) 34).put((byte) 56);
        bb.put((byte) ((12 << 4) | 0x0C));   // gps info length / satellites
        bb.putInt((int) (latRaw & 0xFFFFFFFFL));
        bb.putInt((int) (lngRaw & 0xFFFFFFFFL));
        bb.put((byte) 42);                    // speed
        // Hemisphere bits are asymmetric (Concox doc / Traccar):
        // bit10 (0x0400): 1 = North; bit11 (0x0800): 0 = East
        bb.putShort((short) (0x1000 | 0x0400 | 90));   // valid + north + east + course=90
        bb.putShort((short) 470);             // MCC
        bb.put((byte) 1);                     // MNC
        bb.putShort((short) 0x1234);          // LAC
        bb.put((byte) 0).put((byte) 0x12).put((byte) 0x34);  // cell id 24-bit
        bb.put((byte) 1);                     // ACC on
        bb.put((byte) 0);                     // upload mode
        bb.put((byte) 1);                     // realtime
        bb.putInt(1234);                      // mileage km

        bb.flip();
        ByteBuf content = Unpooled.wrappedBuffer(bb);
        try {
            LocationData loc = decoder.decodeLocation(content, PacketType.LOCATION_V3);
            assertThat(loc.getLatitude()).isCloseTo(targetLat, org.assertj.core.data.Offset.offset(1e-5));
            assertThat(loc.getLongitude()).isCloseTo(targetLng, org.assertj.core.data.Offset.offset(1e-5));
            assertThat(loc.getSpeed()).isEqualTo(42);
            assertThat(loc.getCourse()).isEqualTo(90);
            assertThat(loc.isValid()).isTrue();
            assertThat(loc.getSatellites()).isEqualTo(12);
            assertThat(loc.getAccOn()).isTrue();
            assertThat(loc.getMileageMeters()).isEqualTo(1_234_000L);
            assertThat(loc.getTimestamp()).isEqualTo(Instant.parse("2026-05-07T12:34:56Z"));
        } finally {
            content.release();
        }
    }

    @Test
    void v18_location_uses_degrees_minutes_formula() {
        // V1.8 raw = (deg*60 + min) * 30000 — for 23.7806 deg:
        //   minutes = 23.7806 * 60 = 1426.836
        //   raw = 1426.836 * 30000 = 42805080
        // Mathematically equivalent to V3's raw / 1_800_000:
        //   42805080 / 1_800_000 ≈ 23.78
        // The decoder formula (raw/30000)/60 should reproduce 23.7806.
        double targetLat = 23.7806;
        long raw = (long) (targetLat * 60.0 * 30000.0);

        ByteBuffer bb = ByteBuffer.allocate(64);
        bb.put((byte) 26).put((byte) 5).put((byte) 7).put((byte) 12).put((byte) 0).put((byte) 0);
        bb.put((byte) ((12 << 4) | 0x0C));
        bb.putInt((int) raw);
        bb.putInt(0);                  // longitude 0
        bb.put((byte) 0);              // speed
        bb.putShort((short) (0x1000 | 0x0400));   // valid + north (bit11 clear = east)
        bb.putShort((short) 0);        // MCC etc...
        bb.put((byte) 0);
        bb.putShort((short) 0);
        bb.put((byte) 0).put((byte) 0).put((byte) 0);
        bb.flip();

        ByteBuf content = Unpooled.wrappedBuffer(bb);
        try {
            LocationData loc = decoder.decodeLocation(content, PacketType.LOCATION_V18);
            assertThat(loc.getLatitude()).isCloseTo(targetLat, org.assertj.core.data.Offset.offset(1e-4));
        } finally {
            content.release();
        }
    }

    @Test
    void south_west_flags_negate_coordinates() {
        // GT06 hemisphere bits are ASYMMETRIC (Concox course-status byte 1,
        // matches Traccar): bit10 (0x0400) 0 = South / 1 = North,
        //                   bit11 (0x0800) 0 = East  / 1 = West.
        // So "south + west" = bit10 CLEAR + bit11 SET.
        double targetLat = 23.7806;
        double targetLng = 90.4193;
        long latRaw = (long) (targetLat * 1_800_000);
        long lngRaw = (long) (targetLng * 1_800_000);

        ByteBuffer bb = ByteBuffer.allocate(64);
        bb.put((byte) 26).put((byte) 5).put((byte) 7).put((byte) 0).put((byte) 0).put((byte) 0);
        bb.put((byte) ((12 << 4) | 0x0C));
        bb.putInt((int) latRaw);
        bb.putInt((int) lngRaw);
        bb.put((byte) 0);
        bb.putShort((short) (0x1000 | 0x0800));  // valid + south (bit10 clear) + west (bit11 set)
        bb.putShort((short) 0); bb.put((byte) 0); bb.putShort((short) 0);
        bb.put((byte) 0).put((byte) 0).put((byte) 0);
        bb.put((byte) 0); bb.put((byte) 0); bb.put((byte) 0); bb.putInt(0);
        bb.flip();

        ByteBuf content = Unpooled.wrappedBuffer(bb);
        try {
            LocationData loc = decoder.decodeLocation(content, PacketType.LOCATION_V3);
            assertThat(loc.getLatitude()).isLessThan(0);
            assertThat(loc.getLongitude()).isLessThan(0);
        } finally {
            content.release();
        }
    }

    @Test
    void heartbeat_status_extracts_acc_and_gsm() {
        // Heartbeat status block: [status:1][voltage:1][gsm:1][alarm:1][lang:1]
        // status bit 1 = ACC on
        ByteBuffer bb = ByteBuffer.allocate(5);
        bb.put((byte) 0x02);  // ACC on (bit 1)
        bb.put((byte) 4);     // voltage level
        bb.put((byte) 28);    // GSM strength (out of 31 → strong)
        bb.put((byte) 0);     // no alarm
        bb.put((byte) 1);     // language byte
        bb.flip();
        ByteBuf content = Unpooled.wrappedBuffer(bb);
        try {
            PacketDecoder.HeartbeatStatus status = decoder.decodeHeartbeat(content);
            assertThat(status).isNotNull();
            assertThat(status.accOn()).isTrue();
            assertThat(status.gsmSignal()).isEqualTo(28);
            assertThat(status.voltageLevel()).isEqualTo(4);
        } finally {
            content.release();
        }
    }

    @Test
    void heartbeat_returns_null_when_status_block_missing() {
        ByteBuf content = Unpooled.buffer(0);
        try {
            assertThat(decoder.decodeHeartbeat(content)).isNull();
        } finally {
            content.release();
        }
    }

    @Test
    void alarm_packet_captures_gsm_signal() {
        // Build an alarm packet: header + lat/lng + LBS + status block (5 bytes)
        ByteBuffer bb = ByteBuffer.allocate(64);
        bb.put((byte) 26).put((byte) 5).put((byte) 7).put((byte) 0).put((byte) 0).put((byte) 0);
        bb.put((byte) ((12 << 4) | 0x0C));
        bb.putInt((int) (23.78 * 1_800_000));
        bb.putInt((int) (90.42 * 1_800_000));
        bb.put((byte) 0);
        bb.putShort((short) (0x1000 | 0x0400));   // valid + north (bit11 clear = east)
        bb.putShort((short) 470);  // MCC
        bb.put((byte) 1);          // MNC
        bb.putShort((short) 0);    // LAC
        bb.put((byte) 0).put((byte) 0).put((byte) 0);   // cell id
        // Status block
        bb.put((byte) 0x02);   // status: ACC on
        bb.put((byte) 4);      // voltage level
        bb.put((byte) 22);     // GSM
        bb.put((byte) 4);      // alarm code: SOS
        bb.put((byte) 0);      // language
        bb.flip();
        ByteBuf content = Unpooled.wrappedBuffer(bb);
        try {
            LocationData loc = decoder.decodeAlarm(content);
            assertThat(loc.getGsmSignal()).isEqualTo(22);
            assertThat(loc.getAlarmCode()).isEqualTo(4);
            assertThat(loc.getAccOn()).isTrue();
        } finally {
            content.release();
        }
    }

    @Test
    void north_east_flags_keep_coordinates_positive() {
        // "north + east" = bit10 (0x0400) SET + bit11 (0x0800) CLEAR —
        // what a real GT06 in Dhaka (23.78N, 90.42E) actually sends.
        double targetLat = 23.7806;
        double targetLng = 90.4193;
        long latRaw = (long) (targetLat * 1_800_000);
        long lngRaw = (long) (targetLng * 1_800_000);

        ByteBuffer bb = ByteBuffer.allocate(64);
        bb.put((byte) 26).put((byte) 5).put((byte) 7).put((byte) 0).put((byte) 0).put((byte) 0);
        bb.put((byte) ((12 << 4) | 0x0C));
        bb.putInt((int) latRaw);
        bb.putInt((int) lngRaw);
        bb.put((byte) 0);
        bb.putShort((short) (0x1000 | 0x0400));  // valid + north (bit11 clear = east)
        bb.putShort((short) 0); bb.put((byte) 0); bb.putShort((short) 0);
        bb.put((byte) 0).put((byte) 0).put((byte) 0);
        bb.put((byte) 0); bb.put((byte) 0); bb.put((byte) 0); bb.putInt(0);
        bb.flip();

        ByteBuf content = Unpooled.wrappedBuffer(bb);
        try {
            LocationData loc = decoder.decodeLocation(content, PacketType.LOCATION_V3);
            assertThat(loc.getLatitude()).isGreaterThan(0);
            assertThat(loc.getLongitude()).isGreaterThan(0);
        } finally {
            content.release();
        }
    }

    // ---- Jimi 4G network scans, captured from a personal tracker on production (2026-10-01) ----

    private static final String WIFI_SCAN_0XA2 = "1a0a01062e2681d600020000bbef0000000001ff941037"
            + "0".repeat(156)
            + "0008105a95ead1d1350c80630a52be3d84fc14919b7e40dc8e8dbaabf8447820514b047e47"
            + "125a95ab05b54984fc14ca55484bfebabd66fb264b";

    private static final String CELL_SCAN_0XA1 = "1a0a0106341881d600020000bbef0000000001ff941030"
            + "0000bbef0000000001ffaa470b" + "0000bbef0000000001ffc14a08" + "0000bbef0000000001ffaa4a0e"
            + "0000bbef0000000001ffc14b0a" + "0000bbef0000000001ff94161e" + "0000bbef0000000001ff940d14"
            + "000002";

    @Test
    void wifi_scan_0xa2_decodes_serving_cell_and_access_points() {
        ByteBuf content = Unpooled.wrappedBuffer(io.netty.buffer.ByteBufUtil.decodeHexDump(WIFI_SCAN_0XA2));
        try {
            NetworkScan scan = decoder.decodeNetworkScan(content, true);

            assertThat(scan.ts()).isEqualTo(java.time.Instant.parse("2026-10-01T06:46:38Z"));
            assertThat(scan.mcc()).isEqualTo(470);   // Bangladesh; bit 15 of the field flags a 2-byte MNC
            assertThat(scan.mnc()).isEqualTo(2);     // Robi
            assertThat(scan.cells()).containsExactly(new NetworkScan.Cell(0xBBEF, 0x01FF9410L, 0x37));
            assertThat(scan.wifi()).hasSize(8);
            assertThat(scan.wifi().get(0)).isEqualTo(new NetworkScan.Wifi("10:5a:95:ea:d1:d1", -53));
            assertThat(scan.wifi().get(7)).isEqualTo(new NetworkScan.Wifi("fe:ba:bd:66:fb:26", -75));
        } finally {
            content.release();
        }
    }

    @Test
    void cell_scan_0xa1_decodes_seven_cells_and_no_wifi() {
        ByteBuf content = Unpooled.wrappedBuffer(io.netty.buffer.ByteBufUtil.decodeHexDump(CELL_SCAN_0XA1));
        try {
            NetworkScan scan = decoder.decodeNetworkScan(content, false);

            assertThat(scan.cells()).hasSize(7);
            assertThat(scan.cells().get(0).cellId()).isEqualTo(0x01FF9410L);
            assertThat(scan.cells().get(6)).isEqualTo(new NetworkScan.Cell(0xBBEF, 0x01FF940DL, 0x14));
            assertThat(scan.hasWifi()).isFalse();
        } finally {
            content.release();
        }
    }
}
