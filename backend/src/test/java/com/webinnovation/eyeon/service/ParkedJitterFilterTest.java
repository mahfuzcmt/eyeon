package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ParkedJitterFilterTest {

    private static final String IMEI = "357445100734645";

    /** Consecutive fixes of the parked 2G tracker on production, 2026-10-21 20:16-20:23 Dhaka, all speed 0. */
    private static final double[][] PARKED = {
            {23.751249, 90.390711}, {23.751318, 90.390791}, {23.751300, 90.390773}, {23.751340, 90.390720},
            {23.751264, 90.390862}, {23.751353, 90.390684}, {23.751124, 90.390827}, {23.751193, 90.390800},
    };

    @Test
    void stillTrackerStaysOnOneSpot() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position first = f.apply(IMEI, PARKED[0][0], PARKED[0][1], 0);
        for (double[] p : PARKED) {
            assertThat(f.apply(IMEI, p[0], p[1], 0)).isEqualTo(first);
        }
    }

    @Test
    void movingFixAlwaysMoves() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0);
        ParkedJitterFilter.Position moved = f.apply(IMEI, 23.751318, 90.390791, 8);
        assertThat(moved).isEqualTo(new ParkedJitterFilter.Position(23.751318, 90.390791));
    }

    @Test
    void slowFixFartherThanTheRadiusMoves() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751204, 90.389751, 0);
        // The 143 m step when the fix came back at 20:15:35.
        ParkedJitterFilter.Position moved = f.apply(IMEI, 23.751282, 90.390587, 0);
        assertThat(moved).isEqualTo(new ParkedJitterFilter.Position(23.751282, 90.390587));
    }

    @Test
    void trackersAreIndependent() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0);
        ParkedJitterFilter.Position other = f.apply("357445100734769", 23.751340, 90.390702, 0);
        assertThat(other).isEqualTo(new ParkedJitterFilter.Position(23.751340, 90.390702));
    }
}
