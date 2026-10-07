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
import com.webinnovation.eyeon.service.ExpectedTimeCheck.Action;
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
 * Expected times on a trusted place: "at School by 08:00, 10 minutes grace", "left School by 12:00".
 *
 * <p>A schedule belongs to a place and applies to everyone assigned to it. Every minute the sweep
 * asks {@link ExpectedTimeCheck#decide} what to do for each schedule and person, and tells the
 * place's owner both ways: {@code ARRIVED_ON_TIME} / {@code LEFT_ON_TIME} when the person was
 * where expected by the time plus grace, {@code NOT_ARRIVED} / {@code NOT_LEFT} when not, and
 * {@code ARRIVED_LATE} / {@code LEFT_LATE} if they get there after the alert. Each at most once a day.
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
    private final com.webinnovation.eyeon.repository.TrackerSettingsRepository restRepo;

    // ---- managing schedules (owner only: getOrThrow is a 404 for anyone else) ----

    public List<Schedule> list(UUID orgId, UUID ownerUserId, UUID geofenceId) {
        geofences.getOrThrow(orgId, ownerUserId, geofenceId);
        return repo.listForGeofence(geofenceId);
    }

    /** Grace used when the caller does not send one. */
    public static final int DEFAULT_GRACE_MINUTES = 10;

    public Schedule create(UUID orgId, UUID ownerUserId, UUID geofenceId, String kind, String time, List<Integer> weekdays,
                           Integer graceMinutes) {
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
        int grace = graceMinutes == null ? DEFAULT_GRACE_MINUTES : graceMinutes;
        if (grace < 0 || grace > ExpectedTimeCheck.MAX_GRACE_MINUTES) {
            throw new IllegalArgumentException("graceMinutes must be between 0 and " + ExpectedTimeCheck.MAX_GRACE_MINUTES);
        }
        List<Integer> days = weekdays.stream().distinct().sorted().toList();
        if (repo.listForGeofence(geofenceId).size() >= 10) {
            throw new IllegalArgumentException("A place can have at most 10 expected times");
        }
        UUID id = repo.insert(orgId, geofenceId, k.name(), at, days, grace);
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
        Instant expected = ExpectedTimeCheck.deadlineToday(row.localTime(), new HashSet<>(row.weekdays()), zone, now);
        if (expected == null || now.isBefore(expected)) return;

        String key = "schedule:" + row.scheduleId();
        LocalDate day = ExpectedTimeCheck.localDay(zone, now);
        String status = repo.checkStatus(key, row.imei(), day);
        Kind kind = Kind.valueOf(row.kind());
        Action action = ExpectedTimeCheck.decide(kind, row.inside(), row.changedAt(), expected, row.graceMinutes(),
                status, zone, now);
        if (action == Action.NONE) return;

        // A tracker switched off for its night rest cannot say where it is: nothing on stale data.
        var window = restRepo.restWindows(row.orgId()).get(row.imei());
        if (window != null && NightRest.inWindow(window.start(), window.end(), zone, expected)) return;

        switch (action) {
            case SKIP -> repo.setCheck(key, row.imei(), day, ExpectedTimeCheck.SKIPPED);
            case PROBE -> {
                if (repo.claimCheck(key, row.imei(), day, ExpectedTimeCheck.PROBED) && commands.isOnline(row.imei())) {
                    // Ask for fresh positions so the decision is not made on a stale state.
                    commands.liveTracking(row.orgId(), row.imei(), PROBE_SECONDS);
                }
            }
            case ON_TIME -> {
                repo.setCheck(key, row.imei(), day, ExpectedTimeCheck.OK_SENT);
                Instant at = ExpectedTimeCheck.today(row.changedAt(), zone, now) ? row.changedAt() : now;
                raise(row, kind == Kind.ARRIVE_BY ? AlarmType.ARRIVED_ON_TIME : AlarmType.LEFT_ON_TIME,
                        AlarmSeverity.INFO, at, at);
            }
            case MISSED -> {
                repo.setCheck(key, row.imei(), day, ExpectedTimeCheck.ALERTED);
                Instant decideAt = ExpectedTimeCheck.decisionAt(expected, row.graceMinutes());
                raise(row, kind == Kind.ARRIVE_BY ? AlarmType.NOT_ARRIVED : AlarmType.NOT_LEFT,
                        AlarmSeverity.WARNING, decideAt, null);
            }
            case LATE -> {
                repo.setCheck(key, row.imei(), day, ExpectedTimeCheck.LATE_SENT);
                Instant at = row.changedAt() != null ? row.changedAt() : now;
                raise(row, kind == Kind.ARRIVE_BY ? AlarmType.ARRIVED_LATE : AlarmType.LEFT_LATE,
                        AlarmSeverity.INFO, at, at);
            }
            default -> { }
        }
    }

    private void raise(Due row, AlarmType type, AlarmSeverity severity, Instant ts, Instant actualAt) {
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
        meta.put("graceMinutes", row.graceMinutes());
        if (actualAt != null) meta.put("actualAt", actualAt.toString());
        alarmService.raise(row.orgId(), row.imei(), type, severity, ts, lat, lng, meta);
        log.info("Expected time: imei={} place={} {} expected={} grace={}m", row.imei(), row.placeName(), type,
                row.localTime(), row.graceMinutes());
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
