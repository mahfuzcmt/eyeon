package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Geofence record. {@code geom} is stored server-side as PostGIS GEOGRAPHY;
 * the in-memory shape carries the decoded representation: for CIRCLE, a
 * single center {@link LatLng} + {@code radiusM}; for POLYGON, an ordered
 * list of {@link LatLng} vertices forming a closed ring.
 */
public record Geofence(
        UUID id,
        UUID orgId,
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
    public record LatLng(double lat, double lng) {}
}
