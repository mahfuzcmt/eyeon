package com.webinnovation.eyeon.protocol;

import io.netty.buffer.ByteBuf;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Decodes the variable payload of a GT06 frame after the protocol number byte.
 * Caller hands us a slice positioned at the start of [Content] and limited to
 * the content length (excludes Length, ProtocolNumber, Serial, CRC, Stop).
 */
@Component
public class PacketDecoder {

    /** Decode 8-byte BCD-packed IMEI from a login (0x01) packet. */
    public String decodeLoginImei(ByteBuf content) {
        byte[] bcd = new byte[8];
        content.readBytes(bcd);
        StringBuilder sb = new StringBuilder(16);
        for (byte b : bcd) {
            sb.append((b >> 4) & 0x0F);
            sb.append(b & 0x0F);
        }
        // 8 bytes → 16 nibbles, IMEI is 15 digits, leading nibble is padding
        return sb.length() > 15 ? sb.substring(sb.length() - 15) : sb.toString();
    }

    /** Decode location packet variants 0x12 / 0x22 / 0x32 / 0xA0 (CLAUDE.md §6.5). */
    public LocationData decodeLocation(ByteBuf content, int protocolNumber) {
        LocationData loc = new LocationData();
        loc.setProtocolNumber(protocolNumber);
        loc.setTimestamp(decodeDateTime(content));

        int gpsByte = content.readUnsignedByte();
        loc.setGpsInfoLength((gpsByte >> 4) & 0x0F);
        loc.setSatellites(gpsByte & 0x0F);

        long latRaw = content.readUnsignedInt();
        long lonRaw = content.readUnsignedInt();
        loc.setSpeed(content.readUnsignedByte());

        int courseStatus = content.readUnsignedShort();
        loc.setCourse(courseStatus & 0x03FF);
        loc.setValid((courseStatus & 0x1000) != 0);
        // GT06 hemisphere bits (per Traccar reference):
        // Bit 10 (0x0400): 0 = South, 1 = North
        // Bit 11 (0x0800): 0 = East, 1 = West
        boolean south = (courseStatus & 0x0400) == 0;
        boolean west  = (courseStatus & 0x0800) != 0;

        double lat;
        double lon;
        if (protocolNumber == PacketType.LOCATION_V18) {
            // V1.8: (deg×60 + min) × 30000 → divide by 30000 then by 60 to get degrees
            lat = (latRaw / 30000.0) / 60.0;
            lon = (lonRaw / 30000.0) / 60.0;
        } else {
            // V3 / V4 / 4G
            lat = latRaw / 1_800_000.0;
            lon = lonRaw / 1_800_000.0;
        }
        if (south) lat = -lat;
        if (west)  lon = -lon;
        loc.setLatitude(lat);
        loc.setLongitude(lon);

        // LBS (cell tower) - layout differs by protocol variant
        if (protocolNumber == PacketType.LOCATION_4G) {
            // 4G: MCC(2, bit15=MNC length flag) + MNC(1-2) + LAC(4) + CellID(8)
            int mcc = content.readUnsignedShort();
            boolean mncLong = (mcc & 0x8000) != 0;
            loc.setMcc(mcc & 0x7FFF);
            loc.setMnc(mncLong ? content.readUnsignedShort() : content.readUnsignedByte());
            loc.setLac((int) content.readUnsignedInt());
            loc.setCellId(content.readLong());
        } else if (protocolNumber == PacketType.LOCATION_V4 && content.readableBytes() >= 9) {
            // V4 (0x32): MCC(2) + MNC(1) + LAC(2) + CellID(4) = 9 bytes
            loc.setMcc(content.readUnsignedShort());
            loc.setMnc(content.readUnsignedByte());
            loc.setLac(content.readUnsignedShort());
            loc.setCellId(content.readUnsignedInt());
        } else if (content.readableBytes() >= 8) {
            // V1.8 / V3: MCC(2) + MNC(1) + LAC(2) + CellID(3) = 8 bytes
            loc.setMcc(content.readUnsignedShort());
            loc.setMnc(content.readUnsignedByte());
            loc.setLac(content.readUnsignedShort());
            loc.setCellId(read24BitInt(content));
        }

        // V3 / V4 / 4G additional fields
        if (protocolNumber == PacketType.LOCATION_V3
                || protocolNumber == PacketType.LOCATION_V4
                || protocolNumber == PacketType.LOCATION_4G) {
            if (content.readableBytes() >= 7) {
                loc.setAccOn(content.readUnsignedByte() == 1);
                loc.setUploadMode((int) content.readUnsignedByte());
                loc.setRealtimeFlag((int) content.readUnsignedByte());
                loc.setMileageMeters(content.readUnsignedInt() * 1000L);  // km → m
            }
        }

        if (protocolNumber == PacketType.LOCATION_V4
                || protocolNumber == PacketType.LOCATION_4G) {
            if (content.readableBytes() >= 2) {
                loc.setVoltageMv(content.readUnsignedShort() * 10);  // 0.01V → mV
            }
        }
        if (protocolNumber == PacketType.LOCATION_V4) {
            if (content.readableBytes() >= 4) {
                loc.setAccOnTimeSeconds(content.readUnsignedInt());
            }
            if (content.readableBytes() >= 2) {
                content.skipBytes(2);  // reserved
            }
        }

        return loc;
    }

