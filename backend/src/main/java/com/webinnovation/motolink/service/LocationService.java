package com.webinnovation.motolink.service;

import com.webinnovation.motolink.config.RedisConfig;
import com.webinnovation.motolink.protocol.LocationData;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.LocationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Hot-path persistence + cache + pub/sub for location packets (CLAUDE.md §7.1).
 *
 * Called from the ingestion executor, AFTER the Netty handler has already ACKed
 * the device on its event loop. ACK-first / persist-second is rule #1 of §3.2.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {

    /**
     * Minimum satellite count for reliable GPS fix. Industry standard is 4 satellites
     * for 3D positioning. Below this threshold, we mark the position as invalid even
     * if the device reports a valid fix.
     */
    private static final int MIN_SATELLITES_FOR_VALID_FIX = 4;

    private final LocationRepository locationRepo;
    private final DeviceRepository deviceRepo;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final GeofenceService geofenceService;
    private final TripService tripService;
    private final AlarmRuleService alarmRuleService;
    private final CellLocationService cellLocationService;
    private final LocationBufferService locationBufferService;

    @Transactional
    public void saveAndBroadcast(LocationData loc) {
        // Validate GPS fix based on satellite count (industry standard: ≥4 satellites)
        // Override device-reported validity if satellite count is insufficient
        if (loc.isValid() && loc.getSatellites() < MIN_SATELLITES_FOR_VALID_FIX) {
            log.debug("Marking GPS fix as invalid due to low satellite count: imei={} satellites={} (min={})",
                    loc.getImei(), loc.getSatellites(), MIN_SATELLITES_FOR_VALID_FIX);
            loc.setValid(false);
        }
        // When GPS is invalid, try to get better coordinates from cell tower lookup
        Integer cellAccuracy = null;
        if (!loc.isValid() && loc.getMcc() > 0 && loc.getLac() > 0 && loc.getCellId() > 0) {
            var cellLoc = cellLocationService.lookup(loc.getMcc(), loc.getMnc(), loc.getLac(), loc.getCellId());
            if (cellLoc.isPresent()) {
                var cell = cellLoc.get();
                log.info("Cell tower lookup improved location for imei={}: ({}, {}) -> ({}, {}) accuracy={}m",
                    loc.getImei(), loc.getLatitude(), loc.getLongitude(),
                    cell.getLatitude(), cell.getLongitude(), cell.getAccuracyMeters());
                loc.setLatitude(cell.getLatitude());
                loc.setLongitude(cell.getLongitude());
                cellAccuracy = cell.getAccuracyMeters();
            }
        }
        try {
            locationRepo.insert(loc);

            Integer engineHoursSeconds = loc.getAccOnTimeSeconds() == null
                    ? null : loc.getAccOnTimeSeconds().intValue();
            // Only a valid fix may advance the device's position. Without a fix the
            // reported lat/lng is meaningless (a repeat of the last fix at best, zeros
            // or a cell-tower estimate at worst), so we refresh presence + telemetry
            // and leave last_location/speed/course pinned to the last known-good fix.
            if (loc.isValid()) {
                deviceRepo.updateLastPosition(
                        loc.getImei(),
                        loc.getLatitude(),
                        loc.getLongitude(),
                        loc.getSpeed(),
                        loc.getCourse(),
                        loc.getVoltageMv(),
                        loc.getGsmSignal(),
                        engineHoursSeconds,
                        loc.getTimestamp()
                );
            } else {
                deviceRepo.updateLastTelemetryNoFix(
                        loc.getImei(),
                        loc.getVoltageMv(),
                        loc.getGsmSignal(),
                        engineHoursSeconds,
                        loc.getTimestamp()
                );
            }

            String json = toJson(loc, cellAccuracy);
            if (json != null) {
                // Hot cache for REST API queries (last-known position)
                redis.opsForValue().set("device:last:" + loc.getImei(), json, Duration.ofHours(24));
            }

            // Buffer for batched WebSocket broadcast (every 10 seconds)
            locationBufferService.buffer(loc, cellAccuracy);

            // Phase 3: evaluate geofences and progress trip detection. Both run on the
            // ingest virtual-thread executor — they share its budget, not the event loop.
            geofenceService.evaluate(loc);
            tripService.onLocation(loc);
            alarmRuleService.evaluate(loc);
        } catch (Exception e) {
            log.error("saveAndBroadcast failed for imei={}: {}", loc.getImei(), e.getMessage(), e);
        }
    }

    private String toJson(LocationData d, Integer cellAccuracyMeters) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("imei", d.getImei());
        m.put("orgId", d.getOrgId());
        m.put("ts", d.getTimestamp().toString());
        m.put("latitude", d.getLatitude());
        m.put("longitude", d.getLongitude());
        m.put("speed", d.getSpeed());
        m.put("course", d.getCourse());
        m.put("valid", d.isValid());
        // Null on a no-fix packet — the client carries the previous value forward
        // rather than re-querying, keeping the hot path free of extra reads.
        m.put("lastValidTs", d.isValid() ? d.getTimestamp().toString() : null);
        m.put("satellites", d.getSatellites());
        m.put("accOn", d.getAccOn());
        m.put("voltageMv", d.getVoltageMv());
        m.put("mileageMeters", d.getMileageMeters());
        m.put("gsmSignal", d.getGsmSignal());
        m.put("engineHoursSeconds", d.getAccOnTimeSeconds() == null ? null : d.getAccOnTimeSeconds().intValue());
        // Cell tower accuracy when GPS is invalid and we used OpenCellID/UnwiredLabs
        m.put("cellAccuracyMeters", cellAccuracyMeters);
        try {
            return objectMapper.writeValueAsString(m);
        } catch (JsonProcessingException e) {
            log.warn("location JSON serialization failed: {}", e.getMessage());
            return null;
        }
    }
}
