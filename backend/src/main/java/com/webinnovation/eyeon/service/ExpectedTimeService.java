package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.domain.enums.GeofenceKind;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository.Due;
import com.webinnovation.eyeon.repository.PlaceScheduleRepository.Schedule;
import com.webinnovation.eyeon.service.ExpectedTimeCheck.Kind;
import com.webinnovation.eyeon.service.ExpectedTimeCheck.Phase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Expected times on a trusted place: "at School by 08:15", "left Coaching by 21:00".
 *
 * <p>A schedule belongs to a place and applies to everyone assigned to it. Every minute the
 * sweep looks at the schedules that just came due (see {@link ExpectedTimeCheck} for the
 * timing): at the deadline a person who is not where expected has their tracker asked for a
 * fresh position, and a few minutes later, if that did not change anything, the place's
 * owner gets a {@code NOT_ARRIVED} / {@code NOT_LEFT} alert - once per day.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExpectedTimeService {

    /** Seconds of live tracking requested when a deadline passes unmet. */
    private static final int PROBE_SECONDS = 120;
    private static final ZoneId FALLBACK_ZONE = ZoneId.of("Asia/Dhaka");

    private final PlaceScheduleRepository repo;
    private final GeofenceService geofences;
    private final AlarmService alarmService;
    private final DeviceRepository deviceRepo;
    private final DeviceCommandService commands;

    // ---- managing schedules (owner only: getOrThrow is a 404 for anyone else) ----

    public List<Schedule> list(UUID orgId, UUID ownerUserId, UUID geofenceId) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        return repo.listForGeofence(geofenceId);
    }

    public Schedule create(UUID orgId, UUID ownerUserId, UUID geofenceId, String kind, String time, List<Integer> weekdays) {
        Geofence place = geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        if (!GeofenceKind.TRUSTED_PLACE.name().equals(place.kind())) {
            throw new IllegalArgumentException("Expected times can only be set on a trusted place");
        }
        Kind k;
        try {
            k = Kind.valueOf(String.valueOf(kind).toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("kind must be ARRIVE_BY or LEAVE_BY");
        }
        LocalTime at;
        try {
            at = LocalTime.parse(String.valueOf(time)).withSecond(0).withNano(0);
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("time must be HH:mm, e.g. 08:15");
        }
        if (weekdays == null || weekdays.isEmpty() || weekdays.stream().anyMatch(d -> d == null || d < 1 || d > 7)) {
            throw new IllegalArgumentException("weekdays must be a non-empty list of 1 (Monday) to 7 (Sunday)");
        }
        List<Integer> days = weekdays.stream().distinct().sorted().toList();
        if (repo.listForGeofence(geofenceId).size() >= 10) {
            throw new IllegalArgumentException("A place can have at most 10 expected times");
        }
        UUID id = repo.insert(orgId, geofenceId, k.name(), at, days);
        return repo.listForGeofence(geofenceId).stream().filter(s -> s.id().equals(id)).findFirst().orElseThrow();
    }

    public void delete(UUID orgId, UUID ownerUserId, UUID geofenceId, UUID scheduleId) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        if (repo.delete(geofenceId, scheduleId) == 0) throw new NotFoundException("Expected time not found: " + scheduleId);
    }

    // ---- the sweep ----

    @Scheduled(fixedRate = 60_000, initialDelay = 45_000)
    public void sweep() {
        List<Due> rows;
        try {
            rows = repo.listActiveWithState();
        } catch (Exception e) {
            log.warn("Expected-time sweep could not load schedules: {}", e.getMessage());
            return;
        }
        Instant now = Instant.now();
        for (Due row : rows) {
            try {
                evaluate(row, now);
            } catch (Exception e) {
                log.warn("Expected-time check failed for schedule={} imei={}: {}", row.scheduleId(), row.imei(), e.getMessage());
            }
        }
    }

    void evaluate(Due row, Instant now) {
        ZoneId zone = zoneOf(row.timezone());
        Instant deadline = ExpectedTimeCheck.deadlineToday(row.localTime(), new HashSet<>(row.weekdays()), zone, now);
        Phase phase = ExpectedTimeCheck.phase(deadline, now);
        if (phase == Phase.NOT_DUE || phase == Phase.EXPIRED) return;

        String key = "schedule:" + row.scheduleId();
        LocalDate day = ExpectedTimeCheck.localDay(zone, now);
        String status = repo.checkStatus(key, row.imei(), day);
        if ("OK".equals(status) || "ALERTED".equals(status)) return;

        Kind kind = Kind.valueOf(row.kind());
        boolean breached = ExpectedTimeCheck.breached(kind, row.inside());
        if (!breached) {
            repo.setCheck(key, row.imei(), day, "OK");
            return;
        }
        if (phase == Phase.PROBE) {
            if (status == null && repo.claimCheck(key, row.imei(), day, "PROBED")) {
                // Ask for fresh positions so the decision is not made on a stale state.
                if (commands.isOnline(row.imei())) commands.liveTracking(row.orgId(), row.imei(), PROBE_SECONDS);
            }
            return;
        }

        // DECIDE: still not where expected.
        repo.setCheck(key, row.imei(), day, "ALERTED");
        Device d = deviceRepo.findByImei(row.imei()).orElse(null);
        Double lat = d == null ? null : d.lastLatitude();
        Double lng = d == null ? null : d.lastLongitude();
        Map<String, Object> meta = new HashMap<>();
        meta.put("geofenceId", row.geofenceId().toString());
        meta.put("geofenceName", row.placeName());
        meta.put("geofenceKind", GeofenceKind.TRUSTED_PLACE.name());
        if (row.placeType() != null) meta.put("placeType", row.placeType());
        if (row.ownerUserId() != null) meta.put(AlarmRepository.GEOFENCE_OWNER_KEY, row.ownerUserId().toString());
        meta.put("scheduleId", row.scheduleId().toString());
        meta.put("expectedTime", row.localTime().toString());
        alarmService.raise(row.orgId(), row.imei(),
                kind == Kind.ARRIVE_BY ? AlarmType.NOT_ARRIVED : AlarmType.NOT_LEFT, AlarmSeverity.WARNING,
                deadline, lat, lng, meta);
        log.info("Expected time not met: imei={} place={} kind={} at={}", row.imei(), row.placeName(), kind, row.localTime());
    }

    static ZoneId zoneOf(String timezone) {
        try {
            return timezone == null || timezone.isBlank() ? FALLBACK_ZONE : ZoneId.of(timezone);
        } catch (DateTimeException e) {
            return FALLBACK_ZONE;
        }
    }

    /** Housekeeping for daily_checks (also used by the battery reminders). */
    @Scheduled(cron = "0 20 3 * * *", zone = "Asia/Dhaka")
    public void purgeOldChecks() {
        try {
            repo.purgeChecksBefore(LocalDate.now(FALLBACK_ZONE).minusDays(7));
        } catch (Exception e) {
            log.warn("daily_checks purge failed: {}", e.getMessage());
        }
    }
}
