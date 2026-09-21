package com.webinnovation.motolink.protocol;

/**
 * Protocol numbers for GT06 (Concox) and Jimi IoT GPS trackers.
 * Values are the on-the-wire byte. See CLAUDE.md §6.2.
 *
 * GT06 Protocol V3.0 (Concox): JC400, GT06N, etc.
 * Jimi IoT Protocol V3.2: JM-VL02, JM-VG03, JM-VG04, EG02, EG03, JM01,
 *                         JV200, GT300, GT800, MT200, OB22, X3, Q2,
 *                         GT08, Wetrack lite, ET25, HVT001
 */
public final class PacketType {

    // ─────────────────────────────────────────────────────────────────────────
    // Common to GT06 and Jimi IoT
    // ─────────────────────────────────────────────────────────────────────────
    public static final int LOGIN = 0x01;

    // ─────────────────────────────────────────────────────────────────────────
    // GT06 Protocol (Concox)
    // ─────────────────────────────────────────────────────────────────────────
    public static final int LOCATION_V18 = 0x12;       // V1.8: lat/lng = (deg×60 + min) × 30000
    public static final int LOCATION_V3 = 0x22;        // V3: lat/lng = raw / 1800000
    public static final int LOCATION_V4 = 0x32;        // V4: V3 + 4-byte cell ID, voltage
    public static final int LOCATION_4G = 0xA0;        // 4G: 4-byte LAC, 8-byte cell ID
    public static final int HEARTBEAT = 0x13;          // GT06 heartbeat/status
    public static final int ALARM = 0x16;              // GT06 alarm packet
    public static final int RFID = 0x17;               // Driver RFID swipe
    public static final int COMMAND_REPLY = 0x15;      // Response to 0x80 server command
    public static final int SERVER_COMMAND = 0x80;     // DYD, HFYD, DWXX, etc.
    public static final int ADDRESS_QUERY = 0x1A;      // Phone-initiated

    // ─────────────────────────────────────────────────────────────────────────
    // Jimi IoT Protocol V3.2
    // Note: 0x22 is shared with GT06 V3 location but Jimi doesn't require ACK
    // ─────────────────────────────────────────────────────────────────────────
    public static final int JIMI_HEARTBEAT = 0x23;     // EG02/EG03 heartbeat (different from GT06)
    public static final int JIMI_ALARM = 0x26;         // Jimi alarm packet
    public static final int JIMI_ALARM_HVT001 = 0x27;  // HVT001 alarm
    public static final int JIMI_LBS_ALARM = 0x19;     // LBS alarm (cell-tower only)
    public static final int JIMI_LBS_EXTENSION = 0x28; // LBS extension data
    public static final int JIMI_WIFI = 0x2C;          // WiFi positioning data
    public static final int JIMI_TIME_CALIBRATION = 0x8A; // Time sync request
    public static final int JIMI_INFO_TRANSMISSION = 0x94; // Device info upload

    private PacketType() {}

    /** Check if protocol number is a location packet (GT06 or Jimi). */
    public static boolean isLocation(int proto) {
        return proto == LOCATION_V18
                || proto == LOCATION_V3
                || proto == LOCATION_V4
                || proto == LOCATION_4G;
    }

    /** Check if protocol number is a Jimi IoT specific packet. */
    public static boolean isJimiProtocol(int proto) {
        return proto == JIMI_HEARTBEAT
                || proto == JIMI_ALARM
                || proto == JIMI_ALARM_HVT001
                || proto == JIMI_LBS_ALARM
                || proto == JIMI_LBS_EXTENSION
                || proto == JIMI_WIFI
                || proto == JIMI_TIME_CALIBRATION
                || proto == JIMI_INFO_TRANSMISSION;
    }

    /** Check if protocol number is a heartbeat (GT06 or Jimi). */
    public static boolean isHeartbeat(int proto) {
        return proto == HEARTBEAT || proto == JIMI_HEARTBEAT;
    }

    /** Check if protocol number is an alarm (GT06 or Jimi). */
    public static boolean isAlarm(int proto) {
        return proto == ALARM
                || proto == JIMI_ALARM
                || proto == JIMI_ALARM_HVT001
                || proto == JIMI_LBS_ALARM;
    }
}