    /**
     * Decode a 0x16 alarm packet. Layout = location body (treated as V3 lat/lng scale,
     * no V3-extension fields) + 5 status bytes:
     * <pre>
     *   [device-status:1][voltage-level:1][gsm-strength:1][alarm-code:1][language:1]
     * </pre>
     * The device-status byte's bit 1 carries ACC; bits 3-5 carry an alarm hint that
     * historically duplicates the dedicated alarm-code byte.
     */
    public LocationData decodeAlarm(ByteBuf content) {
        LocationData loc = new LocationData();
        loc.setProtocolNumber(PacketType.ALARM);
        loc.setTimestamp(decodeDateTime(content));

        int gpsByte = content.readUnsignedByte();
        loc.setGpsInfoLength((gpsByte >> 4) & 0x0F);
        loc.setSatellites(gpsByte & 0x0F);

        long latRaw = content.readUnsignedInt();
        long lonRaw = content.readUnsignedInt();
        loc.setSpeed(content.readUnsignedByte());

        int courseStatus = content.readUnsignedShort();
        loc.setCourse(courseStatus & 0x03FF);
        loc.setValid((courseStatus & 0x1000) != 0);
        // GT06 hemisphere bits (per Traccar reference):
        // Bit 10 (0x0400): 0 = South, 1 = North
        // Bit 11 (0x0800): 0 = East, 1 = West
        boolean south = (courseStatus & 0x0400) == 0;
        boolean west = (courseStatus & 0x0800) != 0;

        double lat = latRaw / 1_800_000.0;
        double lon = lonRaw / 1_800_000.0;
        if (south) lat = -lat;
        if (west) lon = -lon;
        loc.setLatitude(lat);
        loc.setLongitude(lon);

        // LBS — same layout as standard location
        if (content.readableBytes() >= 8) {
            loc.setMcc(content.readUnsignedShort());
            loc.setMnc(content.readUnsignedByte());
            loc.setLac(content.readUnsignedShort());
            loc.setCellId(read24BitInt(content));
        }

        // Status block (5 bytes)
        if (content.readableBytes() >= 5) {
            int status = content.readUnsignedByte();
            loc.setAccOn((status & 0x02) != 0);
            int voltageLevel = content.readUnsignedByte();
            loc.setVoltageMv(voltageLevel * 1000);  // coarse 0-6 → 0-6000 mV (no precise value here)
            loc.setGsmSignal((int) content.readUnsignedByte());
            loc.setAlarmCode(content.readUnsignedByte());
            content.readUnsignedByte();  // language byte — discarded
        }
        return loc;
    }

