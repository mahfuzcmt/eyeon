package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.domain.Geofence;
import com.webinnovation.eyeon.domain.enums.GeofenceNotifyOn;
import com.webinnovation.eyeon.domain.enums.GeofenceType;
import com.webinnovation.eyeon.dto.GeofenceDtos.AssignRequest;
import com.webinnovation.eyeon.dto.GeofenceDtos.CreateRequest;
import com.webinnovation.eyeon.dto.GeofenceDtos.GeofenceView;
import com.webinnovation.eyeon.dto.GeofenceDtos.UpdateRequest;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.GeofenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/geofences")
@RequiredArgsConstructor
public class GeofenceController {

    private final GeofenceService service;
    private final AuditService audit;
    private final DeviceAccessService access;
    private final com.webinnovation.eyeon.service.ExpectedTimeService expectedTimes;
    private final com.webinnovation.eyeon.service.PlaceRouteService routes;

    /** The caller's own geofences and trusted places (per user since V21). @param kind TRUSTED_PLACE or BOUNDARY */
    @GetMapping
    public List<GeofenceView> list(@RequestParam(required = false) String kind) {
        UUID orgId = TenantContext.requireOrgId();
        return service.listForOwner(orgId, TenantContext.requireUserId(), GeofenceService.parseKind(kind))
                .stream().map(GeofenceView::of).toList();
    }

    @GetMapping("/{id}")
    public GeofenceView get(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        return GeofenceView.of(service.getOrThrow(orgId, TenantContext.requireUserId(), id));
    }

    /** A place may only watch children its owner can see. */
    private void requireVisibleAll(List<String> imeis) {
        if (imeis == null) return;
        for (String imei : imeis) {
            if (imei != null && !imei.isBlank()) access.requireVisible(imei);
        }
    }

    @PostMapping
    public ResponseEntity<GeofenceView> create(@RequestBody CreateRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("name required");
        }
        GeofenceType type = GeofenceService.parseType(req.type());
        GeofenceNotifyOn notify = GeofenceService.parseNotifyOn(req.notifyOn());
        requireVisibleAll(req.imeis());
        GeofenceService.Labels labels = new GeofenceService.Labels(
                GeofenceService.parseKind(req.kind()),
                GeofenceService.parsePlaceType(req.placeType()),
                req.address(),
                TenantContext.requireUserId());

