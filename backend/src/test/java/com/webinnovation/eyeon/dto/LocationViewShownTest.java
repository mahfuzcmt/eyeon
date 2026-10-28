package com.webinnovation.eyeon.dto;

import com.webinnovation.eyeon.dto.LocationDtos.LocationView;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class LocationViewShownTest {

    private static LocationView raw(Instant lastValidTs) {
        return new LocationView(1, "357445100700001", Instant.parse("2026-10-28T06:00:00Z"),
                23.80012, 90.41055, 9, 120, null, 6, true, null, null, null, null, null,
                lastValidTs, null, null);
    }

    /** The REST last-known position must match the live feed, or a polling client flips between the two. */
    @Test
    void usesTheHeldPositionAndSpeedInsteadOfTheRawFix() {
        LocationView v = raw(Instant.parse("2026-10-28T06:00:00Z")).withShown(23.8000, 90.4103, 0);

        assertThat(v.latitude()).isEqualTo(23.8000);
        assertThat(v.longitude()).isEqualTo(90.4103);
        assertThat(v.speed()).isZero();
        assertThat(v.ts()).isEqualTo(Instant.parse("2026-10-28T06:00:00Z"));
        assertThat(v.valid()).isTrue();
    }

    @Test
    void leavesATrackerThatNeverHadAFixAlone() {
        LocationView v = raw(null);
        assertThat(v.withShown(23.8, 90.4, 0)).isSameAs(v);
    }
}
