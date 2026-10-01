package com.webinnovation.eyeon.protocol;

import java.time.Instant;
import java.util.List;

/**
 * What a tracker can hear when it has no GPS fix: the serving cell, its neighbours and,
 * for 0xA2 packets, nearby Wi-Fi access points. Decoded from Jimi 0xA1 / 0xA2 packets and
 * turned into coordinates by a geolocation service (see NetworkLocationService).
 *
 * @param cells serving cell first; empty slots in the packet are dropped
 */
public record NetworkScan(Instant ts, int mcc, int mnc, List<Cell> cells, List<Wifi> wifi) {

    /** 4G cell: {@code lac} is the tracking area code, {@code cellId} the 28-bit E-UTRAN cell id. */
    public record Cell(long lac, long cellId, int rawSignal) {}

    /** @param mac lower-case, colon separated; {@code rssiDbm} is negative */
    public record Wifi(String mac, int rssiDbm) {}

    public boolean hasWifi() {
        return !wifi.isEmpty();
    }
}
