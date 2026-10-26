package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ParkedJitterFilterTest {

    private static final String IMEI = "357445100734645";

    /** One fix every 10 s, as the trackers report. */
    private Instant now = Instant.parse("2026-10-26T05:00:00Z");

    private Instant tick() {
        now = now.plusSeconds(10);
        return now;
    }

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
            for (double[] p : PARKED) shown.add(f.apply(IMEI, p[0], p[1], 0, tick(), null).position());
        }
        assertThat(shown).hasSize(1);
    }

    @Test
    void consecutiveFastFixesMove() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0, tick(), null);
        f.apply(IMEI, 23.751318, 90.390791, 8, tick(), null);
        ParkedJitterFilter.Result moved = f.apply(IMEI, 23.751400, 90.390850, 9, tick(), null);
        assertThat(moved.position()).isEqualTo(new ParkedJitterFilter.Position(23.751400, 90.390850));
        assertThat(moved.held()).isFalse();
    }

    /** 2G-1 on a table, 2026-10-26: a single fix at a few km/h when the satellites change is noise. */
    @Test
    void singleFastFixCloseByIsHeldAsNoise() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position spot = f.apply(IMEI, PARKED[0][0], PARKED[0][1], 0, tick(), null).position();
        ParkedJitterFilter.Result spike = f.apply(IMEI, PARKED[1][0], PARKED[1][1], 12, tick(), null);
        assertThat(spike.position()).isEqualTo(spot);
        assertThat(spike.held()).isTrue();
        ParkedJitterFilter.Result after = f.apply(IMEI, PARKED[2][0], PARKED[2][1], 0, tick(), null);
        assertThat(after.position()).isEqualTo(spot);
        assertThat(after.held()).isTrue();
    }

    @Test
    void fastFixFarAwayMovesAtOnce() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0, tick(), null);
        ParkedJitterFilter.Result moved = f.apply(IMEI, 23.752249, 90.390711, 25, tick(), null);   // ~111 m north
        assertThat(moved.position()).isEqualTo(new ParkedJitterFilter.Position(23.752249, 90.390711));
        assertThat(moved.held()).isFalse();
    }

    @Test
    void stillWobbleIsReportedAsHeld() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        assertThat(f.apply(IMEI, PARKED[0][0], PARKED[0][1], 3, tick(), null).held()).isFalse();
        for (int i = 1; i < PARKED.length; i++) {
            assertThat(f.apply(IMEI, PARKED[i][0], PARKED[i][1], 4, tick(), null).held()).isTrue();
        }
    }

    @Test
    void slowFixFartherThanTheRadiusMovesOnceTheNextFixAgrees() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position before = f.apply(IMEI, 23.751204, 90.389751, 0, tick(), null).position();
        // The 143 m step when the fix came back at 20:15:35, then the next fix 10 s later.
        assertThat(f.apply(IMEI, 23.751282, 90.390587, 0, tick(), null).position()).isEqualTo(before);
        assertThat(f.apply(IMEI, 23.751300, 90.390560, 0, tick(), null).position())
                .isEqualTo(new ParkedJitterFilter.Position(23.751300, 90.390560));
    }

    @Test
    void oneStrayFixIsIgnored() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position spot = f.apply(IMEI, PARKED[0][0], PARKED[0][1], 0, tick(), null).position();
        assertThat(f.apply(IMEI, 23.751800, 90.390711, 0, tick(), null).position()).isEqualTo(spot);   // ~61 m north
        assertThat(f.apply(IMEI, PARKED[1][0], PARKED[1][1], 0, tick(), null).position()).isEqualTo(spot);
        // The stray is forgotten: a later fix on the other side does not confirm it.
        assertThat(f.apply(IMEI, 23.750700, 90.390711, 0, tick(), null).position()).isEqualTo(spot);
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
        for (double[] p : settling) shown = f.apply(IMEI, p[0], p[1], 0, tick(), null).position();
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
        ParkedJitterFilter.Position first = f.apply(IMEI, 23.751070, 90.390750, 0, tick(), null).position();
        ParkedJitterFilter.Position shown = first;
        for (int i = 0; i < 6; i++) shown = f.apply(IMEI, 23.751250 + (i % 2) * 0.00002, 90.390750, 0, tick(), null).position();
        assertThat(shown).isNotEqualTo(first);
        assertThat(ParkedJitterFilter.distanceM(shown.latitude(), shown.longitude(), 23.751250, 90.390750))
                .isLessThan(5);
    }

    /** The PL601 on production, 2026-10-26 12:22 Dhaka: one stale fix repeated at "9 km/h" next to its Wi-Fi spot. */
    @Test
    void repeatedFastFixIsNotMovement() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position spot = f.apply(IMEI, 23.769647, 90.358580, 0, tick(), 14).position();
        for (int i = 0; i < 6; i++) {
            ParkedJitterFilter.Result r = f.apply(IMEI, 23.769590, 90.358190, 9, tick(), null);
            assertThat(r.position()).isEqualTo(spot);
            assertThat(r.held()).isTrue();
        }
    }

    /**
     * The PL601 indoors on production, 2026-10-26 12:10-12:13 Dhaka: weak GPS (6-11 satellites)
     * drifting up to 72 m at 0-6 km/h between Wi-Fi positions that stayed within 3 m.
     */
    @Test
    void wifiAnchorHoldsIndoorGpsDrift() {
        double[][] drift = {
                {23.769530, 90.358130, 2}, {23.769750, 90.358290, 2}, {23.769710, 90.358490, 2},
                {23.769690, 90.358510, 4}, {23.769620, 90.358230, 4}, {23.769580, 90.358070, 6},
                {23.769520, 90.357900, 2}, {23.769600, 90.357890, 0}, {23.769690, 90.357970, 4},
                {23.769700, 90.358090, 2}, {23.769660, 90.358170, 2},
        };
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position wifi = new ParkedJitterFilter.Position(23.769659, 90.358588);
        assertThat(f.apply(IMEI, wifi.latitude(), wifi.longitude(), 0, tick(), 16).position()).isEqualTo(wifi);
        for (double[] p : drift) {
            ParkedJitterFilter.Result r = f.apply(IMEI, p[0], p[1], (int) p[2], tick(), null);
            assertThat(r.position()).isEqualTo(wifi);
            assertThat(r.held()).isTrue();
        }
    }

    @Test
    void wifiPositionCorrectsAGpsSpotFarOff() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.769790, 90.358010, 0, tick(), null);
        ParkedJitterFilter.Result r = f.apply(IMEI, 23.769659, 90.358588, 0, tick(), 16);
        assertThat(r.position()).isEqualTo(new ParkedJitterFilter.Position(23.769659, 90.358588));
    }

    @Test
    void walkingAwayFromTheWifiSpotIsFollowed() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.769659, 90.358588, 0, tick(), 16);
        ParkedJitterFilter.Position shown = null;
        // 15 m per fix north at speed 0 (these trackers report 0 at walking pace).
        for (int i = 1; i <= 16; i++) shown = f.apply(IMEI, 23.769659 + i * 0.000135, 90.358588, 0, tick(), null).position();
        assertThat(ParkedJitterFilter.distanceM(shown.latitude(), shown.longitude(), 23.769659 + 16 * 0.000135, 90.358588))
                .isLessThan(ParkedJitterFilter.AGREE_M);
    }

    /** The PL601 on production, 2026-10-26 11:51-11:53 Dhaka: 280 m away for 100 s at speed 0. */
    @Test
    void sudden300mJumpAtSpeedZeroIsHeldUntilItPersists() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position spot = f.apply(IMEI, 23.769800, 90.358530, 0, tick(), null).position();
        for (int i = 0; i < 10; i++) {
            assertThat(f.apply(IMEI, 23.772340, 90.358530 + (i % 2) * 0.00002, 0, tick(), null).position()).isEqualTo(spot);
        }
        // Still there after the hold time: it is believed.
        for (int i = 0; i < 9; i++) f.apply(IMEI, 23.772340, 90.358530, 0, tick(), null);
        assertThat(f.apply(IMEI, 23.772340, 90.358530, 0, tick(), null).position())
                .isEqualTo(new ParkedJitterFilter.Position(23.772340, 90.358530));
    }

    @Test
    void reappearingFarAwayAfterSilenceMovesAtOnce() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.769800, 90.358530, 0, tick(), null);
        now = now.plusSeconds(1800);
        f.apply(IMEI, 23.780000, 90.358530, 0, tick(), null);
        assertThat(f.apply(IMEI, 23.780050, 90.358530, 0, tick(), null).position())
                .isEqualTo(new ParkedJitterFilter.Position(23.780050, 90.358530));
    }

    /** The PL601 on production, 2026-10-26 13:05 Dhaka: indoor drift 90 m out and back at 6, 6, 13 km/h. */
    @Test
    void fastDriftNearTheWifiSpotIsHeld() {
        double[][] drift = {
                {23.769720, 90.358170, 0}, {23.769740, 90.358200, 2}, {23.769810, 90.358190, 6},
                {23.769870, 90.358040, 6}, {23.769960, 90.357690, 13}, {23.769930, 90.357680, 4},
                {23.769860, 90.358040, 0}, {23.769840, 90.358250, 0},
        };
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position wifi = f.apply(IMEI, 23.769647, 90.358580, 0, tick(), 14).position();
        for (double[] p : drift) {
            ParkedJitterFilter.Result r = f.apply(IMEI, p[0], p[1], (int) p[2], tick(), null);
            assertThat(r.position()).isEqualTo(wifi);
            assertThat(r.held()).isTrue();
        }
    }

    @Test
    void drivingAwayFromTheWifiSpotIsFollowedOncePastTheAnchor() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.769647, 90.358580, 0, tick(), 14);
        // 55 m per fix north at 20 km/h.
        ParkedJitterFilter.Position shown = null;
        for (int i = 1; i <= 4; i++) shown = f.apply(IMEI, 23.769647 + i * 0.000495, 90.358580, 20, tick(), null).position();
        assertThat(shown).isEqualTo(new ParkedJitterFilter.Position(23.769647 + 4 * 0.000495, 90.358580));
    }

    /** The PL601 on 2026-10-22 17:32 Dhaka: a 117 km/h spike 270 m out, then fixes back near the Wi-Fi spot. */
    @Test
    void spikeAwayFromTheWifiSpotIsUndone() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        ParkedJitterFilter.Position wifi = f.apply(IMEI, 23.769647, 90.358580, 0, tick(), 14).position();
        f.apply(IMEI, 23.772080, 90.358580, 117, tick(), null);
        assertThat(f.apply(IMEI, 23.769900, 90.358580, 7, tick(), null).position()).isEqualTo(wifi);
    }

    @Test
    void trackersAreIndependent() {
        ParkedJitterFilter f = new ParkedJitterFilter();
        f.apply(IMEI, 23.751249, 90.390711, 0, tick(), null).position();
        ParkedJitterFilter.Position other = f.apply("357445100734769", 23.751340, 90.390702, 0, tick(), null).position();
        assertThat(other).isEqualTo(new ParkedJitterFilter.Position(23.751340, 90.390702));
    }
}
