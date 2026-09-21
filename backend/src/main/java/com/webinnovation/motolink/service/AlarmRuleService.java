package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.AlarmRule;
import com.webinnovation.motolink.domain.enums.AlarmSeverity;
import com.webinnovation.motolink.domain.enums.AlarmType;
import com.webinnovation.motolink.dto.AlarmRuleDtos.AlarmRuleRequest;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.protocol.LocationData;
import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.repository.AlarmRuleRepository;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.LocationRepository;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Org-defined alarm rules. Replaces what would otherwise be hard-coded
 * speed/voltage/curfew checks. Three rule types in v1:
 * <ul>
 *   <li>{@code SPEED_OVER}            — fires OVERSPEED when speed > threshold (kph)</li>
 *   <li>{@code VOLTAGE_UNDER}         — fires LOW_BATTERY when voltage < threshold (mV)</li>
 *   <li>{@code ACC_ON_DURING_WINDOW}  — fires CURFEW_VIOLATION when ACC=on inside window (BD time)</li>
 * </ul>
 *
 * <p>Since 2026-09-16 (ADL parity) three <em>state</em> rules exist as well. They are not
 * evaluated per packet but by a once-a-minute sweep ({@link #sweepStateRules()}):
 * <ul>
 *   <li>{@code PARKING_TIMEOUT}  — threshold minutes without movement → PARKING_TIMEOUT</li>
 *   <li>{@code OFFLINE_TIMEOUT}  — threshold minutes since the last packet → OFFLINE_TIMEOUT</li>
 *   <li>{@code IDLE_TIMEOUT}     — ignition on, speed 0 for threshold minutes → ENGINE_IDLE</li>
 * </ul>
 *
 * <p>Each rule has a per-device cooldown to avoid alarm storms (one location packet
 * every few seconds × 5 km over a speed limit = thousands of duplicate alarms).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlarmRuleService {

    private static final ZoneId BD_ZONE = ZoneId.of("Asia/Dhaka");

    private final AlarmRuleRepository repo;
    private final AlarmService alarmService;
    private final DeviceRepository deviceRepo;
    private final LocationRepository locationRepo;
    private final DeviceAccessService access;

    static final List<String> STATE_RULE_TYPES = List.of("PARKING_TIMEOUT", "OFFLINE_TIMEOUT", "IDLE_TIMEOUT");

    public AlarmRule getOrThrow(UUID ownerUserId, UUID id) {
        return repo.findByOwnerAndId(ownerUserId, id)
                .orElseThrow(() -> new NotFoundException("Alarm rule not found: " + id));
    }

    /** Rules are per user (V18): the caller only ever sees their own. */
    public List<AlarmRule> listForOwner(UUID ownerUserId) {
        return repo.listForOwner(ownerUserId);
    }

    public List<String> listAssignedImeis(UUID ruleId) {
        return repo.listAssignedImeis(ruleId);
    }

    public UUID create(UUID orgId, UUID ownerUserId, AlarmRuleRequest req) {
        validate(req, true);
        UUID id = repo.insert(
                orgId,
                ownerUserId,
                req.name(),
                req.ruleType(),
                req.threshold(),
                req.windowStart(),
                req.windowEnd(),
                defaultIfNull(req.cooldownSeconds(), STATE_RULE_TYPES.contains(req.ruleType()) ? 3600 : 300),
                defaultIfNull(req.severity(), "WARNING"),
                defaultIfNull(req.active(), true),
                defaultIfNull(req.appliesToAll(), true)
        );
        if (Boolean.FALSE.equals(req.appliesToAll()) && req.assignedImeis() != null) {
            for (String imei : req.assignedImeis()) {
                if (imei != null && !imei.isBlank()) repo.assignDevice(id, imei);
            }
        }
        return id;
    }

    public void update(UUID ownerUserId, UUID id, AlarmRuleRequest req) {
        validate(req, false);
        if (!repo.update(ownerUserId, id, req.name(), req.threshold(),
                req.windowStart(), req.windowEnd(), req.cooldownSeconds(),
                req.severity(), req.active(), req.appliesToAll())) {
            throw new NotFoundException("Alarm rule not found: " + id);
        }
        if (req.assignedImeis() != null) {
            repo.unassignAllDevices(id);
            for (String imei : req.assignedImeis()) {
                if (imei != null && !imei.isBlank()) repo.assignDevice(id, imei);
            }
        }
    }

    public void delete(UUID ownerUserId, UUID id) {
        if (!repo.delete(ownerUserId, id)) {
            throw new NotFoundException("Alarm rule not found: " + id);
        }
    }

    /**
     * Hot-path evaluation. Called from {@link LocationService#saveAndBroadcast} after
     * geofence/trip evaluation. Rules with no matching predicate are silently skipped.
     */
    public void evaluate(LocationData loc) {
        if (loc.getOrgId() == null || loc.getImei() == null) return;
        try {
            List<AlarmRule> rules = repo.findActiveForDevice(loc.getOrgId(), loc.getImei());
            for (AlarmRule r : rules) {
                if (!matches(r, loc)) continue;
                if (!repo.tryFire(r.id(), loc.getImei(), r.cooldownSeconds(), Instant.now())) {
                    continue;  // still within cooldown
                }
                fire(r, loc);
            }
        } catch (Exception e) {
            log.warn("Alarm-rule evaluation failed for imei={}: {}", loc.getImei(), e.getMessage(), e);
        }
    }

    /**
     * Minute sweep for the state rules. Cheap: one query per rule for the device
     * list plus at most two indexed single-row lookups per candidate device.
     * The rule's cooldown (default 1 h for these types) keeps a vehicle that stays
     * parked from alarming every minute.
     */
    @Scheduled(fixedRate = 60_000, initialDelay = 30_000)
    public void sweepStateRules() {
        List<AlarmRule> rules;
        try {
            rules = repo.listActiveByTypes(STATE_RULE_TYPES);
        } catch (Exception e) {
            log.warn("State-rule sweep could not load rules: {}", e.getMessage());
            return;
        }
        Instant now = Instant.now();
        for (AlarmRule r : rules) {
            try {
                evaluateStateRule(r, now);
            } catch (Exception e) {
                log.warn("State rule {} ({}) failed: {}", r.name(), r.ruleType(), e.getMessage());
            }
        }
    }

    void evaluateStateRule(AlarmRule r, Instant now) {
        if (r.threshold() == null || r.threshold() <= 0) return;
        Duration limit = Duration.ofMinutes(Math.round(r.threshold()));
        List<Device> devices = deviceRepo.listForOrg(r.orgId());
        Set<String> assigned = r.appliesToAll() ? null : new HashSet<>(repo.listAssignedImeis(r.id()));
        // An "all vehicles" rule covers the vehicles its owner may see (null = unrestricted).
        Set<String> visible = r.appliesToAll() ? access.visibleImeis(r.ownerUserId()) : null;
        for (Device d : devices) {
            if (assigned != null && !assigned.contains(d.imei())) continue;
            if (!DeviceAccessService.canSee(visible, d.imei())) continue;
            if (d.lastSeenAt() == null) continue;  // never connected: nothing to time out
            Instant since = stateSince(r.ruleType(), d);
            if (since == null || Duration.between(since, now).compareTo(limit) < 0) continue;
            if (!repo.tryFire(r.id(), d.imei(), r.cooldownSeconds(), now)) continue;
            fireState(r, d, since, now);
        }
    }

    /** When the offending state began, or null if the device is not in that state. */
    private Instant stateSince(String ruleType, Device d) {
        boolean online = "ONLINE".equals(d.status());
        boolean moving = d.lastSpeed() != null && d.lastSpeed() > 0;
        return switch (ruleType) {
            case "OFFLINE_TIMEOUT" -> online ? null : d.lastSeenAt();
            case "PARKING_TIMEOUT" -> (!online || moving) ? null : locationRepo.lastMovingAt(d.imei()).orElse(null);
            case "IDLE_TIMEOUT" -> (!online || moving || !locationRepo.lastAccOn(d.imei()).orElse(false))
                    ? null : locationRepo.lastMovingAt(d.imei()).orElse(null);
            default -> null;
        };
    }

    private void fireState(AlarmRule r, Device d, Instant since, Instant now) {
        AlarmType type = switch (r.ruleType()) {
            case "PARKING_TIMEOUT" -> AlarmType.PARKING_TIMEOUT;
            case "OFFLINE_TIMEOUT" -> AlarmType.OFFLINE_TIMEOUT;
            case "IDLE_TIMEOUT" -> AlarmType.ENGINE_IDLE;
            default -> null;
        };
        if (type == null) return;
        Map<String, Object> meta = new HashMap<>();
        meta.put("ruleId", r.id().toString());
        meta.put("ruleName", r.name());
        meta.put("ruleType", r.ruleType());
        meta.put("thresholdMinutes", r.threshold());
        meta.put("since", since.toString());
        meta.put("durationMinutes", Duration.between(since, now).toMinutes());
        alarmService.raise(r.orgId(), d.imei(), type, AlarmSeverity.valueOf(r.severity()),
                now, d.lastLatitude(), d.lastLongitude(), meta);
    }

    private boolean matches(AlarmRule r, LocationData loc) {
        return switch (r.ruleType()) {
            case "SPEED_OVER" -> r.threshold() != null && loc.getSpeed() > r.threshold();
            case "VOLTAGE_UNDER" -> r.threshold() != null
                    && loc.getVoltageMv() != null
                    && loc.getVoltageMv() < r.threshold();
            case "ACC_ON_DURING_WINDOW" -> Boolean.TRUE.equals(loc.getAccOn())
                    && inWindow(r.windowStart(), r.windowEnd(), loc.getTimestamp());
            default -> false;
        };
    }

    private void fire(AlarmRule r, LocationData loc) {
        AlarmType type = switch (r.ruleType()) {
            case "SPEED_OVER" -> AlarmType.OVERSPEED;
            case "VOLTAGE_UNDER" -> AlarmType.LOW_BATTERY;
            case "ACC_ON_DURING_WINDOW" -> AlarmType.CURFEW_VIOLATION;
            default -> null;
        };
        if (type == null) return;
        AlarmSeverity sev = AlarmSeverity.valueOf(r.severity());
        Map<String, Object> meta = new HashMap<>();
        meta.put("ruleId", r.id().toString());
        meta.put("ruleName", r.name());
        meta.put("ruleType", r.ruleType());
        if (r.threshold() != null) meta.put("threshold", r.threshold());
        if ("SPEED_OVER".equals(r.ruleType())) meta.put("observedSpeed", loc.getSpeed());
        if ("VOLTAGE_UNDER".equals(r.ruleType())) meta.put("observedVoltageMv", loc.getVoltageMv());
        alarmService.raise(loc.getOrgId(), loc.getImei(), type, sev,
                loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(), meta);
    }

    /**
     * True when {@code ts} (interpreted in Asia/Dhaka) falls inside [start, end).
     * Supports wrap-around windows (e.g. start=22:00, end=06:00 → night shift).
     */
    private boolean inWindow(LocalTime start, LocalTime end, Instant ts) {
        if (start == null || end == null || ts == null) return false;
        LocalTime now = ZonedDateTime.ofInstant(ts, BD_ZONE).toLocalTime();
        if (start.equals(end)) return false;
        if (start.isBefore(end)) {
            return !now.isBefore(start) && now.isBefore(end);
        }
        // Wrap around midnight
        return !now.isBefore(start) || now.isBefore(end);
    }

    private void validate(AlarmRuleRequest req, boolean isCreate) {
        if (isCreate) {
            if (req.name() == null || req.name().isBlank()) {
                throw new DomainException("VALIDATION", "name required");
            }
            if (req.ruleType() == null) {
                throw new DomainException("VALIDATION", "ruleType required");
            }
        }
        if (req.ruleType() != null) {
            switch (req.ruleType()) {
                case "SPEED_OVER", "VOLTAGE_UNDER" -> {
                    if (req.threshold() == null || req.threshold() <= 0) {
                        throw new DomainException("VALIDATION",
                                "threshold (positive) required for " + req.ruleType());
                    }
                }
                case "ACC_ON_DURING_WINDOW" -> {
                    if (req.windowStart() == null || req.windowEnd() == null) {
                        throw new DomainException("VALIDATION",
                                "windowStart and windowEnd required for ACC_ON_DURING_WINDOW");
                    }
                }
                case "PARKING_TIMEOUT", "OFFLINE_TIMEOUT", "IDLE_TIMEOUT" -> {
                    if (req.threshold() == null || req.threshold() < 1) {
                        throw new DomainException("VALIDATION",
                                "threshold (minutes, >= 1) required for " + req.ruleType());
                    }
                }
                default -> throw new DomainException("VALIDATION", "Unknown ruleType: " + req.ruleType());
            }
        }
        if (req.severity() != null) {
            try {
                AlarmSeverity.valueOf(req.severity());
            } catch (IllegalArgumentException e) {
                throw new DomainException("VALIDATION", "Invalid severity: " + req.severity());
            }
        }
    }

    private static <T> T defaultIfNull(T value, T fallback) {
        return value == null ? fallback : value;
    }
}
