package com.webinnovation.eyeon.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.eyeon.service.RoutePlanner.Kind;
import com.webinnovation.eyeon.service.RoutePlanner.Piece;
import com.webinnovation.eyeon.service.RoutePlanner.Pt;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutePlannerTest {

    private static final Instant T0 = Instant.parse("2026-10-03T16:09:00Z");

    private static Pt gps(int s, double northM, int speed) {
        return new Pt(T0.plusSeconds(s), 23.73 + northM / 111_000, 90.41, speed, true);
    }

    private static Pt wifi(int s, double northM) {
        return new Pt(T0.plusSeconds(s), 23.73 + northM / 111_000, 90.41, 0, false);
    }

    @Test
    void gps_every_ten_seconds_is_one_solid_track_and_a_wifi_step_is_dashed() {
        List<Pt> pts = new ArrayList<>();
        for (int s = 0; s <= 60; s += 10) pts.add(gps(s, s * 13, 48));
        pts.add(wifi(75, 2000));

        List<Piece> pieces = RoutePlanner.plan(pts);

        assertEquals(2, pieces.size());
        assertEquals(Kind.TRACK, pieces.get(0).kind());
        assertEquals(7, pieces.get(0).points().size());
        assertEquals(48, pieces.get(0).medianSpeedKmh());
        assertEquals(Kind.ESTIMATE, pieces.get(1).kind());
        assertEquals(pieces.get(0).to(), pieces.get(1).from(), "pieces share their end points");
    }

    @Test
    void a_silence_of_more_than_two_minutes_is_dashed_and_jitter_is_dropped() {
        List<Pt> pts = List.of(gps(0, 0, 3), gps(10, 5, 3), gps(20, 30, 3), gps(400, 400, 3), gps(410, 420, 3));

        List<Piece> pieces = RoutePlanner.plan(pts);

        assertEquals(List.of(Kind.TRACK, Kind.ESTIMATE, Kind.TRACK), pieces.stream().map(Piece::kind).toList());
        assertEquals(2, pieces.get(0).points().size(), "the 5 m wobble is not a point");
    }

    @Test
    void a_long_track_is_cut_into_pieces_one_matching_call_can_take() {
        List<Pt> pts = new ArrayList<>();
        for (int s = 0; s <= 2000; s += 10) pts.add(gps(s, s * 2, 20));

        List<Piece> pieces = RoutePlanner.plan(pts);

        assertTrue(pieces.size() >= 3);
        assertTrue(pieces.stream().allMatch(p -> p.points().size() <= RoutePlanner.CHUNK + 1));
    }

    @Test
    void a_matched_line_that_takes_a_detour_is_rejected() throws Exception {
        List<Pt> raw = List.of(gps(0, 0, 40), gps(10, 100, 40), gps(20, 200, 40));
        var ok = new ObjectMapper().readTree("{\"code\":\"Ok\",\"matchings\":[{\"confidence\":0.9,\"geometry\":{\"coordinates\":[[90.41,23.73],[90.41,23.7318]]}}]}");
        var detour = new ObjectMapper().readTree("{\"code\":\"Ok\",\"matchings\":[{\"confidence\":0.9,\"geometry\":{\"coordinates\":[[90.41,23.73],[90.42,23.73],[90.42,23.7318],[90.41,23.7318]]}}]}");
        var unsure = new ObjectMapper().readTree("{\"code\":\"Ok\",\"matchings\":[{\"confidence\":0.05,\"geometry\":{\"coordinates\":[[90.41,23.73],[90.41,23.7318]]}}]}");

        assertTrue(RoadMatcher.parse(ok, raw).isPresent());
        assertTrue(RoadMatcher.parse(detour, raw).isEmpty());
        assertTrue(RoadMatcher.parse(unsure, raw).isEmpty());
        assertEquals("foot", RoadMatcher.profileFor(4));
        assertEquals("bike", RoadMatcher.profileFor(12));
        assertEquals("car", RoadMatcher.profileFor(45));
    }
}
