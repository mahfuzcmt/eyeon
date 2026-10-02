package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.domain.enums.GeofenceKind;
import com.webinnovation.eyeon.domain.enums.GeofenceNotifyOn;
import com.webinnovation.eyeon.domain.enums.GeofenceType;
import com.webinnovation.eyeon.domain.enums.PlaceType;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.repository.GeofenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
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
 * to the device and raises an alarm only on a <em>confirmed</em> transition — see
 * {@link GeofenceTransition} for the drift guards. Trusted places raise calm
 * {@code PLACE_ARRIVED}/{@code PLACE_LEFT} events; boundaries raise
 * {@code GEOFENCE_ENTER}/{@code GEOFENCE_EXIT} warnings.
 *
 * <p>Geofences are per user (V21): every CRUD method takes the owner, and the alarms a geofence
 * raises carry {@code metadata.geofenceOwnerId} so only its owner is told about them.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeofenceService {

    private final GeofenceRepository repo;
    private final AlarmService alarmService;
    private final DeviceAccessService access;

    /** Below this a wearable's GPS error alone produces false arrivals/departures. */
    static final int MIN_PLACE_RADIUS_M = 80;
    static final int MAX_PLACE_RADIUS_M = 5_000;

    /** Kind + labelling for a new geofence. {@code kind == null} means BOUNDARY (pre-V19 clients). */
    public record Labels(GeofenceKind kind, PlaceType placeType, String address, UUID createdBy) {
        public static final Labels BOUNDARY = new Labels(GeofenceKind.BOUNDARY, null, null, null);

        GeofenceRepository.Meta toMeta() {
            GeofenceKind k = kind == null ? GeofenceKind.BOUNDARY : kind;
            PlaceType pt = k == GeofenceKind.TRUSTED_PLACE
                    ? (placeType == null ? PlaceType.OTHER : placeType)
                    : null;
            return new GeofenceRepository.Meta(k.name(), pt == null ? null : pt.name(), blankToNull(address), createdBy);
        }
    }

    /** Partial update: a null field keeps the current value. */
    public record Patch(String name, GeofenceNotifyOn notifyOn, String color,
                        GeofenceKind kind, PlaceType placeType, String address,
                        Geofence.LatLng center, Integer radiusM, List<Geofence.LatLng> polygon,
                        Integer exitBufferM, Integer minDwellS) {}

    public List<Geofence> listForOwner(UUID orgId, UUID ownerUserId, GeofenceKind kind) {
        return repo.listForOwner(orgId, ownerUserId, kind == null ? null : kind.name());
    }

    /** 404 unless the geofence exists AND belongs to {@code ownerUserId}. */
    public Geofence getOrThrow(UUID orgId, UUID ownerUserId, UUID id) {
        return repo.findByOwnerAndId(orgId, ownerUserId, id)
                .orElseThrow(() -> new NotFoundException("Geofence not found: " + id));
    }

    public Geofence createCircle(UUID orgId, String name, GeofenceNotifyOn notifyOn, String color,
                                 double centerLat, double centerLng, int radiusM,
                                 List<String> assignedImeis, Labels labels) {
        GeofenceRepository.Meta meta = labels.toMeta();
        validateRadius(radiusM, GeofenceKind.valueOf(meta.kind()));
        UUID id = repo.insertCircle(orgId, name, notifyOn.name(), color,
                centerLat, centerLng, radiusM, meta);
        attach(id, assignedImeis);
        return getOrThrow(orgId, labels.createdBy(), id);
    }

    public Geofence createPolygon(UUID orgId, String name, GeofenceNotifyOn notifyOn, String color,
                                  List<Geofence.LatLng> vertices, List<String> assignedImeis,
                                  Labels labels) {
        GeofenceRepository.Meta meta = labels.toMeta();
        if (GeofenceKind.TRUSTED_PLACE.name().equals(meta.kind())) {
            throw new IllegalArgumentException("A trusted place must be a CIRCLE");
        }
        UUID id = repo.insertPolygon(orgId, name, notifyOn.name(), color, vertices, meta);
        attach(id, assignedImeis);
        return getOrThrow(orgId, labels.createdBy(), id);
    }

    public Geofence update(UUID orgId, UUID ownerUserId, UUID id, Patch p) {
        Geofence cur = getOrThrow(orgId, ownerUserId, id);

        boolean toPolygon = p.polygon() != null;
        boolean circleChange = !toPolygon && (p.center() != null || p.radiusM() != null);
        boolean circleAfter = toPolygon ? false : (circleChange || "CIRCLE".equalsIgnoreCase(cur.type()));

        GeofenceKind kind = p.kind() != null ? p.kind() : GeofenceKind.valueOf(cur.kind());
        if (kind == GeofenceKind.TRUSTED_PLACE && !circleAfter) {
            throw new IllegalArgumentException("A trusted place must be a CIRCLE");
        }

        Geofence.LatLng center = p.center() != null ? p.center() : cur.center();
        Integer radius = p.radiusM() != null ? p.radiusM() : cur.radiusM();
        if (circleAfter) {
            if (center == null || radius == null) {
                throw new IllegalArgumentException("center and radiusM required for CIRCLE");
            }
            validateRadius(radius, kind);
        }

        String name = p.name() != null ? p.name().trim() : cur.name();
        if (name.isBlank()) throw new IllegalArgumentException("name required");
        int exitBuffer = p.exitBufferM() != null ? p.exitBufferM() : cur.exitBufferM();
        int minDwell = p.minDwellS() != null ? p.minDwellS() : cur.minDwellS();
        if (exitBuffer < 0 || exitBuffer > 500) throw new IllegalArgumentException("exitBufferM must be 0..500");
        if (minDwell < 0 || minDwell > 3600) throw new IllegalArgumentException("minDwellS must be 0..3600");

        String placeType = kind == GeofenceKind.TRUSTED_PLACE
                ? (p.placeType() != null ? p.placeType().name()
                        : cur.placeType() != null ? cur.placeType() : PlaceType.OTHER.name())
                : null;

        repo.updateDetails(orgId, id, name,
                p.notifyOn() != null ? p.notifyOn().name() : cur.notifyOn(),
                p.color() != null ? p.color() : cur.color(),
                kind.name(), placeType,
                p.address() != null ? blankToNull(p.address()) : cur.address(),
                exitBuffer, minDwell);

        if (toPolygon) {
            repo.updatePolygonGeometry(orgId, id, p.polygon());
        } else if (circleChange) {
            repo.updateCircleGeometry(orgId, id, center.lat(), center.lng(), radius);
        }
        if (toPolygon || circleChange || exitBuffer != cur.exitBufferM()) {
            repo.resetStates(id);
        }
        return getOrThrow(orgId, ownerUserId, id);
    }

    private static void validateRadius(int radiusM, GeofenceKind kind) {
        if (kind == GeofenceKind.TRUSTED_PLACE) {
            if (radiusM < MIN_PLACE_RADIUS_M || radiusM > MAX_PLACE_RADIUS_M) {
                throw new IllegalArgumentException(
                        "Trusted place radius must be " + MIN_PLACE_RADIUS_M + ".." + MAX_PLACE_RADIUS_M + " meters");
            }
        } else if (radiusM < 10 || radiusM > 100_000) {
            throw new IllegalArgumentException("Radius must be 10..100000 meters");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public void delete(UUID orgId, UUID ownerUserId, UUID id) {
        if (!repo.softDelete(orgId, ownerUserId, id)) {
            throw new NotFoundException("Geofence not found: " + id);
        }
    }

    public void assignDevices(UUID orgId, UUID ownerUserId, UUID id, List<String> imeis) {
        getOrThrow(orgId, ownerUserId, id);
        attach(id, imeis);
    }

    public void unassignDevice(UUID orgId, UUID ownerUserId, UUID id, String imei) {
        getOrThrow(orgId, ownerUserId, id);
        repo.unassignDevice(id, imei);
    }

    public List<String> listAssignedImeis(UUID orgId, UUID ownerUserId, UUID id) {
        getOrThrow(orgId, ownerUserId, id);
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
            Instant ts = loc.getTimestamp() != null ? loc.getTimestamp() : Instant.now();
            for (var row : rows) {
                GeofenceTransition.Decision d = GeofenceTransition.decide(
                        row.previousInside(), row.inside(), row.withinBuffer(),
                        row.pendingInside(), row.pendingSince(), ts, row.minDwellS());

                switch (d.action()) {
                    case NONE -> { }
                    // First sample for a (geofence, device) pair: persist state but don't
                    // raise an alarm — we don't know which side it crossed from.
                    case SEED -> repo.upsertState(row.geofenceId(), loc.getImei(), d.inside(), d.eventTs());
                    case SET_PENDING -> repo.setPending(row.geofenceId(), loc.getImei(), d.inside(), d.eventTs());
                    case CLEAR_PENDING -> repo.setPending(row.geofenceId(), loc.getImei(), null, null);
                    case COMMIT -> {
                        repo.upsertState(row.geofenceId(), loc.getImei(), d.inside(), d.eventTs());
                        raiseTransition(loc, row, d);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Geofence evaluation failed for imei={}: {}", loc.getImei(), e.getMessage(), e);
        }
    }

    private void raiseTransition(LocationData loc, GeofenceRepository.EvaluationRow row,
                                 GeofenceTransition.Decision d) {
        boolean inside = d.inside();
        String notifyOn = Optional.ofNullable(row.notifyOn()).orElse("BOTH");
        boolean shouldNotify = switch (notifyOn) {
            case "ENTER" -> inside;
            case "EXIT" -> !inside;
            case "NONE" -> false;
            default -> true;  // BOTH
        };
        if (!shouldNotify) return;

        // The owner may since have lost access to this child (unassigned by the school):
        // then their place must not keep reporting that child's movements to them.
        if (row.ownerUserId() != null
                && !DeviceAccessService.canSee(access.visibleImeis(row.ownerUserId()), loc.getImei())) {
            return;
        }

        boolean trustedPlace = GeofenceKind.TRUSTED_PLACE.name().equals(row.kind());
        AlarmType type = trustedPlace
                ? (inside ? AlarmType.PLACE_ARRIVED : AlarmType.PLACE_LEFT)
                : (inside ? AlarmType.GEOFENCE_ENTER : AlarmType.GEOFENCE_EXIT);
        // Being where you're supposed to be is news, not a warning: only leaving a boundary
        // warns. Coming back inside is INFO, like reaching or leaving a trusted place.
        AlarmSeverity severity = trustedPlace || inside ? AlarmSeverity.INFO : AlarmSeverity.WARNING;

        Map<String, Object> meta = new HashMap<>();
        meta.put("geofenceId", row.geofenceId().toString());
        meta.put("geofenceName", row.name());
        meta.put("geofenceKind", row.kind());
        if (row.ownerUserId() != null) {
            meta.put(com.webinnovation.eyeon.repository.AlarmRepository.GEOFENCE_OWNER_KEY, row.ownerUserId().toString());
        }
        if (row.placeType() != null) meta.put("placeType", row.placeType());
        alarmService.raise(
                loc.getOrgId(), loc.getImei(), type, severity,
                d.eventTs(), loc.getLatitude(), loc.getLongitude(), meta);
    }

    public static GeofenceKind parseKind(String s) {
        if (s == null || s.isBlank()) return null;
        return GeofenceKind.valueOf(s.toUpperCase());
    }

    public static PlaceType parsePlaceType(String s) {
        if (s == null || s.isBlank()) return null;
        return PlaceType.valueOf(s.toUpperCase());
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
