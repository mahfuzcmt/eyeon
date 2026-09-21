package com.webinnovation.motolink.service;

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

    @Value("${motolink.opencellid.api-key:}")
    private String openCellIdApiKey;

    @Value("${motolink.unwiredlabs.api-key:}")
    private String unwiredLabsApiKey;

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

        log.warn("No cell location API configured. Set MOTOLINK_UNWIREDLABS_API_KEY or MOTOLINK_OPENCELLID_API_KEY");
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
    static class OpenCellIdResponse {
        private Double lat;
        private Double lon;
        private Integer range;
        private String error;
    }
}
