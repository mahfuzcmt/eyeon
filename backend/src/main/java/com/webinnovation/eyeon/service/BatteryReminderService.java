package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository.BatteryRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Battery assurance for battery-powered personal trackers.
 *
 * <p>A tracker that dies during the school day protects nobody, and a flat battery is the most
 * common complaint about family trackers. Two reminders, each at most once a day per tracker:
 * <ul>
 *   <li>evening (default 21:00): "charge it tonight" when the battery is at or below 40 % (INFO)</li>
 *   <li>morning (default 07:00): "it may not last the day" when at or below 30 % (WARNING)</li>
 * </ul>
 * A tracker that is on the charger is not nagged: when it is connected it is asked ({@code BMT#}).
 * Times are local to the organization. Trackers that report no battery level are ignored.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryReminderService {

    /** How long after the configured time a reminder may still go out (the sweep runs every 5 min). */
    private static final Duration SLOT = Duration.ofMinutes(30);
    /** A level older than this says nothing about now. */
    private static final int FRESH_HOURS = 12;

    private final PlaceScheduleRepository repo;
    private final AlarmService alarmService;
    private final DeviceCommandService commands;

    @Value("${eyeon.battery.evening-time:21:00}")
    private String eveningTime = "21:00";
    @Value("${eyeon.battery.evening-threshold:40}")
    private int eveningThreshold = 40;
    @Value("${eyeon.battery.morning-time:07:00}")
    private String morningTime = "07:00";
    @Value("${eyeon.battery.morning-threshold:30}")
    private int morningThreshold = 30;

    @Scheduled(fixedRate = 300_000, initialDelay = 75_000)
    public void sweep() {
        Instant now = Instant.now();
        try {
            for (BatteryRow row : repo.listRecentBatteries(FRESH_HOURS)) {
                try {
                    evaluate(row, now);
                } catch (Exception e) {
                    log.warn("Battery reminder failed for imei={}: {}", row.imei(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Battery reminder sweep failed: {}", e.getMessage());
        }
    }

    void evaluate(BatteryRow row, Instant now) {
        ZoneId zone = ExpectedTimeService.zoneOf(row.timezone());
        boolean evening = ExpectedTimeCheck.inDailySlot(LocalTime.parse(eveningTime), SLOT, zone, now)
                && row.batteryPercent() <= eveningThreshold;
        boolean morning = ExpectedTimeCheck.inDailySlot(LocalTime.parse(morningTime), SLOT, zone, now)
                && row.batteryPercent() <= morningThreshold;
        if (!evening && !morning) return;

        String reason = morning ? "MORNING" : "EVENING";
        String key = "battery:" + reason.toLowerCase();
        // Claim first: the charger question below can take seconds and must not be asked twice.
        if (!repo.claimCheck(key, row.imei(), ExpectedTimeCheck.localDay(zone, now), "ALERTED")) return;
        if (onCharger(row)) {
            log.debug("No charge reminder for imei={}: it is on the charger", row.imei());
            return;
        }
        alarmService.raise(row.orgId(), row.imei(), AlarmType.CHARGE_REMINDER,
                morning ? AlarmSeverity.WARNING : AlarmSeverity.INFO, now, row.lat(), row.lng(),
                Map.of("reason", reason, "batteryPercent", row.batteryPercent()));
    }

    /** Best effort: only a connected tracker can be asked; no answer means "remind anyway". */
    private boolean onCharger(BatteryRow row) {
        if (!commands.isOnline(row.imei())) return false;
        try {
            String reply = commands.sendRaw(row.orgId(), row.imei(), "BMT#").get(10, TimeUnit.SECONDS);
            return reply != null && reply.toLowerCase().contains("charger in");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
