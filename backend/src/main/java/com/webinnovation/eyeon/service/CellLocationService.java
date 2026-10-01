package com.webinnovation.eyeon.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cell tower location service using OpenCellID/UnwiredLabs API.
 * Provides GSM-based location when GPS is unavailable.
 *
 * Free tier: 100 requests/day (UnwiredLabs) or unlimited with OpenCellID token.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CellLocationService {

    @Value("${eyeon.opencellid.api-key:}")
    private String openCellIdApiKey;

    @Value("${eyeon.unwiredlabs.api-key:}")
    private String unwiredLabsApiKey;

    /** Server key for the Google Geolocation API (not the browser Maps key). */
    @Value("${eyeon.google-geolocation.api-key:}")
    private String googleGeolocationApiKey;

    private final java.util.concurrent.atomic.AtomicBoolean warnedNoScanProvider =
            new java.util.concurrent.atomic.AtomicBoolean();

    private final RestClient.Builder restClientBuilder;

    // Cache cell tower locations to reduce API calls (cell towers don't move!)
    // Key: "mcc:mnc:lac:cellId" -> CellLocation
    private final Map<String, CellLocation> cellCache = new ConcurrentHashMap<>();

    /**
     * Look up cell tower location from MCC/MNC/LAC/CellID.
     * Uses cache first, then API if not cached.
     *
     * @return Optional with lat/lng if found, empty if lookup failed
     */
    public Optional<CellLocation> lookup(int mcc, int mnc, int lac, long cellId) {
        if (mcc <= 0 || lac <= 0 || cellId <= 0) {
            return Optional.empty();
        }

        String cacheKey = mcc + ":" + mnc + ":" + lac + ":" + cellId;

        // Check cache first
        CellLocation cached = cellCache.get(cacheKey);
        if (cached != null) {
            log.debug("Cell location cache hit: {}", cacheKey);
            return Optional.of(cached);
        }

        // Try UnwiredLabs API first (better accuracy)
        if (unwiredLabsApiKey != null && !unwiredLabsApiKey.isBlank()) {
            Optional<CellLocation> result = lookupUnwiredLabs(mcc, mnc, lac, cellId);
            result.ifPresent(loc -> cellCache.put(cacheKey, loc));
            if (result.isPresent()) {
                return result;
            }
        }

        // Fallback to OpenCellID
        if (openCellIdApiKey != null && !openCellIdApiKey.isBlank()) {
            Optional<CellLocation> result = lookupOpenCellId(mcc, mnc, lac, cellId);
            result.ifPresent(loc -> cellCache.put(cacheKey, loc));
            return result;
        }

        log.warn("No cell location API configured. Set EYEON_UNWIREDLABS_API_KEY or EYEON_OPENCELLID_API_KEY");
        return Optional.empty();
    }

    /** True when a service that can resolve a Wi-Fi / cell scan is configured. */
    public boolean canLocateScans() {
        return notBlank(googleGeolocationApiKey) || notBlank(unwiredLabsApiKey);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    /**
     * Resolve a network scan (cells and, when present, Wi-Fi access points) to coordinates.
     * Google is tried first because its Wi-Fi database is by far the densest in Bangladesh;
     * UnwiredLabs is the fallback. Not cached here: callers decide when a scan is worth a
     * request (NetworkLocationService reuses the previous answer while the tracker stays put).
     */
    public Optional<CellLocation> locate(com.webinnovation.eyeon.protocol.NetworkScan scan) {
        if (scan.cells().isEmpty() && scan.wifi().isEmpty()) return Optional.empty();
        if (notBlank(googleGeolocationApiKey)) {
            Optional<CellLocation> r = locateGoogle(scan);
            if (r.isPresent()) return r;
        }
        if (notBlank(unwiredLabsApiKey)) {
            return locateUnwiredLabs(scan);
        }
        if (!canLocateScans() && warnedNoScanProvider.compareAndSet(false, true)) {
            log.warn("A tracker is sending Wi-Fi/cell scans instead of GPS, but no geolocation service is configured. "
                    + "Set EYEON_GOOGLE_GEOLOCATION_API_KEY (or EYEON_UNWIREDLABS_API_KEY); until then these trackers have no position indoors.");
        }
        return Optional.empty();
    }

    /** https://developers.google.com/maps/documentation/geolocation/requests-geolocation */
    private Optional<CellLocation> locateGoogle(com.webinnovation.eyeon.protocol.NetworkScan scan) {
        try {
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("considerIp", false);  // never answer with the server's own location
            body.put("radioType", "lte");
            body.put("homeMobileCountryCode", scan.mcc());
            body.put("homeMobileNetworkCode", scan.mnc());
            body.put("cellTowers", scan.cells().stream().map(cell -> Map.<String, Object>of(
                    "cellId", cell.cellId(),
                    "locationAreaCode", cell.lac(),
                    "mobileCountryCode", scan.mcc(),
                    "mobileNetworkCode", scan.mnc())).toList());
            body.put("wifiAccessPoints", scan.wifi().stream().map(ap -> Map.<String, Object>of(
                    "macAddress", ap.mac(),
                    "signalStrength", ap.rssiDbm())).toList());

            GoogleGeolocationResponse response = restClientBuilder.build().post()
                    .uri("https://www.googleapis.com/geolocation/v1/geolocate?key={key}", googleGeolocationApiKey)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(GoogleGeolocationResponse.class);

            if (response != null && response.getLocation() != null) {
                CellLocation loc = new CellLocation();
                loc.setLatitude(response.getLocation().getLat());
                loc.setLongitude(response.getLocation().getLng());
                loc.setAccuracyMeters(response.getAccuracy() != null ? (int) Math.round(response.getAccuracy()) : 1000);
                loc.setSource("google");
                return Optional.of(loc);
            }
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            log.debug("Google geolocation: nothing known about this scan");
        } catch (Exception e) {
            // The message can contain the request URL: never log the key.
            log.warn("Google geolocation error: {}", String.valueOf(e.getMessage()).replace(googleGeolocationApiKey, "***"));
        }
        return Optional.empty();
    }

    /** https://unwiredlabs.com/api#documentation — same endpoint as the single-cell lookup, plus Wi-Fi. */
    private Optional<CellLocation> locateUnwiredLabs(com.webinnovation.eyeon.protocol.NetworkScan scan) {
        try {
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("token", unwiredLabsApiKey);
            body.put("radio", "lte");
            body.put("mcc", scan.mcc());
            body.put("mnc", scan.mnc());
            body.put("cells", scan.cells().stream().map(cell -> Map.<String, Object>of(
                    "lac", cell.lac(), "cid", cell.cellId())).toList());
            body.put("wifi", scan.wifi().stream().map(ap -> Map.<String, Object>of(
                    "bssid", ap.mac(), "signal", ap.rssiDbm())).toList());
            body.put("address", 0);

            UnwiredResponse response = restClientBuilder.build().post()
                    .uri("https://us1.unwiredlabs.com/v2/process")
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(UnwiredResponse.class);

            if (response != null && "ok".equals(response.getStatus()) && response.getLat() != null) {
                CellLocation loc = new CellLocation();
                loc.setLatitude(response.getLat());
                loc.setLongitude(response.getLon());
                loc.setAccuracyMeters(response.getAccuracy() != null ? response.getAccuracy() : 1000);
                loc.setSource("unwiredlabs");
                return Optional.of(loc);
            }
            log.debug("UnwiredLabs scan lookup failed: {}", response != null ? response.getMessage() : "null response");
        } catch (Exception e) {
            log.warn("UnwiredLabs scan lookup error: {}", e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * UnwiredLabs Geolocation API (more accurate, 100 free/day)
     * https://unwiredlabs.com/docs
     */
    private Optional<CellLocation> lookupUnwiredLabs(int mcc, int mnc, int lac, long cellId) {
        try {
            RestClient client = restClientBuilder.build();

            UnwiredRequest request = new UnwiredRequest();
            request.setToken(unwiredLabsApiKey);
            request.setRadio("gsm");
            request.setMcc(mcc);
            request.setMnc(mnc);
            request.setCells(List.of(new UnwiredCell(lac, cellId)));

            UnwiredResponse response = client.post()
                .uri("https://us1.unwiredlabs.com/v2/process")
                .header("Content-Type", "application/json")
                .body(request)
                .retrieve()
                .body(UnwiredResponse.class);

            if (response != null && "ok".equals(response.getStatus())) {
                CellLocation loc = new CellLocation();
                loc.setLatitude(response.getLat());
                loc.setLongitude(response.getLon());
                loc.setAccuracyMeters(response.getAccuracy() != null ? response.getAccuracy() : 1000);
                loc.setSource("unwiredlabs");
                log.info("UnwiredLabs lookup success: mcc={} mnc={} lac={} cell={} -> ({}, {}) accuracy={}m",
                    mcc, mnc, lac, cellId, loc.getLatitude(), loc.getLongitude(), loc.getAccuracyMeters());
                return Optional.of(loc);
            } else {
                log.warn("UnwiredLabs lookup failed: {}", response != null ? response.getMessage() : "null response");
            }
        } catch (Exception e) {
            log.error("UnwiredLabs API error: {}", e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * OpenCellID API (free, unlimited with API key)
     * https://opencellid.org/api
     */
    private Optional<CellLocation> lookupOpenCellId(int mcc, int mnc, int lac, long cellId) {
        try {
            RestClient client = restClientBuilder.build();

            String url = String.format(
                "https://opencellid.org/cell/get?key=%s&mcc=%d&mnc=%d&lac=%d&cellid=%d&format=json",
                openCellIdApiKey, mcc, mnc, lac, cellId
            );

            OpenCellIdResponse response = client.get()
                .uri(url)
                .retrieve()
                .body(OpenCellIdResponse.class);

            if (response != null && response.getLat() != null) {
                CellLocation loc = new CellLocation();
                loc.setLatitude(response.getLat());
                loc.setLongitude(response.getLon());
                loc.setAccuracyMeters(response.getRange() != null ? response.getRange() : 1000);
                loc.setSource("opencellid");
                log.info("OpenCellID lookup success: mcc={} mnc={} lac={} cell={} -> ({}, {})",
                    mcc, mnc, lac, cellId, loc.getLatitude(), loc.getLongitude());
                return Optional.of(loc);
            } else if (response != null && response.getError() != null) {
                log.debug("OpenCellID cell not found: mcc={} mnc={} lac={} cell={} error={}",
                    mcc, mnc, lac, cellId, response.getError());
            }
        } catch (Exception e) {
            log.error("OpenCellID API error: {}", e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Get cache statistics for monitoring.
     */
    public int getCacheSize() {
        return cellCache.size();
    }

    // ===== DTOs =====

    @Data
    public static class CellLocation {
        private double latitude;
        private double longitude;
        private int accuracyMeters;
        private String source; // "unwiredlabs" or "opencellid"
    }

    @Data
    static class UnwiredRequest {
        private String token;
        private String radio;
        private int mcc;
        private int mnc;
        private List<UnwiredCell> cells;
    }

    @Data
    static class UnwiredCell {
        private int lac;
        private long cid;

        UnwiredCell(int lac, long cid) {
            this.lac = lac;
            this.cid = cid;
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class UnwiredResponse {
        private String status;
        private String message;
        private Double lat;
        private Double lon;
        private Integer accuracy;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GoogleGeolocationResponse {
        private GoogleLatLng location;
        private Double accuracy;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GoogleLatLng {
        private double lat;
        private double lng;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class OpenCellIdResponse {
        private Double lat;
        private Double lon;
        private Integer range;
        private String error;
    }
}
