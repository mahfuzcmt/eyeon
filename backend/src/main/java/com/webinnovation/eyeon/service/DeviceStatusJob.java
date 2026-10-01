package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.repository.DeviceRepository;
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
 * heartbeat cadence. Vehicle GT06 firmware emits every 30-180 s, but battery-powered
 * personal trackers send their 0x36 heartbeat only every 7 minutes (measured on production,
 * 2026-10-01) and were flipped OFFLINE for two minutes out of every seven at the old
 * 5-minute threshold. 10 minutes matches CLAUDE.md §13 and ShareLocationService.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeviceStatusJob {

    private static final int STALE_DEVICE_MINUTES = 10;

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
