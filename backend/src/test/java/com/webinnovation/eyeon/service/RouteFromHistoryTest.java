package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.RouteWatch.Direction;
import com.webinnovation.eyeon.service.RouteWatch.Pt;
import com.webinnovation.eyeon.service.StayDetector.Point;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RouteFromHistoryTest {

    private static final Instant T0 = Instant.parse("2026-11-25T00:00:00Z");
    private static final double HOME_LAT = 23.7460, HOME_LNG = 90.3700;
    private static final double SCHOOL_LAT = 23.7460, SCHOOL_LNG = 90.3810;   // ~1.1 km east

    /** At home for an hour, 11 minutes along the street to school, at school for an hour. */
    private static List<Point> morning() {
        List<Point> pts = new ArrayList<>();
        for (int m = 0; m <= 60; m += 5) pts.add(new Point(T0.plusSeconds(m * 60L), HOME_LAT, HOME_LNG));
        for (int i = 1; i <= 10; i++) {
            pts.add(new Point(T0.plusSeconds(3600 + i * 60L), HOME_LAT + (i % 2) * 0.00003, HOME_LNG + i * 0.001));
        }
        for (int m = 0; m <= 60; m += 5) pts.add(new Point(T0.plusSeconds(4260 + m * 60L), SCHOOL_LAT, SCHOOL_LNG));
        return pts;
    }

    @Test
    void theWayToSchoolIsFoundAndEndsAtThePlace() {
        var found = RouteFromHistory.candidates(morning(), Direction.TO, SCHOOL_LAT, SCHOOL_LNG, 100);
        assertThat(found).hasSize(1);
        var c = found.get(0);
        assertThat(c.lengthM()).isBetween(1050.0, 1200.0);
        Pt first = c.path().get(0), last = c.path().get(c.path().size() - 1);
        assertThat(StayDetector.meters(first.lat(), first.lng(), HOME_LAT, HOME_LNG)).isLessThan(30);
        assertThat(last).isEqualTo(new Pt(SCHOOL_LAT, SCHOOL_LNG));
        assertThat(c.waypoints().size()).isBetween(2, 25);
        // the 3 m zigzag of the fixes is gone from the line
        assertThat(c.path().size()).isLessThan(6);
    }

    @Test
    void theSameTripIsTheWayFromHomeButNotTheWayToHome() {
        assertThat(RouteFromHistory.candidates(morning(), Direction.FROM, HOME_LAT, HOME_LNG, 100)).hasSize(1);
        assertThat(RouteFromHistory.candidates(morning(), Direction.TO, HOME_LAT, HOME_LNG, 100)).isEmpty();
    }

    @Test
    void aDayAtHomeOffersNothing() {
        List<Point> pts = new ArrayList<>();
        for (int m = 0; m <= 600; m += 5) pts.add(new Point(T0.plusSeconds(m * 60L), HOME_LAT, HOME_LNG));
        assertThat(RouteFromHistory.candidates(pts, Direction.TO, SCHOOL_LAT, SCHOOL_LNG, 100)).isEmpty();
    }
}
