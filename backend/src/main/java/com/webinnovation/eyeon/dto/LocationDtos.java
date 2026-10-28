package com.webinnovation.eyeon.dto;

import com.webinnovation.eyeon.domain.Location;

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
            Instant lastValidTs,
            /** How the plotted coordinates were obtained: null = GPS, "WIFI" or "LBS". */
            String source,
            /** Radius of the WIFI / LBS estimate in metres; null for GPS. */
            Integer accuracyM
    ) {
        public static LocationView of(Location l) {
            return of(l, l.valid() ? l.ts() : null);
        }

        /**
         * The same view at the position the live feed shows ({@code devices.last_location} / {@code last_speed},
         * after {@code ParkedJitterFilter}). The raw last fix still carries a still tracker's wobble and its few
         * km/h of noise; a client that polls this endpoint between live batches would make the marker jump back
         * and forth and read as moving. Left as is when the tracker never had a fix.
         */
        public LocationView withShown(double shownLatitude, double shownLongitude, int shownSpeed) {
            if (lastValidTs == null) return this;
            return new LocationView(id, imei, ts, shownLatitude, shownLongitude, shownSpeed, course, altitude,
                    satellites, valid, accOn, voltageMv, mileageM, gsmSignal, engineHoursSeconds, lastValidTs,
                    source, accuracyM);
        }

        /** False for a packet without a fix whose coordinates are the (0,0) placeholder. */
        public boolean hasPosition() {
            return valid || lastValidTs != null || latitude != 0 || longitude != 0;
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
                    lastValidTs,
                    l.source(),
                    l.accuracyM()
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
                    lastValid.ts(),
                    lastValid.source(),
                    lastValid.accuracyM()
            );
        }
    }
}
