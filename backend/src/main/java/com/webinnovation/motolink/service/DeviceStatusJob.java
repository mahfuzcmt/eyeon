package com.webinnovation.motolink.service;

import com.webinnovation.motolink.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Per-minute sweepers that flip stale ONLINE devices to OFFLINE and close trips that
 * stopped receiving locations (CLAUDE.md §16 Phase 3).
 *
 * <p>Threshold ({@code STALE_DEVICE_MINUTES}) intentionally tracks the device protocol's
 * heartbeat cadence — most GT06 firmware emits at 30-180s intervals; we mark offline
 * after 5 minutes to avoid flapping on momentary 4G drops.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeviceStatusJob {

    private static final int STALE_DEVICE_MINUTES = 5;

    private final DeviceRepository deviceRepo;
    private final TripService tripService;

    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void sweepStale() {
        try {
            int devicesMarked = deviceRepo.markStaleOffline(STALE_DEVICE_MINUTES);
            int tripsClosed = tripService.closeStaleTrips();
            if (devicesMarked > 0 || tripsClosed > 0) {
                log.debug("Sweep: {} devices → OFFLINE, {} trips closed", devicesMarked, tripsClosed);
            }
        } catch (Exception e) {
            log.warn("DeviceStatusJob sweep failed: {}", e.getMessage());
        }
    }
}
