package com.webinnovation.motolink.protocol;

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
        if (content.readableBytes() < 5) return null;
        int status = content.readUnsignedByte();
        int voltageLevel = content.readUnsignedByte();
        int gsm = content.readUnsignedByte();
        int alarm = content.readUnsignedByte();
        content.readUnsignedByte();  // language byte
        boolean accOn = (status & 0x02) != 0;
        return new HeartbeatStatus(accOn, voltageLevel, gsm, alarm);
    }

    /**
     * Heartbeat status snapshot. voltageLevel is coarse 0-6, gsmSignal is 0-31
     * (some firmware: 0-4). Both are best-effort indicators, not precise values.
     */
    public record HeartbeatStatus(boolean accOn, int voltageLevel, int gsmSignal, int alarmCode) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Jimi IoT Protocol V3.2 Decoders
    // ─────────────────────────────────────────────────────────────────────────

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
