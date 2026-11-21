package com.webinnovation.eyeon.protocol;

import java.time.Instant;
import java.util.List;

/**
 * What a tracker can hear when it has no GPS fix: the serving cell, its neighbours and,
 * for 0xA2 / 0x2C packets, nearby Wi-Fi access points. Decoded from Jimi scan packets and
 * turned into coordinates by a geolocation service (see NetworkLocationService).
 *
 * @param radio "lte", "gsm" or "wcdma": the cell family the ids belong to
 * @param cells serving cell first; empty slots in the packet are dropped
 */
public record NetworkScan(Instant ts, int mcc, int mnc, String radio, List<Cell> cells, List<Wifi> wifi) {

    /** On 4G {@code lac} is the tracking area code and {@code cellId} the 28-bit E-UTRAN cell id. */
    public record Cell(long lac, long cellId, int rawSignal) {}

    /** @param mac lower-case, colon separated; {@code rssiDbm} is negative */
    public record Wifi(String mac, int rssiDbm) {}

    /**
     * An address that names one real access point. Trackers also report placeholders -
     * {@code 00:00:00:00:00:00} and {@code ff:ff:ff:ff:ff:ff} (the HongMi watch, 65 times in three
     * days) - and Google refuses the whole request when one is in it ("Invalid macAddress field"),
     * so the scan gave no position at all. A group address (lowest bit of the first byte set) is
     * never an access point either.
     */
    public static boolean usableMac(String mac) {
        if (mac == null || mac.length() != 17) return false;
        String hex = mac.replace(":", "").replace("-", "").toLowerCase(java.util.Locale.ROOT);
        if (hex.length() != 12 || !hex.matches("[0-9a-f]{12}")) return false;
        if (hex.equals("000000000000") || hex.equals("ffffffffffff")) return false;
        return (Integer.parseInt(hex.substring(0, 2), 16) & 1) == 0;
    }

    /** This scan without the access points no service would accept (see {@link #usableMac}). */
    public NetworkScan withUsableWifi() {
        List<Wifi> usable = wifi.stream().filter(ap -> usableMac(ap.mac())).toList();
        return usable.size() == wifi.size() ? this : new NetworkScan(ts, mcc, mnc, radio, cells, usable);
    }

    public boolean hasWifi() {
        return !wifi.isEmpty();
    }
}
