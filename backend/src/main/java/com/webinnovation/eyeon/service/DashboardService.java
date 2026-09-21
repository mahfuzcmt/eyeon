package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.dto.DashboardDtos.KpiSnapshot;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

/**
 * Aggregates fleet KPIs for the live dashboard strip. All "today" cutoffs are
 * resolved in {@code Asia/Dhaka} — the product's primary market. Refactor to
 * per-org timezone if/when we ship outside Bangladesh.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final ZoneId BD_ZONE = ZoneId.of("Asia/Dhaka");

    private final DeviceRepository devices;
    private final AlarmRepository alarms;
    private final TripRepository trips;

    /**
     * @param visible IMEIs the viewer may see; null = the whole organization
     * @param viewer  the user asking, for the geofence-owner rule on alarm counts
     */
    public KpiSnapshot snapshot(UUID orgId, java.util.Set<String> visible, UUID viewer) {
        Map<String, Integer> byStatus = visible == null
                ? devices.countByStatus(orgId)
                : devices.listForOrg(orgId).stream()
                        .filter(d -> visible.contains(d.imei()))
                        .collect(java.util.stream.Collectors.toMap(d -> d.status(), d -> 1, Integer::sum));
        int online = byStatus.getOrDefault("ONLINE", 0);
        int offline = byStatus.getOrDefault("OFFLINE", 0);
        int never = byStatus.getOrDefault("NEVER_CONNECTED", 0);
        int total = online + offline + never;

        Instant startOfDay = LocalDate.now(BD_ZONE).atStartOfDay(BD_ZONE).toInstant();

        return new KpiSnapshot(
                total,
                online,
                offline,
                never,
                alarms.countSince(orgId, startOfDay, visible, viewer),
                alarms.countCriticalSince(orgId, startOfDay, visible, viewer),
                alarms.countUnacknowledged(orgId, visible, viewer),
                visible == null ? trips.countActive(orgId) : 0,
                visible == null ? trips.countCompletedSince(orgId, startOfDay) : 0,
                visible == null ? trips.sumDistanceSince(orgId, startOfDay) : 0,
                Instant.now()
        );
    }
}
