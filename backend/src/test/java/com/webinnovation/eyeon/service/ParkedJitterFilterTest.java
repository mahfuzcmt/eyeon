package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.Set;

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
        Set<ParkedJitterFilter.Position> shown = new LinkedHashSet<>();
        for (int round = 0; round < 3; round++) {
            for (double[] p : PARKED) shown.add(f.apply(IMEI, p[0], p[1], 0));
        }
        assertThat(shown).hasSize(1);
    }

    @Test
    void movingFixAlwaysMoves() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0);
        ParkedJitterFilter.Position moved = f.apply(IMEI, 23.751318, 90.390791, 8);
        assertThat(moved).isEqualTo(new ParkedJitterFilter.Position(23.751318, 90.390791));
    }

    @Test
    void slowFixFartherThanTheRadiusMovesOnceTheNextFixAgrees() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position before = f.apply(IMEI, 23.751204, 90.389751, 0);
        // The 143 m step when the fix came back at 20:15:35, then the next fix 10 s later.
        assertThat(f.apply(IMEI, 23.751282, 90.390587, 0)).isEqualTo(before);
        assertThat(f.apply(IMEI, 23.751300, 90.390560, 0))
                .isEqualTo(new ParkedJitterFilter.Position(23.751300, 90.390560));
    }

    @Test
    void oneStrayFixIsIgnored() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position spot = f.apply(IMEI, PARKED[0][0], PARKED[0][1], 0);
        assertThat(f.apply(IMEI, 23.751800, 90.390711, 0)).isEqualTo(spot);   // ~61 m north
        assertThat(f.apply(IMEI, PARKED[1][0], PARKED[1][1], 0)).isEqualTo(spot);
        // The stray is forgotten: a later fix on the other side does not confirm it.
        assertThat(f.apply(IMEI, 23.750700, 90.390711, 0)).isEqualTo(spot);
    }

    /**
     * 2G-1 on production, 2026-10-22 14:04 Dhaka: the GPS came back after 17 minutes without a
     * fix, and the fixes walked about 50 m north over the next minute while the speed stayed 0.
     * The old filter held the marker on the first of them until one left its 30 m circle; now it
     * follows the settling fixes.
     */
    @Test
    void firstFixesAfterTheGpsReturnsDoNotFreezeTheMarker() {
        double[][] settling = {
                {23.751316, 90.382996}, {23.751202, 90.382827}, {23.751284, 90.382809}, {23.751380, 90.382791},
                {23.751513, 90.382782}, {23.751564, 90.382693}, {23.751644, 90.382649}, {23.751742, 90.382640},
        };
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position shown = null;
        for (double[] p : settling) shown = f.apply(IMEI, p[0], p[1], 0);
        double[] last = settling[settling.length - 1];
        assertThat(ParkedJitterFilter.distanceM(shown.latitude(), shown.longitude(), last[0], last[1]))
                .isLessThan(ParkedJitterFilter.RADIUS_M);
        assertThat(ParkedJitterFilter.distanceM(shown.latitude(), shown.longitude(), settling[0][0], settling[0][1]))
                .isGreaterThan(ParkedJitterFilter.DEADBAND_M);
    }

    @Test
    void shownSpotFollowsTheClusterMedian() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        // A first fix 20 m south of where the tracker really lies, then good fixes.
        ParkedJitterFilter.Position first = f.apply(IMEI, 23.751070, 90.390750, 0);
        ParkedJitterFilter.Position shown = first;
        for (int i = 0; i < 6; i++) shown = f.apply(IMEI, 23.751250 + (i % 2) * 0.00002, 90.390750, 0);
        assertThat(shown).isNotEqualTo(first);
        assertThat(ParkedJitterFilter.distanceM(shown.latitude(), shown.longitude(), 23.751250, 90.390750))
                .isLessThan(5);
    }

    @Test
    void trackersAreIndependent() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0);
        ParkedJitterFilter.Position other = f.apply("357445100734769", 23.751340, 90.390702, 0);
        assertThat(other).isEqualTo(new ParkedJitterFilter.Position(23.751340, 90.390702));
    }
}