        Geofence saved = switch (type) {
            case CIRCLE -> {
                if (req.center() == null || req.radiusM() == null) {
                    throw new IllegalArgumentException("center and radiusM required for CIRCLE");
                }
                yield service.createCircle(orgId, req.name(), notify, req.color(),
                        req.center().lat(), req.center().lng(), req.radiusM(),
                        req.imeis(), labels);
            }
            case POLYGON -> {
                if (req.polygon() == null || req.polygon().size() < 3) {
                    throw new IllegalArgumentException("polygon with ≥3 vertices required");
                }
                List<Geofence.LatLng> verts = req.polygon().stream()
                        .map(p -> new Geofence.LatLng(p.lat(), p.lng()))
                        .toList();
                yield service.createPolygon(orgId, req.name(), notify, req.color(), verts, req.imeis(), labels);
            }
        };
        audit.record("GEOFENCE_CREATE", "geofence", saved.id().toString(),
                java.util.Map.of("name", saved.name(), "type", saved.type(), "kind", saved.kind()));
        return ResponseEntity.status(HttpStatus.CREATED).body(GeofenceView.of(saved));
    }

    @PatchMapping("/{id}")
    public GeofenceView update(@PathVariable UUID id, @RequestBody UpdateRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        List<Geofence.LatLng> polygon = req.polygon() == null ? null
                : req.polygon().stream().map(p -> new Geofence.LatLng(p.lat(), p.lng())).toList();
        Geofence saved = service.update(orgId, TenantContext.requireUserId(), id, new GeofenceService.Patch(
                req.name(),
                req.notifyOn() == null ? null : GeofenceService.parseNotifyOn(req.notifyOn()),
                req.color(),
                GeofenceService.parseKind(req.kind()),
                GeofenceService.parsePlaceType(req.placeType()),
                req.address(),
                req.center() == null ? null : new Geofence.LatLng(req.center().lat(), req.center().lng()),
                req.radiusM(),
                polygon,
                req.exitBufferM(),
                req.minDwellS()));
        audit.record("GEOFENCE_UPDATE", "geofence", id.toString(),
                java.util.Map.of("name", saved.name(), "kind", saved.kind()));
        return GeofenceView.of(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        service.delete(orgId, TenantContext.requireUserId(), id);
        audit.record("GEOFENCE_DELETE", "geofence", id.toString(), null);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/devices")
    public List<String> assignedDevices(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        return service.listAssignedImeis(orgId, TenantContext.requireUserId(), id);
    }

    @PostMapping("/{id}/devices")
    public ResponseEntity<Void> assignDevices(@PathVariable UUID id, @RequestBody AssignRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        requireVisibleAll(req.imeis());
        service.assignDevices(orgId, TenantContext.requireUserId(), id, req.imeis());
        audit.record("GEOFENCE_ASSIGN", "geofence", id.toString(),
                java.util.Map.of("imeis", req.imeis() == null ? List.of() : req.imeis()));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/devices/{imei}")
    public ResponseEntity<Void> unassignDevice(@PathVariable UUID id, @PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        service.unassignDevice(orgId, TenantContext.requireUserId(), id, imei);
        audit.record("GEOFENCE_UNASSIGN", "geofence", id.toString(),
                java.util.Map.of("imei", imei));
        return ResponseEntity.noContent().build();
    }

    // ---- expected times on a trusted place (owner only, like the place itself) ----

    @GetMapping("/{id}/schedules")
    public List<com.webinnovation.eyeon.dto.GeofenceDtos.ScheduleView> schedules(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        return expectedTimes.list(orgId, TenantContext.requireUserId(), id).stream()
                .map(com.webinnovation.eyeon.dto.GeofenceDtos.ScheduleView::of).toList();
    }

    @PostMapping("/{id}/schedules")
    public ResponseEntity<com.webinnovation.eyeon.dto.GeofenceDtos.ScheduleView> addSchedule(
            @PathVariable UUID id, @RequestBody com.webinnovation.eyeon.dto.GeofenceDtos.ScheduleCreate req) {
        UUID orgId = TenantContext.requireOrgId();
        var created = expectedTimes.create(orgId, TenantContext.requireUserId(), id, req.kind(), req.time(), req.weekdays(),
                req.graceMinutes());
        audit.record("PLACE_SCHEDULE_ADD", "geofence", id.toString(),
                java.util.Map.of("kind", created.kind(), "time", created.localTime().toString()));
        return ResponseEntity.status(201).body(com.webinnovation.eyeon.dto.GeofenceDtos.ScheduleView.of(created));
    }

    // ---- the usual route to / from a trusted place (owner only) ----

    @GetMapping("/{id}/routes")
    public List<com.webinnovation.eyeon.dto.GeofenceDtos.RouteView> routes(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        return routes.list(orgId, TenantContext.requireUserId(), id).stream()
                .map(com.webinnovation.eyeon.dto.GeofenceDtos.RouteView::of).toList();
    }

    @PostMapping("/{id}/routes")
    public ResponseEntity<com.webinnovation.eyeon.dto.GeofenceDtos.RouteView> createRoute(
            @PathVariable UUID id, @RequestBody com.webinnovation.eyeon.dto.GeofenceDtos.RouteSave req) {
        UUID orgId = TenantContext.requireOrgId();
        var saved = routes.create(orgId, TenantContext.requireUserId(), id, routeInput(req, req.direction()));
        auditRoute("PLACE_ROUTE_SAVE", id, saved);
        return ResponseEntity.status(201).body(com.webinnovation.eyeon.dto.GeofenceDtos.RouteView.of(saved));
    }

    /**
     * {@code key} is a route's id. Apps from before named routes send TO / FROM instead and only a
     * line: that replaces the line of the first route in that direction (or makes it).
     */
    @PutMapping("/{id}/routes/{key}")
    public com.webinnovation.eyeon.dto.GeofenceDtos.RouteView saveRoute(
            @PathVariable UUID id, @PathVariable String key,
            @RequestBody com.webinnovation.eyeon.dto.GeofenceDtos.RouteSave req) {
        UUID orgId = TenantContext.requireOrgId();
        UUID routeId = routeId(key);
        var saved = routeId == null
                ? routes.saveByDirection(orgId, TenantContext.requireUserId(), id, key, req.mode(),
                        com.webinnovation.eyeon.dto.GeofenceDtos.pts(req.waypoints()),
                        com.webinnovation.eyeon.dto.GeofenceDtos.pts(req.path()), req.widthM())
                : routes.update(orgId, TenantContext.requireUserId(), id, routeId, routeInput(req, req.direction()));
        auditRoute("PLACE_ROUTE_SAVE", id, saved);
        return com.webinnovation.eyeon.dto.GeofenceDtos.RouteView.of(saved);
    }

    @DeleteMapping("/{id}/routes/{key}")
    public ResponseEntity<Void> deleteRoute(@PathVariable UUID id, @PathVariable String key) {
        UUID orgId = TenantContext.requireOrgId();
        UUID routeId = routeId(key);
        if (routeId == null) routes.deleteByDirection(orgId, TenantContext.requireUserId(), id, key);
        else routes.delete(orgId, TenantContext.requireUserId(), id, routeId);
        audit.record("PLACE_ROUTE_DELETE", "geofence", id.toString(), java.util.Map.of("route", key));
        return ResponseEntity.noContent().build();
    }

    /** Past trips of one person to / from the place on one day, to save one as the route. */
    @PostMapping("/{id}/routes/from-history")
    public List<com.webinnovation.eyeon.dto.GeofenceDtos.RouteCandidate> routesFromHistory(
            @PathVariable UUID id, @RequestBody com.webinnovation.eyeon.dto.GeofenceDtos.RouteFromHistoryRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        if (req.imei() == null || req.imei().isBlank()) throw new IllegalArgumentException("imei is required");
        access.requireVisible(req.imei());
        java.time.LocalDate date;
        try {
            date = java.time.LocalDate.parse(String.valueOf(req.date()));
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("date must be YYYY-MM-DD");
        }
        return routes.fromHistory(orgId, TenantContext.requireUserId(), id, req.imei(), date, req.direction()).stream()
                .map(c -> new com.webinnovation.eyeon.dto.GeofenceDtos.RouteCandidate(c.from(), c.to(),
                        Math.round(c.lengthM()), com.webinnovation.eyeon.dto.GeofenceDtos.latLngs(c.waypoints()),
                        com.webinnovation.eyeon.dto.GeofenceDtos.latLngs(c.path())))
                .toList();
    }

    private static UUID routeId(String key) {
        try {
            return UUID.fromString(key);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static com.webinnovation.eyeon.service.PlaceRouteService.Input routeInput(
            com.webinnovation.eyeon.dto.GeofenceDtos.RouteSave req, String direction) {
        return new com.webinnovation.eyeon.service.PlaceRouteService.Input(direction, req.name(), req.mode(),
                com.webinnovation.eyeon.dto.GeofenceDtos.pts(req.waypoints()),
                com.webinnovation.eyeon.dto.GeofenceDtos.pts(req.path()), req.widthM(), req.otherGeofenceId(),
                req.weekdays(), req.timeFrom(), req.timeTo(), req.severity());
    }

    private void auditRoute(String action, UUID geofenceId, com.webinnovation.eyeon.repository.PlaceRouteRepository.Route r) {
        audit.record(action, "geofence", geofenceId.toString(), java.util.Map.of("route", r.id().toString(),
                "direction", r.direction(), "widthM", r.widthM(), "severity", r.severity()));
    }

    /** Road line through tapped points, for the route editor. Calls a public routing service: a few seconds. */
    @PostMapping("/routes/snap")
    public com.webinnovation.eyeon.dto.GeofenceDtos.SnapView snapRoute(
            @RequestBody com.webinnovation.eyeon.dto.GeofenceDtos.SnapRequest req) {
        TenantContext.requireOrgId();
        var s = routes.snap(com.webinnovation.eyeon.dto.GeofenceDtos.pts(req.points()), req.mode());
        return new com.webinnovation.eyeon.dto.GeofenceDtos.SnapView(
                com.webinnovation.eyeon.dto.GeofenceDtos.latLngs(s.path()), Math.round(s.lengthM()), s.roads());
    }

    @DeleteMapping("/{id}/schedules/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable UUID id, @PathVariable UUID scheduleId) {
        UUID orgId = TenantContext.requireOrgId();
        expectedTimes.delete(orgId, TenantContext.requireUserId(), id, scheduleId);
        audit.record("PLACE_SCHEDULE_DELETE", "geofence", id.toString(), java.util.Map.of("scheduleId", scheduleId.toString()));
        return ResponseEntity.noContent().build();
    }
}