    /**
     * Decode the 5-byte status block of a heartbeat (0x13) packet:
     * <pre>
     *   [device-status:1][voltage-level:1][gsm-strength:1][alarm-code:1][language:1]
     * </pre>
     * Returns null if the content is shorter than the status block (some firmware
     * sends a bare heartbeat with only the serial). Status carries ACC bit, voltage
     * level (coarse), GSM strength — everything we need to keep the device UI fresh
     * between location packets.
     */
    public HeartbeatStatus decodeHeartbeat(ByteBuf content) {
        return decodeHeartbeat(content, false);
    }

    /**
     * @param modules true for the Jimi 0x36 heartbeat, whose status block is followed by
     *                {@code [type:2][len:1][data]} modules. Known ones (PL601, checked against
     *                the tracker's own BMT# / STATUS# answers): 0x0018 battery voltage in
     *                0.01 V, 0x006A battery percent. Others are skipped.
     */
    public HeartbeatStatus decodeHeartbeat(ByteBuf content, boolean modules) {
        if (content.readableBytes() < 5) return null;
        int status = content.readUnsignedByte();
        int voltageLevel = content.readUnsignedByte();
        int gsm = content.readUnsignedByte();
        int alarm = content.readUnsignedByte();
        content.readUnsignedByte();  // language byte
        boolean accOn = (status & 0x02) != 0;

        Integer batteryPercent = null;
        Integer batteryMv = null;
        while (modules && content.readableBytes() >= 3) {
            int type = content.readUnsignedShort();
            int len = content.readUnsignedByte();
            if (len > content.readableBytes()) break;
            if (type == 0x006A && len == 1) {
                int pct = content.readUnsignedByte();
                if (pct <= 100) batteryPercent = pct;
            } else if (type == 0x0018 && len == 2) {
                batteryMv = content.readUnsignedShort() * 10;
            } else {
                content.skipBytes(len);
            }
        }
        return new HeartbeatStatus(accOn, voltageLevel, gsm, alarm, batteryPercent, batteryMv);
    }

    /**
     * The 0-6 voltage level of a GT06 status block as a rough battery percentage, for trackers
     * that report no exact figure (the 2G personal trackers on production, 2026-10-21, send only
     * this). Concox levels: 0 no power, 1 extremely low, 2 very low (low-battery alarm), 3 low,
     * 4 medium, 5 high, 6 full. Null for anything else.
     */
    public static Integer batteryPercentOfLevel(int voltageLevel) {
        return switch (voltageLevel) {
            case 0 -> 0;
            case 1 -> 5;
            case 2 -> 10;
            case 3 -> 25;
            case 4 -> 50;
            case 5 -> 75;
            case 6 -> 100;
            default -> null;
        };
    }

    /**
     * Heartbeat status snapshot. voltageLevel is coarse 0-6, gsmSignal is 0-31
     * (some firmware: 0-4). Both are best-effort indicators, not precise values.
     */
    public record HeartbeatStatus(boolean accOn, int voltageLevel, int gsmSignal, int alarmCode,
                                  Integer batteryPercent, Integer batteryMv) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Jimi IoT Protocol V3.2 Decoders
    // ─────────────────────────────────────────────────────────────────────────

    /** An alarm that arrived as a network scan: what the tracker heard, and the alarm code. */
    public record ScanAlarm(NetworkScan scan, int alarmCode) {}

