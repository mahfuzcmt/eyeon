package com.webinnovation.motolink.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.motolink.config.RedisConfig;
import com.webinnovation.motolink.protocol.LocationData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Buffers location updates in memory and publishes batched updates every 3 seconds.
 *
 * This provides smooth real-time updates on the dashboard while the device reports every 10 seconds (TIMER,10,300#).
 * Each organization gets a single batch message containing all location points
 * received in the window, sorted by timestamp for sequential playback.
 *
 * <p>Thread-safe: Multiple Netty handler threads can call {@link #buffer} concurrently.
 * The scheduled flush runs on the Spring scheduler thread and drains the buffer atomically.
 *
 * <p>Memory usage: ~200 bytes per location × ~1 location per device × 100 devices
 * = ~20 KB per org — negligible.
 *
 * @see com.webinnovation.motolink.ws.BatchLocationFanout
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocationBufferService {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    /**
     * Buffer structure: orgId -> (imei -> list of LocationData).
     * Keeps ALL locations received in the batch window for smooth playback.
     * Uses ConcurrentHashMap for thread-safe concurrent writes from Netty handlers.
     */
    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, List<LocationData>>> buffer = new ConcurrentHashMap<>();

    /**
     * Stores cell accuracy from lookup (set by LocationService before calling buffer).
     * Key: imei, Value: accuracy in meters. Cleared on flush.
     */
    private final ConcurrentHashMap<String, Integer> cellAccuracyMap = new ConcurrentHashMap<>();

    /**
     * Buffer a location update. Called from LocationService after DB persistence.
     * Keeps ALL locations received within the batch window, sorted by timestamp,
     * so the frontend can animate through them sequentially.
     *
     * @param loc Location data to buffer
     */
    public void buffer(LocationData loc) {
        if (loc.getOrgId() == null) {
            log.warn("Skipping buffer for location without orgId: imei={}", loc.getImei());
            return;
        }

        log.debug("Buffering location: imei={} orgId={} valid={}", loc.getImei(), loc.getOrgId(), loc.isValid());

        buffer.computeIfAbsent(loc.getOrgId(), k -> new ConcurrentHashMap<>())
              .compute(loc.getImei(), (imei, existing) -> {
                  if (existing == null) {
                      List<LocationData> list = new ArrayList<>();
                      list.add(loc);
                      return list;
                  }
                  // Add to list (will be sorted on flush)
                  existing.add(loc);
                  return existing;
              });
    }

    /**
     * Buffer a location update with cell tower accuracy information.
     *
     * @param loc Location data to buffer
     * @param cellAccuracyMeters Cell tower accuracy in meters (null if GPS fix was valid)
     */
    public void buffer(LocationData loc, Integer cellAccuracyMeters) {
        buffer(loc);
        if (cellAccuracyMeters != null) {
            cellAccuracyMap.put(loc.getImei(), cellAccuracyMeters);
        }
    }

    /**
     * Flush the buffer and publish batch updates to Redis every 3 seconds.
     * More frequent than the device TIMER (10s) for smoother dashboard animation.
     * Each organization gets a single message containing ALL location points
     * for all its devices, sorted by timestamp for sequential playback.
     */
    @Scheduled(fixedRate = 3_000)
    public void flushAndBroadcast() {
        int bufferSize = getBufferSize();
        if (bufferSize > 0) {
            log.info("Batch flush triggered, buffer size: {}", bufferSize);
        }
        if (buffer.isEmpty()) {
            return;
        }

        // Drain the buffer atomically by swapping with a new empty map
        Map<UUID, ConcurrentHashMap<String, List<LocationData>>> snapshot = new HashMap<>();
        for (UUID orgId : buffer.keySet()) {
            ConcurrentHashMap<String, List<LocationData>> orgBuffer = buffer.remove(orgId);
            if (orgBuffer != null && !orgBuffer.isEmpty()) {
                snapshot.put(orgId, orgBuffer);
            }
        }

        // Also drain cell accuracy map
        Map<String, Integer> cellAccuracySnapshot = new HashMap<>(cellAccuracyMap);
        cellAccuracyMap.clear();

        if (snapshot.isEmpty()) {
            return;
        }

        int totalDevices = 0;
        int totalPoints = 0;
        for (Map.Entry<UUID, ConcurrentHashMap<String, List<LocationData>>> entry : snapshot.entrySet()) {
            UUID orgId = entry.getKey();
            Map<String, List<LocationData>> devices = entry.getValue();
            totalDevices += devices.size();

            try {
                String json = toBatchJson(orgId, devices, cellAccuracySnapshot);
                if (json != null) {
                    // Count total points for logging
                    for (List<LocationData> locs : devices.values()) {
                        totalPoints += locs.size();
                    }
                    redis.convertAndSend(RedisConfig.BATCH_LOCATION_EVENTS_CHANNEL, json);
                }
            } catch (Exception e) {
                log.error("Failed to publish batch for orgId={}: {}", orgId, e.getMessage());
            }
        }

        log.info("Flushed location buffer: {} orgs, {} devices, {} points", snapshot.size(), totalDevices, totalPoints);
    }

    /**
     * Serialize a batch of locations for one organization.
     * ALL points are included, sorted by timestamp for sequential playback.
     *
     * Format:
     * {
     *   "orgId": "uuid",
     *   "locations": [
     *     { "imei": "...", "ts": "...", "latitude": ..., ... },
     *     { "imei": "...", "ts": "...", "latitude": ..., ... },  // same imei, later ts
     *     ...
     *   ]
     * }
     */
    private String toBatchJson(UUID orgId, Map<String, List<LocationData>> devices, Map<String, Integer> cellAccuracyMap) {
        List<Map<String, Object>> locationList = new ArrayList<>();

        // Collect all locations from all devices
        List<LocationData> allLocations = new ArrayList<>();
        for (List<LocationData> deviceLocs : devices.values()) {
            allLocations.addAll(deviceLocs);
        }

        // Sort by timestamp for sequential playback
        allLocations.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

        for (LocationData d : allLocations) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("imei", d.getImei());
            m.put("ts", d.getTimestamp().toString());
            m.put("latitude", d.getLatitude());
            m.put("longitude", d.getLongitude());
            m.put("speed", d.getSpeed());
            m.put("course", d.getCourse());
            m.put("valid", d.isValid());
            m.put("lastValidTs", d.isValid() ? d.getTimestamp().toString() : null);
            m.put("satellites", d.getSatellites());
            m.put("accOn", d.getAccOn());
            m.put("voltageMv", d.getVoltageMv());
            m.put("mileageMeters", d.getMileageMeters());
            m.put("gsmSignal", d.getGsmSignal());
            m.put("engineHoursSeconds", d.getAccOnTimeSeconds() == null ? null : d.getAccOnTimeSeconds().intValue());
            m.put("cellAccuracyMeters", cellAccuracyMap.get(d.getImei()));
            locationList.add(m);
        }

        Map<String, Object> batch = new LinkedHashMap<>();
        batch.put("orgId", orgId.toString());
        batch.put("locations", locationList);

        try {
            return objectMapper.writeValueAsString(batch);
        } catch (JsonProcessingException e) {
            log.warn("Batch JSON serialization failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Get current buffer size for monitoring.
     *
     * @return Total number of buffered location points across all orgs
     */
    public int getBufferSize() {
        int total = 0;
        for (ConcurrentHashMap<String, List<LocationData>> orgBuffer : buffer.values()) {
            for (List<LocationData> locs : orgBuffer.values()) {
                total += locs.size();
            }
        }
        return total;
    }
}
