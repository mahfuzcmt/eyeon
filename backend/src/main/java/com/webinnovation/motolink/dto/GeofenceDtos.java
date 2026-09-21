package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Geofence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class GeofenceDtos {

    private GeofenceDtos() {}

    public record LatLng(double lat, double lng) {}

    public record CreateRequest(
            String name,
            String type,            // "CIRCLE" | "POLYGON"
            String notifyOn,        // "ENTER" | "EXIT" | "BOTH"
            String color,
            LatLng center,          // CIRCLE only
            Integer radiusM,        // CIRCLE only, meters
            List<LatLng> polygon,   // POLYGON only, ordered vertices
            List<String> imeis      // optional initial assignment
    ) {}

    public record AssignRequest(List<String> imeis) {}

    public record GeofenceView(
            UUID id,
            String name,
            String type,
            String notifyOn,
            String color,
            boolean active,
            LatLng center,
            Integer radiusM,
            List<LatLng> polygon,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static GeofenceView of(Geofence g) {
            LatLng center = g.center() == null
                    ? null
                    : new LatLng(g.center().lat(), g.center().lng());
            List<LatLng> poly = g.polygon().stream()
                    .map(p -> new LatLng(p.lat(), p.lng()))
                    .toList();
            return new GeofenceView(
                    g.id(), g.name(), g.type(), g.notifyOn(), g.color(),
                    g.active(), center, g.radiusM(), poly,
                    g.createdAt(), g.updatedAt()
            );
        }
    }
}