    /**
     * Decode a Jimi 0xA9 packet: an alarm raised while the tracker has no GPS fix (indoors),
     * e.g. low battery or SOS. Captured from a PL601 on production, 2026-10-02:
     * <pre>
     *   [date-time:6][mcc:2, bit 15 set = 2-byte mnc][mnc:1|2][?:1][cell-count:1]
     *   n x [lac:4][cell-id:8][signal:1]
     *   [timing-advance:1][wifi-count:1] m x [mac:6][signal:1]
     *   [alarm-code:1][language:1]
     * </pre>
     * The alarm code is read from the end of the packet, so it survives even if the variable
     * part is laid out differently on other firmware; the scan is then simply left empty.
     */
    /** A Jimi 4G alarm: the position if it has one, and the GT06 alarm code. */
    public record Alarm4G(LocationData location, int alarmCode) {}

    /**
     * Jimi 0xA3 (alarm with GPS, 4G). Captured from the production PL601 (2026-10-03):
     * {@code 1a0a0305 1534 cf 028c6350 09b24952 00 1400 10 81d6 0002 0000bd29 0000000001fcbf16 40 03 04 01 02}
     * = date, GPS byte, lat, lng, speed, course/status, LBS length (16), MCC (bit 15 = 2-byte MNC),
     * MNC, LAC(4), cell(8), terminal info, voltage level, GSM level, alarm (0x01 SOS), language.
     */
    public Alarm4G decodeGpsAlarm4G(ByteBuf content) {
        int end = content.writerIndex();
        int alarmCode = content.readableBytes() >= 2 ? content.getUnsignedByte(end - 2) : 0;
        LocationData loc = new LocationData();
        loc.setProtocolNumber(PacketType.JIMI_GPS_ALARM_4G);
        loc.setTimestamp(decodeDateTime(content));
        int gpsByte = content.readUnsignedByte();
        loc.setGpsInfoLength((gpsByte >> 4) & 0x0F);
        loc.setSatellites(gpsByte & 0x0F);
        long latRaw = content.readUnsignedInt();
        long lonRaw = content.readUnsignedInt();
        loc.setSpeed(content.readUnsignedByte());
        int courseStatus = content.readUnsignedShort();
        loc.setCourse(courseStatus & 0x03FF);
        loc.setValid((courseStatus & 0x1000) != 0);
        double lat = latRaw / 1_800_000.0, lon = lonRaw / 1_800_000.0;
        if ((courseStatus & 0x0400) == 0) lat = -lat;
        if ((courseStatus & 0x0800) != 0) lon = -lon;
        loc.setLatitude(lat);
        loc.setLongitude(lon);
        try {
            int lbsLength = content.readUnsignedByte();
            int lbsStart = content.readerIndex();
            int mcc = content.readUnsignedShort();
            loc.setMcc(mcc & 0x7FFF);
            loc.setMnc((mcc & 0x8000) != 0 ? content.readUnsignedShort() : content.readUnsignedByte());
            loc.setLac((int) content.readUnsignedInt());
            loc.setCellId(content.readLong());
            content.readerIndex(lbsStart + lbsLength);
            if (content.readableBytes() >= 3) {
                int info = content.readUnsignedByte();
                loc.setAccOn((info & 0x02) != 0);
                content.readUnsignedByte();                     // voltage level
                loc.setGsmSignal((int) content.readUnsignedByte());
            }
        } catch (IndexOutOfBoundsException e) {
            // The position is what matters; a short cell block is not worth losing an SOS over.
        }
        loc.setAlarmCode(alarmCode);
        return new Alarm4G(loc, alarmCode);
    }

    /** Jimi 0xA5 (alarm with only the serving cell, 4G): no date and no position; the alarm code is second to last. */
    public int decodeLbsAlarm4GCode(ByteBuf content) {
        return content.readableBytes() >= 2 ? content.getUnsignedByte(content.writerIndex() - 2) : 0;
    }

