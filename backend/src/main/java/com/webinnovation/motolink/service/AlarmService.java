package com.webinnovation.motolink.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.motolink.config.RedisConfig;
import com.webinnovation.motolink.domain.Alarm;
import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.dto.AlarmDtos.AlarmOverview;
import com.webinnovation.motolink.dto.AlarmDtos.AlarmOverviewRow;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.domain.enums.AlarmSeverity;
import com.webinnovation.motolink.domain.enums.AlarmType;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.AlarmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Persists alarms and broadcasts them via Redis pub/sub. The Redis listener
 * ({@link com.webinnovation.motolink.ws.AlarmFanout}) routes each event to
 * {@code /topic/org/{orgId}/alarms} so only that tenant's STOMP subscribers
 * receive it (CLAUDE.md §7.5).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlarmService {

    private final AlarmRepository repo;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final SmsService smsService;
    private final PushService pushService;
    private final DeviceRepository deviceRepo;

    public static final Set<String> PROCESS_RESULTS = Set.of("HANDLED", "FALSE_ALARM", "NO_ACTION");

    public Alarm raise(UUID orgId, String imei, AlarmType type, AlarmSeverity severity,
                       Instant ts, Double lat, Double lng, Map<String, Object> metadata) {
        UUID id = repo.insert(orgId, imei, type.name(), severity.name(), ts, lat, lng, metadata);
        Alarm a = repo.findByOrgAndId(orgId, id)
                .orElseThrow(() -> new IllegalStateException("Alarm vanished after insert: " + id));
        publish(a);
        if (severity == AlarmSeverity.CRITICAL) {
            // Phase 3: stub log-only — Phase 4 will resolve owner contacts.
            smsService.sendAlarmSms(a, null, severity + " " + type + " on " + imei);
        }
        if (severity != AlarmSeverity.INFO) {
            // WARNING/CRITICAL only — pushing every ACC_ON/OFF would spam owners.
            pushService.sendAlarmPush(a);
        }
        return a;
    }

    public Alarm getOrThrow(UUID orgId, UUID id) {
        return repo.findByOrgAndId(orgId, id)
                .orElseThrow(() -> new NotFoundException("Alarm not found: " + id));
    }

    public List<Alarm> listForOrg(UUID orgId, Boolean onlyUnacked, int limit, int offset) {
        return repo.listForOrg(orgId, onlyUnacked, clamp(limit, 1, 500), Math.max(0, offset));
    }

    public List<Alarm> listForOrg(UUID orgId, AlarmRepository.AlarmFilter filter, int limit, int offset) {
        return repo.listForOrg(orgId, filter, clamp(limit, 1, 500), Math.max(0, offset));
    }

    public List<Alarm> listForDevice(UUID orgId, String imei, int limit, int offset) {
        return repo.listForDevice(orgId, imei, clamp(limit, 1, 500), Math.max(0, offset));
    }

    public List<Alarm> listForRange(UUID orgId, Instant from, Instant to) {
        return repo.findInRange(orgId, from, to);
    }

    public boolean acknowledge(UUID orgId, UUID alarmId, UUID userId) {
        return repo.acknowledge(orgId, alarmId, userId);
    }

    public boolean acknowledge(UUID orgId, UUID alarmId, UUID userId, String result, String notes) {
        return repo.acknowledge(orgId, alarmId, userId, result, notes);
    }

    /**
     * Per-vehicle alarm counts by type for a period. Every org device appears
     * (zero rows included) so the report doubles as a "quiet vehicles" check,
     * mirroring ADL's Alarm Overview.
     */
    public AlarmOverview overview(UUID orgId, Instant from, Instant to) {
        return overview(orgId, from, to, null);
    }

    /** @param visible IMEIs the caller may see; null = unrestricted. */
    public AlarmOverview overview(UUID orgId, Instant from, Instant to, Set<String> visible) {
        List<AlarmRepository.TypeCount> counts = repo.countByDeviceAndType(orgId, from, to, visible);
        Map<String, Map<String, Integer>> byImei = new TreeMap<>();
        TreeSet<String> types = new TreeSet<>();
        for (var c : counts) {
            byImei.computeIfAbsent(c.imei(), k -> new TreeMap<>()).merge(c.type(), c.count(), Integer::sum);
            types.add(c.type());
        }
        List<AlarmOverviewRow> rows = new ArrayList<>();
        for (Device d : deviceRepo.listForOrg(orgId)) {
            if (!DeviceAccessService.canSee(visible, d.imei())) continue;
            Map<String, Integer> m = byImei.getOrDefault(d.imei(), Map.of());
            int total = m.values().stream().mapToInt(Integer::intValue).sum();
            rows.add(new AlarmOverviewRow(d.imei(), d.name(), d.vehiclePlate(), m, total));
            byImei.remove(d.imei());
        }
        // Alarms for devices no longer in the org (deleted / moved) still count —
        // for unrestricted callers; a restricted user has no claim to them.
        for (var e : visible == null ? byImei.entrySet() : Set.<Map.Entry<String, Map<String, Integer>>>of()) {
            int total = e.getValue().values().stream().mapToInt(Integer::intValue).sum();
            rows.add(new AlarmOverviewRow(e.getKey(), null, null, e.getValue(), total));
        }
        rows.sort(Comparator.comparingInt(AlarmOverviewRow::total).reversed()
                .thenComparing(r -> r.name() == null ? r.imei() : r.name()));
        return new AlarmOverview(new ArrayList<>(types), rows);
    }

    private void publish(Alarm a) {
        try {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.id().toString());
            m.put("orgId", a.orgId().toString());
            m.put("imei", a.deviceImei());
            m.put("type", a.type());
            m.put("severity", a.severity());
            m.put("ts", a.ts().toString());
            m.put("latitude", a.latitude());
            m.put("longitude", a.longitude());
            m.put("metadata", a.metadata());
            redis.convertAndSend(RedisConfig.ALARM_EVENTS_CHANNEL, objectMapper.writeValueAsString(m));
        } catch (Exception e) {
            log.warn("Alarm publish failed for id={}: {}", a.id(), e.getMessage());
        }
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.min(Math.max(v, lo), hi);
    }
}
