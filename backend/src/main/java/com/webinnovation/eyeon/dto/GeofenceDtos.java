package com.webinnovation.eyeon.dto;

import com.webinnovation.eyeon.domain.Geofence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class GeofenceDtos {

    private GeofenceDtos() {}

    public record LatLng(double lat, double lng) {}

    public record CreateRequest(
            String name,
            String type,            // "CIRCLE" | "POLYGON"
            String notifyOn,        // "ENTER" | "EXIT" | "BOTH" | "NONE"
            String color,
            LatLng center,          // CIRCLE only
            Integer radiusM,        // CIRCLE only, meters
            List<LatLng> polygon,   // POLYGON only, ordered vertices
            List<String> imeis,     // optional initial assignment
            String kind,            // "TRUSTED_PLACE" | "BOUNDARY" (default)
            String placeType,       // TRUSTED_PLACE only: HOME SCHOOL COACHING MOSQUE HOSPITAL RELATIVE OTHER
            String address          // optional label shown under the name
    ) {}

    /** PATCH body: every field optional, null keeps the current value. */
    public record UpdateRequest(
            String name,
            String notifyOn,
            String color,
            String kind,
            String placeType,
            String address,
            LatLng center,          // sending center and/or radiusM reshapes a circle
            Integer radiusM,
            List<LatLng> polygon,   // sending polygon converts the zone to a POLYGON
            Integer exitBufferM,
            Integer minDwellS
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
            String kind,
            String placeType,
            String address,
            int exitBufferM,
            int minDwellS,
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
                    g.kind(), g.placeType(), g.address(), g.exitBufferM(), g.minDwellS(),
                    g.createdAt(), g.updatedAt()
            );
        }
    }

    /** An expected time on a trusted place: "be here by 08:15" / "have left by 21:00". */
    public record ScheduleView(java.util.UUID id, String kind, String time, java.util.List<Integer> weekdays,
                               int graceMinutes, boolean active) {
        public static ScheduleView of(com.webinnovation.eyeon.repository.PlaceScheduleRepository.Schedule s) {
            return new ScheduleView(s.id(), s.kind(), s.localTime().toString().substring(0, 5), s.weekdays(),
                    s.graceMinutes(), s.active());
        }
    }

    /** @param kind ARRIVE_BY | LEAVE_BY; @param time HH:mm in the organization's timezone; @param weekdays ISO 1 (Mon) - 7 (Sun) */
    /** {@code graceMinutes} 0-120, null = 10. */
    public record ScheduleCreate(String kind, String time, java.util.List<Integer> weekdays, Integer graceMinutes) {}
}
