package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.Geofence;
import com.webinnovation.motolink.domain.enums.GeofenceNotifyOn;
import com.webinnovation.motolink.domain.enums.GeofenceType;
import com.webinnovation.motolink.dto.GeofenceDtos.AssignRequest;
import com.webinnovation.motolink.dto.GeofenceDtos.CreateRequest;
import com.webinnovation.motolink.dto.GeofenceDtos.GeofenceView;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import com.webinnovation.motolink.service.GeofenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/geofences")
@RequiredArgsConstructor
public class GeofenceController {

    private final GeofenceService service;
    private final AuditService audit;

    @GetMapping
    public List<GeofenceView> list() {
        UUID orgId = TenantContext.requireOrgId();
        return service.listForOrg(orgId).stream().map(GeofenceView::of).toList();
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

        Geofence saved = switch (type) {
            case CIRCLE -> {
                if (req.center() == null || req.radiusM() == null) {
                    throw new IllegalArgumentException("center and radiusM required for CIRCLE");
                }
                yield service.createCircle(orgId, req.name(), notify, req.color(),
                        req.center().lat(), req.center().lng(), req.radiusM(),
                        req.imeis());
            }
            case POLYGON -> {
                if (req.polygon() == null || req.polygon().size() < 3) {
                    throw new IllegalArgumentException("polygon with ≥3 vertices required");
                }
                List<Geofence.LatLng> verts = req.polygon().stream()
                        .map(p -> new Geofence.LatLng(p.lat(), p.lng()))
                        .toList();
                yield service.createPolygon(orgId, req.name(), notify, req.color(), verts, req.imeis());
            }
        };
        audit.record("GEOFENCE_CREATE", "geofence", saved.id().toString(),
                java.util.Map.of("name", saved.name(), "type", saved.type()));
        return ResponseEntity.status(HttpStatus.CREATED).body(GeofenceView.of(saved));
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
