package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.ws.LiveAudience;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;

/**
 * Permanently removes a tracker and all of its data (Super Admin only).
 *
 * <p>The rows go in one transaction; afterwards the tracker's live TCP connection is closed and
 * its Redis hot-cache entry dropped. If the tracker is still powered on it reconnects and is
 * auto-registered again as a "New tracker" in the default organization, with no history.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceDeletionService {

    private final DeviceRepository deviceRepo;
    private final DeviceCommandService commandService;
    private final StringRedisTemplate redis;
    private final LiveAudience liveAudience;
    private final AuditService audit;
    private final TransactionTemplate tx;

    public void delete(String imei) {
        Device device = deviceRepo.findByImei(imei)
                .orElseThrow(() -> new NotFoundException("device", imei));

        Integer rows = tx.execute(status -> deviceRepo.deleteDeviceCascade(imei));
        if (rows == null || rows == 0) throw new NotFoundException("device", imei);

        commandService.disconnect(imei);
        try {
            redis.delete("device:last:" + imei);
        } catch (RuntimeException e) {
            log.warn("Could not clear Redis cache for deleted imei={}: {}", imei, e.toString());
        }
        liveAudience.invalidate(device.orgId());

        audit.record("ADMIN_DEVICE_DELETE", "device", imei, Map.of(
                "orgId", device.orgId().toString(),
                "name", device.name() == null ? "" : device.name()));
        log.info("Super admin deleted device imei={} org={}", imei, device.orgId());
    }
}
