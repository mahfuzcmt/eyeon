package com.webinnovation.eyeon.protocol;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The payload of a smart-watch location report or alarm (UD, UD2, UD_LTE, AL, AL_LTE, ...):
 *
 * <pre>date,time,A|V,lat,N|S,lon,E|W,speed,course,altitude,satellites,gsm,battery,steps,rolls,status,
 * cells,TA,MCC,MNC,(LAC,CID,signal)*,wifis,(SSID,MAC,rssi)*,accuracy</pre>
 *
 * Date and time are the watch's clock in UTC. Without a GPS fix ({@code V}) the coordinates are
 * the last fix repeated, so the position has to come from the cells and Wi-Fi access points.
 *
 * @param speedKmh  as sent, km/h
 * @param gsm       signal 0-100
 * @param battery   percent 0-100
 * @param status    terminal status bits; 16 = SOS, 17 = low battery (alarm reports)
 * @param radio     "lte", "wcdma" or "gsm": the cell family, from the command suffix
 */
public record WatchReport(Instant ts, boolean valid, double latitude, double longitude, double speedKmh,
                          double course, int satellites, int gsm, int battery, int steps, long status,
                          int mcc, int mnc, String radio, List<NetworkScan.Cell> cells,
                          List<NetworkScan.Wifi> wifi) {

    private static final Pattern MAC = Pattern.compile("([0-9a-f]{2}:){5}[0-9a-f]{2}");
    private static final int STATUS_SOS = 1 << 16;
    private static final int STATUS_LOW_BATTERY = 1 << 17;

    public boolean sos() {
        return (status & STATUS_SOS) != 0;
    }

    public boolean lowBattery() {
        return (status & STATUS_LOW_BATTERY) != 0;
    }

    /** Is there anything to ask a geolocation service about? */
    public boolean hasScan() {
        return !cells.isEmpty() || !wifi.isEmpty();
    }

    public NetworkScan scan(Instant at) {
        return new NetworkScan(at, mcc, mnc, radio, cells, wifi);
    }

    /**
     * @param command the frame's command name, e.g. "UD_LTE"
     * @param a       the fields after it
     * @throws IllegalArgumentException when the fixed part (the first 16 fields) does not parse;
     *                                  a damaged cell / Wi-Fi tail is tolerated and cut short
     */
    public static WatchReport parse(String command, String[] a) {
        if (a.length < 16) {
            throw new IllegalArgumentException("watch report has " + a.length + " fields, needs 16");
        }
        try {
            Instant ts = timestamp(a[0], a[1]);
            double lat = Double.parseDouble(a[3]) * ("S".equalsIgnoreCase(a[4]) ? -1 : 1);
            double lon = Double.parseDouble(a[5]) * ("W".equalsIgnoreCase(a[6]) ? -1 : 1);
            int mcc = 0, mnc = 0;
            List<NetworkScan.Cell> cells = new ArrayList<>();
            List<NetworkScan.Wifi> wifi = new ArrayList<>();
            try {
                int i = 16;
                int nCells = Integer.parseInt(a[i++].trim());
                if (nCells > 0) {
                    i++;  // timing advance
                    mcc = Integer.parseInt(a[i++].trim());
                    mnc = Integer.parseInt(a[i++].trim());
                    for (int n = 0; n < nCells; n++, i += 3) {
                        long lac = Long.parseLong(a[i].trim());
                        long cid = Long.parseLong(a[i + 1].trim());
                        if (lac > 0 && cid > 0) {
                            cells.add(new NetworkScan.Cell(lac, cid, Integer.parseInt(a[i + 2].trim())));
                        }
                    }
                }
                int nWifi = Integer.parseInt(a[i++].trim());
                for (int n = 0; n < nWifi; n++, i += 3) {
                    String mac = a[i + 1].trim().toLowerCase(Locale.ROOT);
                    int rssi = Integer.parseInt(a[i + 2].trim());
                    if (MAC.matcher(mac).matches()) {
                        wifi.add(new NetworkScan.Wifi(mac, rssi));
                    }
                }
            } catch (NumberFormatException | ArrayIndexOutOfBoundsException tail) {
                // keep what was read before the damage
            }
            return new WatchReport(ts, "A".equalsIgnoreCase(a[2]), lat, lon,
                    Double.parseDouble(a[7]), Double.parseDouble(a[8]),
                    Integer.parseInt(a[10].trim()), Integer.parseInt(a[11].trim()), Integer.parseInt(a[12].trim()),
                    Integer.parseInt(a[13].trim()), Long.parseLong(a[15].trim(), 16),
                    mcc, mnc, radio(command, cells), List.copyOf(cells), List.copyOf(wifi));
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("watch report does not parse: " + e.getMessage(), e);
        }
    }

    /** ddMMyy + HHmmss, UTC. */
    private static Instant timestamp(String date, String time) {
        if (date.length() != 6 || time.length() != 6) {
            throw new IllegalArgumentException("date/time '" + date + "','" + time + "'");
        }
        return LocalDateTime.of(2000 + Integer.parseInt(date.substring(4, 6)), Integer.parseInt(date.substring(2, 4)),
                Integer.parseInt(date.substring(0, 2)), Integer.parseInt(time.substring(0, 2)),
                Integer.parseInt(time.substring(2, 4)), Integer.parseInt(time.substring(4, 6))).toInstant(ZoneOffset.UTC);
    }

    private static String radio(String command, List<NetworkScan.Cell> cells) {
        if (command.endsWith("_LTE")) return "lte";
        if (command.endsWith("_WCDMA") || command.endsWith("_TDSCDMA")) return "wcdma";
        // A plain UD / AL from a 4G watch: a cell id beyond 16 bits is an E-UTRAN cell id.
        return !cells.isEmpty() && cells.get(0).cellId() > 0xFFFF ? "lte" : "gsm";
    }
}
