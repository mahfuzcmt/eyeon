package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Trip;

import java.time.Instant;
import java.util.UUID;

public final class TripDtos {

    private TripDtos() {}

    public record TripView(
            UUID id,
            String deviceImei,
            Instant startedAt,
            Instant endedAt,
            Double startLat,
            Double startLng,
            Double endLat,
            Double endLng,
            int distanceM,
            Integer durationS,
            int maxSpeed,
            int avgSpeed,
            int idleTimeS,
            String status
    ) {
        public static TripView of(Trip t) {
            return new TripView(
                    t.id(), t.deviceImei(), t.startedAt(), t.endedAt(),
                    t.startLat(), t.startLng(), t.endLat(), t.endLng(),
                    t.distanceM(), t.durationS(),
                    t.maxSpeed(), t.avgSpeed(), t.idleTimeS(),
                    t.status()
            );
        }
    }
}