    public ScanAlarm decodeScanAlarm(ByteBuf content) {
        int end = content.writerIndex();
        int alarmCode = content.readableBytes() >= 2 ? content.getUnsignedByte(end - 2) : 0;
        java.time.Instant ts = decodeDateTime(content);
        int mccRaw = content.readUnsignedShort();
        int mnc = (mccRaw & 0x8000) != 0 ? content.readUnsignedShort() : content.readUnsignedByte();
        java.util.List<NetworkScan.Cell> cells = new java.util.ArrayList<>();
        java.util.List<NetworkScan.Wifi> aps = new java.util.ArrayList<>();
        try {
            content.readUnsignedByte();
            int cellCount = content.readUnsignedByte();
            for (int i = 0; i < cellCount && i < NETWORK_SCAN_CELLS; i++) {
                long lac = content.readUnsignedInt();
                long cellId = content.readLong();
                int signal = content.readUnsignedByte();
                if (cellId > 0) cells.add(new NetworkScan.Cell(lac, cellId, signal));
            }
            content.readUnsignedByte();  // timing advance
            int wifiCount = content.readUnsignedByte();
            // Everything between here and the trailing [alarm][language] must be whole access points.
            if (content.readableBytes() - 2 == wifiCount * 7) {
                for (int i = 0; i < wifiCount; i++) {
                    byte[] mac = new byte[6];
                    content.readBytes(mac);
                    int signal = content.readUnsignedByte();
                    StringBuilder sb = new StringBuilder(17);
                    for (int b = 0; b < 6; b++) {
                        if (b > 0) sb.append(':');
                        sb.append(String.format("%02x", mac[b] & 0xFF));
                    }
                    aps.add(new NetworkScan.Wifi(sb.toString(), -signal));
                }
            } else {
                cells.clear();   // layout is not the one we know: trust nothing but the alarm code
            }
        } catch (IndexOutOfBoundsException e) {
            cells.clear();
            aps.clear();
        }
        return new ScanAlarm(new NetworkScan(ts, mccRaw & 0x7FFF, mnc, "lte",
                java.util.List.copyOf(cells), java.util.List.copyOf(aps)), alarmCode);
    }

    /** Cell slots in a 0xA1 / 0xA2 packet: the serving cell and six neighbours. */
    private static final int NETWORK_SCAN_CELLS = 7;

    /**
     * Decode a Jimi network scan. The tracker sends these instead of a location packet while
     * it has no GPS fix: 0xA1 / 0xA2 on a 4G cell, 0x28 / 0x2C on a 2G or 3G cell (the same
     * tracker switches between the two families as coverage changes).
     * <pre>
     *   [date-time:6][mcc:2, bit 15 set = 2-byte mnc][mnc:1|2]
     *   7 x [lac][cell-id][signal:1]            (unused slots are all zero)
     *        4G: lac 4 bytes, cell-id 8 bytes       2G/3G: lac 2 bytes, cell-id 3 bytes
     *   [timing-advance:1]
     *   0xA2 / 0x2C: [wifi-count:1] n x [mac:6][signal:1]      0xA1 / 0x28: [language:2]
     * </pre>
     * Wi-Fi signal is the magnitude of the dBm value (0x35 = -53 dBm).
     *
     * @param lte true for the 4G layout (0xA1 / 0xA2)
     */
    public NetworkScan decodeNetworkScan(ByteBuf content, boolean wifi, boolean lte) {
        java.time.Instant ts = decodeDateTime(content);
        int mccRaw = content.readUnsignedShort();
        int mnc = (mccRaw & 0x8000) != 0 ? content.readUnsignedShort() : content.readUnsignedByte();

        java.util.List<NetworkScan.Cell> cells = new java.util.ArrayList<>(NETWORK_SCAN_CELLS);
        int slot = lte ? 13 : 6;
        for (int i = 0; i < NETWORK_SCAN_CELLS && content.readableBytes() >= slot; i++) {
            long lac = lte ? content.readUnsignedInt() : content.readUnsignedShort();
            long cellId = lte ? content.readLong() : content.readUnsignedMedium();
            int signal = content.readUnsignedByte();
            if (cellId > 0) cells.add(new NetworkScan.Cell(lac, cellId, signal));
        }

        java.util.List<NetworkScan.Wifi> aps = new java.util.ArrayList<>();
        if (wifi && content.readableBytes() >= 2) {
            content.readUnsignedByte();  // timing advance
            int count = content.readUnsignedByte();
            for (int i = 0; i < count && content.readableBytes() >= 7; i++) {
                byte[] mac = new byte[6];
                content.readBytes(mac);
                int signal = content.readUnsignedByte();
                StringBuilder sb = new StringBuilder(17);
                for (int b = 0; b < 6; b++) {
                    if (b > 0) sb.append(':');
                    sb.append(String.format("%02x", mac[b] & 0xFF));
                }
                aps.add(new NetworkScan.Wifi(sb.toString(), -signal));
            }
        }
        // A 3-byte cell id above 65535 can only be a 3G (UTRAN) cell.
        String radio = lte ? "lte" : cells.stream().anyMatch(c -> c.cellId() > 0xFFFF) ? "wcdma" : "gsm";
        return new NetworkScan(ts, mccRaw & 0x7FFF, mnc, radio, java.util.List.copyOf(cells), java.util.List.copyOf(aps));
    }

