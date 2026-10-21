package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.RouteWatch.Direction;
import com.webinnovation.eyeon.service.RouteWatch.Event;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import com.webinnovation.eyeon.service.RouteWatch.Trip;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class RouteWatchTest {

    private static final Instant SEVEN = Instant.parse("2026-10-22T01:00:00Z");   // 07:00 Dhaka

    @Nested
    class When {
        @Test
        void toPlaceIsWatchedFromAnHourBeforeUntilAnHourAfterTheGrace() {
            assertThat(RouteWatch.watchUntil(Direction.TO, SEVEN, 5, false, null, SEVEN.minus(Duration.ofMinutes(61)))).isNull();
            Instant until = RouteWatch.watchUntil(Direction.TO, SEVEN, 5, false, null, SEVEN.minus(Duration.ofMinutes(30)));
            assertThat(until).isEqualTo(SEVEN.plus(Duration.ofMinutes(65)));
            assertThat(RouteWatch.watchUntil(Direction.TO, SEVEN, 5, null, null, SEVEN.plus(Duration.ofMinutes(64)))).isNotNull();
            assertThat(RouteWatch.watchUntil(Direction.TO, SEVEN, 5, false, null, SEVEN.plus(Duration.ofMinutes(65)))).isNull();
        }

        @Test
        void toPlaceStopsOnceThere() {
            assertThat(RouteWatch.watchUntil(Direction.TO, SEVEN, 5, true, SEVEN.minus(Duration.ofMinutes(3)), SEVEN)).isNull();
        }

        @Test
        void fromPlaceIsWatchedForNinetyMinutesAfterLeavingAroundTheTime() {
            Instant noon = SEVEN.plus(Duration.ofHours(5));
            Instant left = noon.plus(Duration.ofMinutes(3));
            assertThat(RouteWatch.watchUntil(Direction.FROM, noon, 5, false, left, left.plus(Duration.ofMinutes(10))))
                    .isEqualTo(left.plus(Duration.ofMinutes(90)));
            assertThat(RouteWatch.watchUntil(Direction.FROM, noon, 5, false, left, left.plus(Duration.ofMinutes(91)))).isNull();
            assertThat(RouteWatch.watchUntil(Direction.FROM, noon, 5, true, left, left.plus(Duration.ofMinutes(10)))).isNull();
        }

        @Test
        void fromPlaceIgnoresALeavingFarFromTheTime() {
            Instant noon = SEVEN.plus(Duration.ofHours(5));
            Instant morningExit = noon.minus(Duration.ofHours(4));
            assertThat(RouteWatch.watchUntil(Direction.FROM, noon, 5, false, morningExit, morningExit.plus(Duration.ofMinutes(5)))).isNull();
        }
    }

    @Nested
    class Fixes {
        private Instant t(int seconds) {
            return SEVEN.plusSeconds(seconds);
        }

        @Test
        void nothingUntilThePersonHasBeenOnTheLine() {
            Trip trip = new Trip();
            assertThat(RouteWatch.onFix(trip, 800, 3000, 100, t(0))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 800, 3000, 100, t(600))).isEqualTo(Event.NONE);
        }

        @Test
        void twoMinutesOffTheLineAlertsOnceThenBackOnRoute() {
            Trip trip = new Trip();
            assertThat(RouteWatch.onFix(trip, 20, 3000, 100, t(0))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 180, 2800, 100, t(10))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 200, 2700, 100, t(70))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 250, 2600, 100, t(130))).isEqualTo(Event.OFF_ROUTE);
            assertThat(RouteWatch.onFix(trip, 300, 2500, 100, t(200))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 40, 2000, 100, t(400))).isEqualTo(Event.BACK_ON_ROUTE);
            assertThat(RouteWatch.onFix(trip, 30, 1900, 100, t(410))).isEqualTo(Event.NONE);
        }

        @Test
        void aShortDetourIsNotAlerted() {
            Trip trip = new Trip();
            RouteWatch.onFix(trip, 10, 3000, 100, t(0));
            assertThat(RouteWatch.onFix(trip, 300, 2900, 100, t(10))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 300, 2800, 100, t(60))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 50, 2700, 100, t(100))).isEqualTo(Event.NONE);
            assertThat(RouteWatch.onFix(trip, 300, 2600, 100, t(170))).isEqualTo(Event.NONE);
        }

        @Test
        void reachingTheEndFinishesTheTrip() {
            Trip trip = new Trip();
            RouteWatch.onFix(trip, 10, 3000, 100, t(0));
            RouteWatch.onFix(trip, 10, 120, 100, t(60));
            assertThat(trip.done()).isTrue();
            assertThat(RouteWatch.onFix(trip, 900, 900, 100, t(600))).isEqualTo(Event.NONE);
        }

        @Test
        void atMostThreeAlertsPerTrip() {
            Trip trip = new Trip();
            int alerts = 0;
            int s = 0;
            for (int round = 0; round < 5; round++) {
                RouteWatch.onFix(trip, 10, 5000, 100, t(s));
                for (int i = 1; i <= 15; i++) {
                    if (RouteWatch.onFix(trip, 400, 5000, 100, t(s + i * 10)) == Event.OFF_ROUTE) alerts++;
                }
                s += 1000;
            }
            assertThat(alerts).isEqualTo(3);
        }
    }

    @Test
    void distanceToPathMeasuresToTheNearestSegment() {
        // A line along a street in Dhanmondi, ~110 m each way.
        List<Pt> path = List.of(new Pt(23.7460, 90.3760), new Pt(23.7460, 90.3771), new Pt(23.7470, 90.3771));
        assertThat(RouteWatch.distanceToPath(23.7460, 90.3765, path)).isLessThan(1);
        // 0.0009 deg of latitude south of the first segment: about 100 m.
        assertThat(RouteWatch.distanceToPath(23.7451, 90.3765, path)).isCloseTo(100, within(3.0));
        // Beyond the end: distance to the last point.
        assertThat(RouteWatch.distanceToPath(23.7480, 90.3771, path)).isCloseTo(111, within(3.0));
    }
}
