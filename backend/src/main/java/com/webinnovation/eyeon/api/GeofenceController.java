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
import com.webinnovation.eyeon.service.GeofenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    /** @param kind optional filter: TRUSTED_PLACE or BOUNDARY */
    @GetMapping
    public List<GeofenceView> list(@RequestParam(required = false) String kind) {
        UUID orgId = TenantContext.requireOrgId();
        return service.listForOrg(orgId, GeofenceService.parseKind(kind))
                .stream().map(GeofenceView::of).toList();
    }

    @GetMapping("/{id}")
    public GeofenceView get(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        return GeofenceView.of(service.getOrThrow(orgId, id));
    }

    @PostMapping
    public ResponseEntity<GeofenceView> create(@RequestBody CreateRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("name required");
        }
        GeofenceType type = GeofenceService.parseType(req.type());
        GeofenceNotifyOn notify = GeofenceService.parseNotifyOn(req.notifyOn());
        GeofenceService.Labels labels = new GeofenceService.Labels(
                GeofenceService.parseKind(req.kind()),
                GeofenceService.parsePlaceType(req.placeType()),
                req.address(),
                TenantContext.currentUserId());

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
        Geofence saved = service.update(orgId, id, new GeofenceService.Patch(
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
        service.delete(orgId, id);
        audit.record("GEOFENCE_DELETE", "geofence", id.toString(), null);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/devices")
    public List<String> assignedDevices(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        return service.listAssignedImeis(orgId, id);
    }

    @PostMapping("/{id}/devices")
    public ResponseEntity<Void> assignDevices(@PathVariable UUID id, @RequestBody AssignRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        service.assignDevices(orgId, id, req.imeis());
        audit.record("GEOFENCE_ASSIGN", "geofence", id.toString(),
                java.util.Map.of("imeis", req.imeis() == null ? List.of() : req.imeis()));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/devices/{imei}")
    public ResponseEntity<Void> unassignDevice(@PathVariable UUID id, @PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        service.unassignDevice(orgId, id, imei);
        audit.record("GEOFENCE_UNASSIGN", "geofence", id.toString(),
                java.util.Map.of("imei", imei));
        return ResponseEntity.noContent().build();
    }
}
