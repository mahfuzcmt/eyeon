package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.protocol.NetworkScan;
import com.webinnovation.eyeon.service.CellLocationService.CellLocation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Positions for trackers that have no GPS fix: indoors, a personal tracker reports the cell
 * towers and Wi-Fi access points it can hear (Jimi 0xA1 / 0xA2) every 10 seconds. This turns
 * such a scan into a location row.
 *
 * <p>A geolocation request costs money, so one is made only when the tracker's surroundings
 * changed: while most of the access points are the ones seen at the last resolved position
 * (a child sitting in a classroom), that position is reused. When the surroundings do change,
 * requests are spaced at least {@code eyeon.geolocation.min-interval-seconds} apart per
 * tracker; scans in between only refresh presence.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NetworkLocationService {

    /** A Wi-Fi estimate at least this precise is treated like a GPS fix (moves the marker, checks places). */
    static final int GOOD_ACCURACY_M = 200;
    /** A 0xA1 (cells only) scan is ignored while 0xA2 (cells + Wi-Fi) scans keep arriving. */
    private static final Duration WIFI_SCAN_RECENT = Duration.ofMinutes(2);

    private final CellLocationService geolocation;
    private final LocationService locationService;
    private final DeviceService deviceService;

    @Value("${eyeon.geolocation.min-interval-seconds:60}")
    private int minIntervalSeconds = 60;

    private record Resolved(Set<String> macs, long servingCell, CellLocation where) {}

    private final ConcurrentHashMap<String, Resolved> lastResolved = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> lastRequestAt = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> lastWifiScanAt = new ConcurrentHashMap<>();
    /** Last GPS fix with its speed, per tracker (fed by LocationService). */
    private record Fix(Instant at, double lat, double lng, int speedKmh) {}
    private final ConcurrentHashMap<String, Fix> lastGps = new ConcurrentHashMap<>();
    /** Set while the tracker says it is in a GPS blind area (alarm code 0x0A until 0x0B). */
    private final ConcurrentHashMap<String, Instant> gpsLostAt = new ConcurrentHashMap<>();

    /**
     * A tracker that was moving at vehicle speed when it lost GPS is probably in a vehicle - a metro
     * car, a bus. The Wi-Fi it hears there travels with it (the train's own access points,
     * passengers' hotspots), so a Wi-Fi answer is wherever those were last seen, and the "same
     * access points as last time" reuse below would freeze the person there. Seen on production
     * 2026-10-03 22:14-22:21: the map showed Secretariat for 7 minutes while the train went to
     * Farmgate. While travelling, network positions are stored as not valid (they do not move the
     * marker or trigger places) and the reuse is skipped.
     */
    static final int TRAVEL_KMH = 15;
    static final Duration TRAVEL_MEMORY = Duration.ofMinutes(15);
    /** A network position implying more than this speed from the last fix is a wrong answer. */
    static final double MAX_PLAUSIBLE_MPS = 35;

    public void noteGpsFix(String imei, Instant at, double lat, double lng, int speedKmh) {
        lastGps.put(imei, new Fix(at, lat, lng, speedKmh));
        gpsLostAt.remove(imei);
    }

    public void gpsLost(String imei) {
        gpsLostAt.put(imei, Instant.now());
    }

    public void gpsBack(String imei) {
        gpsLostAt.remove(imei);
    }

    /** Was the tracker last seen moving at vehicle speed, recently enough to still be in that vehicle? */
    boolean travelling(String imei, Instant now) {
        Fix f = lastGps.get(imei);
        return f != null && f.speedKmh() >= TRAVEL_KMH && f.at().isAfter(now.minus(TRAVEL_MEMORY));
    }

    /** Would reaching this position from the last GPS fix need an impossible speed? */
    boolean implausible(String imei, double lat, double lng, Instant at) {
        Fix f = lastGps.get(imei);
        if (f == null) return false;
        double seconds = Math.max(1, Math.abs(Duration.between(f.at(), at).toSeconds()));
        return StayDetector.meters(f.lat(), f.lng(), lat, lng) / seconds > MAX_PLAUSIBLE_MPS;
    }

    /** Called on the ingest executor for every decoded scan packet. */
    public void onScan(String imei, UUID orgId, int protocolNumber, NetworkScan scan, byte[] raw) {
        onScan(imei, orgId, protocolNumber, scan, raw, false);
    }

    /**
     * @param urgent the scan came with an alarm (SOS, low battery): resolve it even if the
     *               tracker was asked about less than the minimum interval ago
     * @return the stored position, or empty when the scan could not be resolved
     */
    public Optional<LocationData> onScan(String imei, UUID orgId, int protocolNumber, NetworkScan scan,
                                         byte[] raw, boolean urgent) {
        Instant now = Instant.now();
        if (urgent) {
            lastRequestAt.remove(imei);
        } else if (scan.hasWifi()) {
            lastWifiScanAt.put(imei, now);
        } else {
            Instant wifiAt = lastWifiScanAt.get(imei);
            if (wifiAt != null && wifiAt.isAfter(now.minus(WIFI_SCAN_RECENT))) {
                deviceService.markOnline(imei);  // its Wi-Fi twin, sent in the same second, carries the position
                return Optional.empty();
            }
        }

        // Both times are the tracker's clock, so a replayed backlog is judged consistently.
        boolean travelling = travelling(imei, scan.ts());
        Optional<CellLocation> where = resolve(imei, scan, now, travelling);
        if (where.isEmpty()) {
            deviceService.markOnline(imei);
            return Optional.empty();
        }

        CellLocation w = where.get();
        boolean precise = scan.hasWifi() && w.getAccuracyMeters() <= GOOD_ACCURACY_M
                && !travelling && !implausible(imei, w.getLatitude(), w.getLongitude(), scan.ts());
        LocationData loc = new LocationData();
        loc.setImei(imei);
        loc.setOrgId(orgId);
        loc.setProtocolNumber(protocolNumber);
        loc.setTimestamp(scan.ts());
        loc.setLatitude(w.getLatitude());
        loc.setLongitude(w.getLongitude());
        loc.setValid(precise);
        loc.setPositionSource(precise ? "WIFI" : "LBS");
        loc.setAccuracyMeters(w.getAccuracyMeters());
        loc.setMcc(scan.mcc());
        loc.setMnc(scan.mnc());
        if (!scan.cells().isEmpty()) {
            loc.setLac((int) scan.cells().get(0).lac());
            loc.setCellId(scan.cells().get(0).cellId());
        }
        loc.setRawPayload(raw);
        locationService.saveAndBroadcast(loc);
        return Optional.of(loc);
    }

    private Optional<CellLocation> resolve(String imei, NetworkScan scan, Instant now, boolean travelling) {
        Resolved prev = lastResolved.get(imei);
        if (prev != null && !travelling && sameSurroundings(prev, scan)) {
            return Optional.of(prev.where());
        }
        if (!geolocation.canLocateScans()) {
            return geolocation.locate(scan);  // empty; logs the missing configuration once
        }
        Instant asked = lastRequestAt.get(imei);
        if (asked != null && asked.isAfter(now.minusSeconds(minIntervalSeconds))) {
            return Optional.empty();
        }
        lastRequestAt.put(imei, now);
        Optional<CellLocation> where = geolocation.locate(scan);
        where.ifPresent(w -> {
            lastResolved.put(imei, new Resolved(macs(scan), servingCell(scan), w));
            log.info("Network position for imei={}: ({}, {}) accuracy={}m from {} access points, {} cells via {}",
                    imei, w.getLatitude(), w.getLongitude(), w.getAccuracyMeters(),
                    scan.wifi().size(), scan.cells().size(), w.getSource());
        });
        return where;
    }

    /**
     * With Wi-Fi: at least half of the access points heard now (and at least two) were heard at
     * the resolved position. Access points come and go between scans, and the serving cell can
     * change without the tracker moving, so neither is compared exactly. Without Wi-Fi: the same
     * serving cell, which is as fine as a cell-only position gets.
     */
    static boolean sameSurroundings(Resolved prev, NetworkScan scan) {
        if (!scan.hasWifi()) {
            return prev.macs().isEmpty() && prev.servingCell() == servingCell(scan);
        }
        long shared = scan.wifi().stream().filter(ap -> prev.macs().contains(ap.mac())).count();
        return shared >= 2 && shared * 2 >= scan.wifi().size();
    }

    private static Set<String> macs(NetworkScan scan) {
        return scan.wifi().stream().map(NetworkScan.Wifi::mac).collect(Collectors.toUnmodifiableSet());
    }

    private static long servingCell(NetworkScan scan) {
        return scan.cells().isEmpty() ? 0 : scan.cells().get(0).cellId();
    }
}
