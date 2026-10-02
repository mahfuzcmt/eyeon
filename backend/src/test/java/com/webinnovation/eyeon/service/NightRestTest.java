package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NightRestTest {

    private static final ZoneId DHAKA = ZoneId.of("Asia/Dhaka");
    private static final LocalTime MIDNIGHT = LocalTime.MIDNIGHT, SEVEN = LocalTime.of(7, 0);

    @Test
    void the_factory_window_is_midnight_to_seven_local_time() {
        assertFalse(NightRest.inWindow(MIDNIGHT, SEVEN, DHAKA, Instant.parse("2026-10-02T17:59:59Z")));   // 23:59:59
        assertTrue(NightRest.inWindow(MIDNIGHT, SEVEN, DHAKA, Instant.parse("2026-10-02T18:00:00Z")));    // 00:00
        assertTrue(NightRest.inWindow(MIDNIGHT, SEVEN, DHAKA, Instant.parse("2026-10-03T00:59:59Z")));    // 06:59:59
        assertFalse(NightRest.inWindow(MIDNIGHT, SEVEN, DHAKA, Instant.parse("2026-10-03T01:00:00Z")));   // 07:00
    }

    @Test
    void a_window_may_cross_midnight() {
        LocalTime eleven = LocalTime.of(23, 0), six = LocalTime.of(6, 0);
        assertTrue(NightRest.inWindow(eleven, six, DHAKA, Instant.parse("2026-10-02T17:30:00Z")));        // 23:30
        assertTrue(NightRest.inWindow(eleven, six, DHAKA, Instant.parse("2026-10-02T23:00:00Z")));        // 05:00
        assertFalse(NightRest.inWindow(eleven, six, DHAKA, Instant.parse("2026-10-03T06:00:00Z")));       // 12:00
        assertFalse(NightRest.inWindow(six, six, DHAKA, Instant.parse("2026-10-03T00:00:00Z")), "no window at all");
    }

    @Test
    void the_last_end_is_today_once_it_has_passed_and_yesterday_before() {
        assertEquals(Instant.parse("2026-10-03T01:00:00Z"), NightRest.lastEnd(SEVEN, DHAKA, Instant.parse("2026-10-03T04:00:00Z")));
        assertEquals(Instant.parse("2026-10-02T01:00:00Z"), NightRest.lastEnd(SEVEN, DHAKA, Instant.parse("2026-10-02T20:00:00Z")));
    }
}
