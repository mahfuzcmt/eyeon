package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Location;

import java.time.Instant;

public final class LocationDtos {

    private LocationDtos() {}

    public record LocationView(
            long id,
            String imei,
            Instant ts,
            double latitude,
            double longitude,
            int speed,
            int course,
            Integer altitude,
            Integer satellites,
            boolean valid,
            Boolean accOn,
            Integer voltageMv,
            Long mileageM,
            Integer gsmSignal,
            Integer engineHoursSeconds,
            /** When the plotted coordinates were last confirmed by a GPS fix; null if never. */
            Instant lastValidTs
    ) {
        public static LocationView of(Location l) {
            return of(l, l.valid() ? l.ts() : null);
        }

        private static LocationView of(Location l, Instant lastValidTs) {
            return new LocationView(
                    l.id(),
                    l.deviceImei(),
                    l.ts(),
                    l.latitude(),
                    l.longitude(),
                    l.speed(),
                    l.course(),
                    l.altitude(),
                    l.satellites(),
                    l.valid(),
                    l.accOn(),
                    l.voltageMv(),
                    l.mileageM(),
                    l.gsmSignal(),
                    l.engineHoursSeconds(),
                    lastValidTs
            );
        }

        /**
         * Assemble the dashboard's last-known view: coordinates come from the last
         * confirmed fix, everything time-sensitive (freshness, telemetry, fix state)
         * comes from the newest packet. When the device has never had a fix we fall
         * back to the newest packet wholesale so it still appears on the map.
         */
        public static LocationView ofLastKnown(Location latest, Location lastValid) {
            if (lastValid == null || lastValid.id() == latest.id()) {
                return of(latest);
            }
            return new LocationView(
                    latest.id(),
                    latest.deviceImei(),
                    latest.ts(),
                    lastValid.latitude(),
                    lastValid.longitude(),
                    lastValid.speed(),
                    lastValid.course(),
                    lastValid.altitude(),
                    latest.satellites(),
                    latest.valid(),
                    latest.accOn(),
                    latest.voltageMv(),
                    latest.mileageM(),
                    latest.gsmSignal(),
                    latest.engineHoursSeconds(),
                    lastValid.ts()
            );
        }
    }
}
