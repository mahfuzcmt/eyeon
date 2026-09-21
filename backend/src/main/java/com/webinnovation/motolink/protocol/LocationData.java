package com.webinnovation.motolink.protocol;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/**
 * Mutable decoder output for a single location packet.
 * Populated by PacketDecoder, consumed by LocationService.saveAndBroadcast.
 */
@Data
public class LocationData {
    private String imei;
    private UUID orgId;
    private int protocolNumber;
    private Instant timestamp;
    private int gpsInfoLength;
    private int satellites;
    private double latitude;
    private double longitude;
    private int speed;
    private int course;
    private boolean valid;
    private int mcc;
    private int mnc;
    private int lac;
    private long cellId;
    private Boolean accOn;
    private Integer uploadMode;
    private Integer realtimeFlag;
    private Long mileageMeters;
    private Integer voltageMv;
    private Long accOnTimeSeconds;
    private Integer gsmSignal;
    private byte[] rawPayload;

    /**
     * GT06 alarm code from the 0x16 packet — 0 means a normal location packet.
     * Decoded values: 1=shock, 2=power cut, 3=low battery, 4=SOS (CLAUDE.md §6.5).
     */
    private int alarmCode;
}
