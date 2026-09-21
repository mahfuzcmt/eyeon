package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Trip;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.protocol.LocationData;
import com.webinnovation.motolink.repository.LocationRepository;
import com.webinnovation.motolink.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Trip detection per CLAUDE.md §7.3.
 *
 * <p>Open conditions: ACC turns on, OR speed &gt; 5 km/h after a long idle gap.<br>
 * Close conditions: ACC explicitly off + speed=0, OR a sweeper closes after 10 min
 * of no location updates ({@link #closeStaleTrips}).
 *
 * <p>Distance is accumulated by haversine between the previously persisted point
 * and the current one — both are visible to this method because
 * {@link LocationService#saveAndBroadcast} calls us <em>after</em> the new sample
 * has been written.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TripService {

    /** km/h above which we treat the device as moving even without an explicit ACC signal. */
    private static final int MOVING_SPEED_THRESHOLD = 5;

    /** Idle gap (seconds) after which a movement-without-ACC restarts a trip. */
    private static final long RESTART_IDLE_SECONDS = 5 * 60;

    /** Sweeper threshold: open trips with no location updates for this long are closed. */
    public static final int STALE_TRIP_SECONDS = 10 * 60;

    private final TripRepository tripRepo;
    private final LocationRepository locationRepo;

    @Transactional
    public void onLocation(LocationData loc) {
        if (loc.getOrgId() == null || loc.getImei() == null || !loc.isValid()) return;
        try {
            Optional<Trip> openOpt = tripRepo.findOpenForDevice(loc.getImei());

            if (openOpt.isEmpty()) {
                if (shouldOpenTrip(loc)) {
                    UUID id = tripRepo.insertOpen(
                            loc.getOrgId(), loc.getImei(), loc.getTimestamp(),
                            loc.getLatitude(), loc.getLongitude());
                    log.debug("Opened trip {} for imei={}", id, loc.getImei());
                }
                return;
            }

            Trip open = openOpt.get();
            int deltaM = computeDeltaMeters(loc);
            tripRepo.appendPoint(open.id(), deltaM, loc.getSpeed(),
                    loc.getLatitude(), loc.getLongitude());

            if (shouldCloseTrip(loc)) {
                tripRepo.closeTrip(open.id(), loc.getTimestamp(),
                        loc.getLatitude(), loc.getLongitude());
                log.debug("Closed trip {} for imei={}", open.id(), loc.getImei());
            }
        } catch (Exception e) {
            log.warn("Trip processing failed for imei={}: {}", loc.getImei(), e.getMessage(), e);
        }
    }

    /** Periodic sweeper closes trips that have stopped receiving locations. */
    @Transactional
    public int closeStaleTrips() {
        List<UUID> stale = tripRepo.findStaleOpenTripIds(STALE_TRIP_SECONDS);
        Instant now = Instant.now();
        for (UUID id : stale) {
            tripRepo.closeTripKeepEndGeom(id, now);
        }
        return stale.size();
    }

    public Trip getOrThrow(UUID orgId, UUID id) {
        return tripRepo.findByOrgAndId(orgId, id)
                .orElseThrow(() -> new NotFoundException("Trip not found: " + id));
    }

    public List<Trip> listForOrg(UUID orgId, Instant from, Instant to, int limit, int offset) {
        return tripRepo.listForOrg(orgId, from, to,
                Math.min(Math.max(limit, 1), 500), Math.max(0, offset));
    }

    public List<Trip> listForDevice(UUID orgId, String imei, Instant from, Instant to) {
        return tripRepo.listForDevice(orgId, imei, from, to);
    }

    private boolean shouldOpenTrip(LocationData loc) {
        // ACC explicitly ON - start trip
        if (Boolean.TRUE.equals(loc.getAccOn())) return true;

        // Speed-based fallback when ACC is null/unknown:
        // Start trip if speed > threshold (vehicle is moving)
        if (loc.getAccOn() == null && loc.getSpeed() > MOVING_SPEED_THRESHOLD) {
            return true;
        }

        return false;
    }

    private boolean shouldCloseTrip(LocationData loc) {
        // ACC explicitly OFF and stopped - close trip
        if (Boolean.FALSE.equals(loc.getAccOn()) && loc.getSpeed() == 0) {
            return true;
        }

        // Speed-based fallback when ACC is null/unknown:
        // Close trip if speed is 0 (vehicle stopped)
        // The stale trip sweeper will handle extended stops
        if (loc.getAccOn() == null && loc.getSpeed() == 0) {
            // Check if we've been stopped for a while (3+ minutes)
            return hasBeenStoppedRecently(loc.getImei(), loc.getTimestamp());
        }

        return false;
    }

    /**
     * Check if the device has been stationary (speed=0) for the last few minutes.
     * Used for speed-based trip closing when ACC is unavailable.
     */
    private boolean hasBeenStoppedRecently(String imei, Instant currentTs) {
        // Get recent locations (last 3 minutes)
        List<com.webinnovation.motolink.domain.Location> recent = locationRepo.findHistory(
                null, imei,
                currentTs.minusSeconds(180), // 3 minutes
                currentTs,
                10);

        if (recent.size() < 3) return false; // Need at least a few points

        // Check if all recent points have speed = 0
        return recent.stream().allMatch(l -> l.speed() == 0);
    }

    /**
     * Compute distance from the prior persisted location for this device. Returns 0
     * when no prior point exists.
     *
     * Uses findPreviousValidLocation to get the immediately previous valid GPS point,
     * ensuring accurate incremental distance calculation (not from old points).
     */
    private int computeDeltaMeters(LocationData loc) {
        return locationRepo.findPreviousValidLocation(loc.getOrgId(), loc.getImei(), loc.getTimestamp())
                .map(prev -> {
                    int distanceM = (int) Math.round(
                            haversineMeters(prev.latitude(), prev.longitude(),
                                    loc.getLatitude(), loc.getLongitude()));
                    // Sanity check: if distance is unreasonably large (>10km between points),
                    // it's likely a GPS jump - ignore it
                    if (distanceM > 10_000) {
                        log.warn("Ignoring GPS jump for imei={}: {} meters from ({},{}) to ({},{})",
                                loc.getImei(), distanceM,
                                prev.latitude(), prev.longitude(),
                                loc.getLatitude(), loc.getLongitude());
                        return 0;
                    }
                    return distanceM;
                })
                .orElse(0);
    }

    private static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }
}