    /**
     * Decode a Jimi 0x26 alarm packet. Layout is similar to GT06 alarm but with
     * Jimi-specific alarm codes:
     * <pre>
     *   [date-time:6][gps-info:1][lat:4][lon:4][speed:1][course-status:2]
     *   [mcc:2][mnc:1][lac:2][cell-id:3]
     *   [acc:1][upload-mode:1][gps-real:1][mileage:4]
     *   [status:1][alarm-code:1][reserve:2]
     * </pre>
     */
    public LocationData decodeJimiAlarm(ByteBuf content) {
        LocationData loc = new LocationData();
        loc.setProtocolNumber(PacketType.JIMI_ALARM);
        loc.setTimestamp(decodeDateTime(content));

        int gpsByte = content.readUnsignedByte();
        loc.setGpsInfoLength((gpsByte >> 4) & 0x0F);
        loc.setSatellites(gpsByte & 0x0F);

        long latRaw = content.readUnsignedInt();
        long lonRaw = content.readUnsignedInt();
        loc.setSpeed(content.readUnsignedByte());

        int courseStatus = content.readUnsignedShort();
        loc.setCourse(courseStatus & 0x03FF);
        loc.setValid((courseStatus & 0x1000) != 0);
        boolean south = (courseStatus & 0x0400) == 0;
        boolean west = (courseStatus & 0x0800) != 0;

        // Jimi uses the same coordinate encoding as GT06 V3/V4/4G
        double lat = latRaw / 1_800_000.0;
        double lon = lonRaw / 1_800_000.0;
        if (south) lat = -lat;
        if (west) lon = -lon;
        loc.setLatitude(lat);
        loc.setLongitude(lon);

        // LBS data
        if (content.readableBytes() >= 8) {
            loc.setMcc(content.readUnsignedShort());
            loc.setMnc(content.readUnsignedByte());
            loc.setLac(content.readUnsignedShort());
            loc.setCellId(read24BitInt(content));
        }

        // Extended Jimi fields
        if (content.readableBytes() >= 7) {
            loc.setAccOn(content.readUnsignedByte() == 1);
            loc.setUploadMode((int) content.readUnsignedByte());
            loc.setRealtimeFlag((int) content.readUnsignedByte());
            loc.setMileageMeters(content.readUnsignedInt() * 1000L);  // km → m
        }

        // Status and alarm code
        if (content.readableBytes() >= 2) {
            int status = content.readUnsignedByte();
            loc.setAccOn((status & 0x02) != 0);  // Override with status byte ACC
            loc.setAlarmCode(content.readUnsignedByte());
        }

        // Skip reserved bytes if present
        if (content.readableBytes() >= 2) {
            content.skipBytes(2);
        }

        return loc;
    }

