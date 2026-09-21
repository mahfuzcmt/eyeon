package com.webinnovation.motolink.service;

import com.webinnovation.motolink.dto.DashboardDtos.KpiSnapshot;
import com.webinnovation.motolink.repository.AlarmRepository;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.TripRepository;
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

    public KpiSnapshot snapshot(UUID orgId) {
        Map<String, Integer> byStatus = devices.countByStatus(orgId);
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
                alarms.countSince(orgId, startOfDay),
                alarms.countCriticalSince(orgId, startOfDay),
                alarms.countUnacknowledged(orgId),
                trips.countActive(orgId),
                trips.countCompletedSince(orgId, startOfDay),
                trips.sumDistanceSince(orgId, startOfDay),
                Instant.now()
        );
    }
}
