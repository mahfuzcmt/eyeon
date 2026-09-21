package com.webinnovation.motolink.dto;

import java.time.Instant;

public final class DashboardDtos {

    private DashboardDtos() {}

    /**
     * One-shot KPI snapshot for the dashboard strip. "Today" counters are
     * computed in Asia/Dhaka — see {@code DashboardService}.
     */
    public record KpiSnapshot(
            int devicesTotal,
            int devicesOnline,
            int devicesOffline,
            int devicesNeverConnected,
            int alarmsToday,
            int alarmsCriticalToday,
            int alarmsUnacknowledged,
            int tripsActive,
            int tripsCompletedToday,
            long distanceTodayMeters,
            Instant generatedAt
    ) {}
}