    /**
     * Decode a Jimi LBS-only alarm (0x19). No GPS coordinates, only cell tower info.
     * <pre>
     *   [date-time:6][mcc:2][mnc:1][lac:2][cell-id:3]
     *   [status:1][alarm-code:1][language:1]
     * </pre>
     */
    public LocationData decodeJimiLbsAlarm(ByteBuf content) {
        LocationData loc = new LocationData();
        loc.setProtocolNumber(PacketType.JIMI_LBS_ALARM);
        loc.setTimestamp(decodeDateTime(content));

        // LBS data only — no GPS
        if (content.readableBytes() >= 8) {
            loc.setMcc(content.readUnsignedShort());
            loc.setMnc(content.readUnsignedByte());
            loc.setLac(content.readUnsignedShort());
            loc.setCellId(read24BitInt(content));
        }

        // No actual coordinates — set to 0,0 with valid=false
        loc.setLatitude(0);
        loc.setLongitude(0);
        loc.setValid(false);

        // Status block
        if (content.readableBytes() >= 3) {
            int status = content.readUnsignedByte();
            loc.setAccOn((status & 0x02) != 0);
            loc.setAlarmCode(content.readUnsignedByte());
            content.readUnsignedByte();  // language byte — discarded
        }

        return loc;
    }

    /**
     * Decode Jimi info transmission packet (0x94).
     * Contains sub-protocol and variable content based on sub-protocol type.
     */
    public String decodeJimiInfoTransmission(ByteBuf content) {
        if (content.readableBytes() < 2) {
            return "Empty info packet";
        }

        int subProtocol = content.readUnsignedByte();
        int infoLength = content.readUnsignedByte();

        if (content.readableBytes() < infoLength) {
            return "Sub-protocol: 0x" + Integer.toHexString(subProtocol) + ", truncated";
        }

        byte[] infoBytes = new byte[infoLength];
        content.readBytes(infoBytes);

        return switch (subProtocol) {
            case 0x00 -> "External power voltage: " + bytesToInt(infoBytes) + " mV";
            case 0x01 -> "Terminal state: 0x" + bytesToHex(infoBytes);
            case 0x02 -> "Signal strength: " + (infoBytes.length > 0 ? infoBytes[0] & 0xFF : 0);
            case 0x03 -> "Device ID: " + new String(infoBytes, java.nio.charset.StandardCharsets.US_ASCII);
            case 0x04 -> "Device IMEI: " + new String(infoBytes, java.nio.charset.StandardCharsets.US_ASCII);
            case 0x05 -> "ICCID: " + new String(infoBytes, java.nio.charset.StandardCharsets.US_ASCII);
            case 0x06 -> "Firmware version: " + new String(infoBytes, java.nio.charset.StandardCharsets.US_ASCII);
            default -> "Sub-protocol 0x" + Integer.toHexString(subProtocol) + ": " + bytesToHex(infoBytes);
        };
    }

    private static int bytesToInt(byte[] bytes) {
        int result = 0;
        for (byte b : bytes) {
            result = (result << 8) | (b & 0xFF);
        }
        return result;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b & 0xFF));
        }
        return sb.toString();
    }

    private static java.time.Instant decodeDateTime(ByteBuf buf) {
        int yy = buf.readUnsignedByte();
        int mo = buf.readUnsignedByte();
        int dd = buf.readUnsignedByte();
        int hh = buf.readUnsignedByte();
        int mi = buf.readUnsignedByte();
        int ss = buf.readUnsignedByte();
        return LocalDateTime.of(2000 + yy, mo, dd, hh, mi, ss).toInstant(ZoneOffset.UTC);
    }

    private static long read24BitInt(ByteBuf buf) {
        int hi = buf.readUnsignedByte();
        int mid = buf.readUnsignedByte();
        int lo = buf.readUnsignedByte();
        return ((long) hi << 16) | (mid << 8) | lo;
    }
}
