package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.StayDetector.Point;
import com.webinnovation.eyeon.service.StayDetector.Stay;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Location points in, "stayed here from-to" out. Coordinates are around Karwan Bazar, Dhaka. */
class StayDetectorTest {

    private static final Instant T0 = Instant.parse("2026-10-04T08:40:00Z");
    private static final double LAT = 23.7515, LNG = 90.3930;
    /** One degree of latitude is about 111 km, so this is roughly 1.1 m per unit. */
    private static final double M = 0.00001;

    private static Point at(int seconds, double northMeters) {
        return new Point(T0.plusSeconds(seconds), LAT + northMeters * M / 1.11, LNG);
    }

    @Test
    void five_minutes_in_one_spot_is_a_stay() {
        List<Point> pts = List.of(at(0, 0), at(60, 8), at(120, -5), at(180, 12), at(240, 3), at(300, 0));

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(1, stays.size());
        assertEquals(T0, stays.get(0).from());
        assertEquals(T0.plusSeconds(300), stays.get(0).to());
        assertEquals(300, stays.get(0).seconds());
        assertEquals(LAT, stays.get(0).lat(), 0.0002);
    }

    @Test
    void a_short_pause_is_not_a_stay() {
        assertTrue(StayDetector.detect(List.of(at(0, 0), at(120, 5), at(240, 2))).isEmpty());
    }

    @Test
    void walking_steadily_is_not_a_stay_however_long_it_takes() {
        // 0.8 m/s, a point every 10 s for 10 minutes: never 5 minutes within one 150 m circle.
        List<Point> pts = new ArrayList<>();
        for (int s = 0; s <= 600; s += 10) pts.add(at(s, s * 0.8));
        assertTrue(StayDetector.detect(pts).isEmpty());
    }

    @Test
    void two_places_with_a_walk_between_are_two_stays() {
        List<Point> pts = new ArrayList<>();
        for (int s = 0; s <= 600; s += 60) pts.add(at(s, 0));                         // 10 min at A
        for (int s = 610; s < 1200; s += 10) pts.add(at(s, (s - 600) * 1.4));         // walk 840 m north
        for (int s = 1200; s <= 2100; s += 60) pts.add(at(s, 840));                   // 15 min at B

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(2, stays.size());
        assertEquals(T0, stays.get(0).from());
        // Leaving A is noticed once the walk is out of the circle; the stay ends at the last point inside it.
        assertTrue(stays.get(0).seconds() >= 600 && stays.get(0).seconds() <= 720, "A: " + stays.get(0).seconds());
        assertEquals(T0.plusSeconds(2100), stays.get(1).to());
        assertTrue(stays.get(1).seconds() >= 900 && stays.get(1).seconds() <= 1020, "B: " + stays.get(1).seconds());
    }

    @Test
    void a_night_of_silence_at_the_same_spot_is_one_stay() {
        // Seen in production: a tracker lying still reports nothing for 9 hours.
        List<Point> pts = List.of(at(0, 0), at(300, 4), at(300 + 33_077, 20), at(300 + 33_377, 6));

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(1, stays.size());
        assertEquals(33_677, stays.get(0).seconds());
    }

    @Test
    void silence_longer_than_a_day_is_not_claimed_as_time_spent_there() {
        int twoDays = 2 * 86_400;
        List<Point> pts = List.of(at(0, 0), at(600, 2), at(600 + twoDays, 1), at(1200 + twoDays, 3));

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(2, stays.size());
        assertEquals(600, stays.get(0).seconds());
        assertEquals(600, stays.get(1).seconds());
    }

    @Test
    void one_stray_point_does_not_split_a_stay() {
        // Indoor GPS jumping 400 m away for one report and back.
        List<Point> pts = List.of(at(0, 0), at(60, 5), at(120, 400), at(180, 3), at(240, 0), at(360, 6));

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(1, stays.size());
        assertEquals(360, stays.get(0).seconds());
        // The stray point is not averaged into the reported position.
        assertEquals(LAT, stays.get(0).lat(), 0.0002);
    }

    @Test
    void two_circles_a_few_minutes_and_140_metres_apart_are_one_place() {
        // Seen in production: a night at one address, then an hour 140 m away 3 minutes later.
        List<Point> pts = new ArrayList<>();
        for (int s = 0; s <= 240; s += 60) pts.add(at(s, 0));          // the circle is centred here
        for (int s = 300; s <= 480; s += 60) pts.add(at(s, 100));      // same circle, pulls its mean north
        for (int s = 660; s <= 1500; s += 60) pts.add(at(s, 180));     // outside that circle: a second one

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(1, stays.size());
        assertEquals(1500, stays.get(0).seconds());
    }

    @Test
    void a_second_circle_three_minutes_later_and_250_metres_away_is_still_the_same_place() {
        // Seen in production: the night's single Wi-Fi position, then GPS fixes at the gate from 13:39.
        List<Point> pts = new ArrayList<>();
        pts.add(at(0, 0));
        pts.add(at(3600, 0));
        for (int s = 3780; s <= 5400; s += 60) pts.add(at(s, 250));

        List<Stay> stays = StayDetector.detect(pts);

        assertEquals(1, stays.size());
        assertEquals(5400, stays.get(0).seconds());
    }

    @Test
    void a_stop_250_metres_away_ten_minutes_later_is_a_different_place() {
        List<Point> pts = new ArrayList<>();
        for (int s = 0; s <= 600; s += 60) pts.add(at(s, 0));
        for (int s = 1200; s <= 1800; s += 60) pts.add(at(s, 250));

        assertEquals(2, StayDetector.detect(pts).size());
    }

    @Test
    void distance_is_in_metres() {
        assertEquals(111.2, StayDetector.meters(23.75, 90.39, 23.751, 90.39), 0.5);
    }
}
