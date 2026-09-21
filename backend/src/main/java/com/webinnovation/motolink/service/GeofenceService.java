package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Geofence;
import com.webinnovation.motolink.domain.enums.AlarmSeverity;
import com.webinnovation.motolink.domain.enums.AlarmType;
import com.webinnovation.motolink.domain.enums.GeofenceNotifyOn;
import com.webinnovation.motolink.domain.enums.GeofenceType;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.protocol.LocationData;
import com.webinnovation.motolink.repository.GeofenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Geofence CRUD and per-location evaluation (CLAUDE.md §7.2).
 *
 * <p>{@link #evaluate(LocationData)} is called from the ingestion executor after the
 * location has been persisted. It compares the new point against every geofence assigned
 * to the device, compares to the previous {@code geofence_states} flag, and raises an
 * alarm only on transition (no double-fire while the device sits inside).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeofenceService {

    private final GeofenceRepository repo;
    private final AlarmService alarmService;

    public List<Geofence> listForOrg(UUID orgId) {
        return repo.listForOrg(orgId);
    }

    public Geofence getOrThrow(UUID orgId, UUID id) {
        return repo.findByOrgAndId(orgId, id)
                .orElseThrow(() -> new NotFoundException("Geofence not found: " + id));
    }

    public Geofence createCircle(UUID orgId, String name, GeofenceNotifyOn notifyOn, String color,
                                 double centerLat, double centerLng, int radiusM,
                                 List<String> assignedImeis) {
        if (radiusM < 10 || radiusM > 100_000) {
            throw new IllegalArgumentException("Radius must be 10..100000 meters");
        }
        UUID id = repo.insertCircle(orgId, name, notifyOn.name(), color,
                centerLat, centerLng, radiusM);
        attach(id, assignedImeis);
        return getOrThrow(orgId, id);
    }

    public Geofence createPolygon(UUID orgId, String name, GeofenceNotifyOn notifyOn, String color,
                                  List<Geofence.LatLng> vertices, List<String> assignedImeis) {
        UUID id = repo.insertPolygon(orgId, name, notifyOn.name(), color, vertices);
        attach(id, assignedImeis);
        return getOrThrow(orgId, id);
    }

    public void delete(UUID orgId, UUID id) {
        if (!repo.softDelete(orgId, id)) {
            throw new NotFoundException("Geofence not found: " + id);
        }
    }

    public void assignDevices(UUID orgId, UUID id, List<String> imeis) {
        getOrThrow(orgId, id);
        attach(id, imeis);
    }

    public void unassignDevice(UUID orgId, UUID id, String imei) {
        getOrThrow(orgId, id);
        repo.unassignDevice(id, imei);
    }

    public List<String> listAssignedImeis(UUID orgId, UUID id) {
        getOrThrow(orgId, id);
        return repo.listAssignedImeis(id);
    }

    private void attach(UUID geofenceId, List<String> imeis) {
        if (imeis == null) return;
        for (String imei : imeis) {
            if (imei != null && !imei.isBlank()) {
                repo.assignDevice(geofenceId, imei);
            }
        }
    }

    /**
     * Hot-path evaluation. Called from {@link LocationService#saveAndBroadcast} after the
     * location row has been written. Detects ENTER and EXIT transitions per assigned
     * geofence and emits one alarm per transition through {@link AlarmService}.
     */
    public void evaluate(LocationData loc) {
        if (loc.getOrgId() == null || loc.getImei() == null || !loc.isValid()) return;
        try {
            List<GeofenceRepository.EvaluationRow> rows =
                    repo.findActiveForDeviceWithState(
                            loc.getOrgId(), loc.getImei(),
                            loc.getLatitude(), loc.getLongitude());
            for (var row : rows) {
                Boolean prev = row.previousInside();
                boolean inside = row.inside();
                boolean changed = (prev == null) || prev != inside;
                if (!changed) continue;

                repo.upsertState(row.geofenceId(), loc.getImei(), inside);

                // First sample for a (geofence, device) pair: persist state but don't
                // raise an alarm — we don't know which side it crossed from.
                if (prev == null) continue;

                String notifyOn = Optional.ofNullable(row.notifyOn()).orElse("BOTH");
                boolean shouldNotify = switch (notifyOn) {
                    case "ENTER" -> inside;
                    case "EXIT" -> !inside;
                    default -> true;  // BOTH
                };
                if (!shouldNotify) continue;

                AlarmType type = inside ? AlarmType.GEOFENCE_ENTER : AlarmType.GEOFENCE_EXIT;
                Map<String, Object> meta = new HashMap<>();
                meta.put("geofenceId", row.geofenceId().toString());
                meta.put("geofenceName", row.name());
                alarmService.raise(
                        loc.getOrgId(), loc.getImei(), type, AlarmSeverity.WARNING,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(), meta);
            }
        } catch (Exception e) {
            log.warn("Geofence evaluation failed for imei={}: {}", loc.getImei(), e.getMessage(), e);
        }
    }

    public static GeofenceType parseType(String s) {
        if (s == null) throw new IllegalArgumentException("type required");
        return GeofenceType.valueOf(s.toUpperCase());
    }

    public static GeofenceNotifyOn parseNotifyOn(String s) {
        if (s == null || s.isBlank()) return GeofenceNotifyOn.BOTH;
        return GeofenceNotifyOn.valueOf(s.toUpperCase());
    }
}
