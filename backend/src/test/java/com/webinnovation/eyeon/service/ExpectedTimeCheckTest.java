package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.ExpectedTimeCheck.Kind;
import com.webinnovation.eyeon.service.ExpectedTimeCheck.Phase;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** "At School by 08:15": which day it applies to, and when it becomes an alert. */
class ExpectedTimeCheckTest {

    private static final ZoneId DHAKA = ZoneId.of("Asia/Dhaka");
    /** Sunday to Thursday, the school week in Bangladesh (ISO: 7, 1, 2, 3, 4). */
    private static final Set<Integer> SCHOOL_DAYS = Set.of(7, 1, 2, 3, 4);
    private static final LocalTime AT = LocalTime.of(8, 15);

    // 2026-10-04 is a Sunday; 08:15 in Dhaka is 02:15 UTC.
    private static final Instant SUNDAY_DEADLINE = Instant.parse("2026-10-04T02:15:00Z");

    @Test
    void deadline_is_the_local_time_on_a_listed_weekday() {
        Instant now = Instant.parse("2026-10-04T01:00:00Z");
        assertEquals(SUNDAY_DEADLINE, ExpectedTimeCheck.deadlineToday(AT, SCHOOL_DAYS, DHAKA, now));
    }

    @Test
    void friday_is_not_a_school_day() {
        // 2026-10-02 is a Friday.
        assertNull(ExpectedTimeCheck.deadlineToday(AT, SCHOOL_DAYS, DHAKA, Instant.parse("2026-10-02T03:00:00Z")));
    }

    @Test
    void the_local_date_decides_the_weekday_not_the_utc_date() {
        // 19:00 UTC on Saturday is already 01:00 on Sunday in Dhaka.
        Instant now = Instant.parse("2026-10-03T19:00:00Z");
        assertEquals(SUNDAY_DEADLINE, ExpectedTimeCheck.deadlineToday(AT, SCHOOL_DAYS, DHAKA, now));
    }

    @Test
    void probe_first_then_decide_then_give_up() {
        assertEquals(Phase.NOT_DUE, ExpectedTimeCheck.phase(SUNDAY_DEADLINE, SUNDAY_DEADLINE.minusSeconds(1)));
        assertEquals(Phase.PROBE, ExpectedTimeCheck.phase(SUNDAY_DEADLINE, SUNDAY_DEADLINE));
        assertEquals(Phase.PROBE, ExpectedTimeCheck.phase(SUNDAY_DEADLINE, SUNDAY_DEADLINE.plus(ExpectedTimeCheck.GRACE).minusSeconds(1)));
        assertEquals(Phase.DECIDE, ExpectedTimeCheck.phase(SUNDAY_DEADLINE, SUNDAY_DEADLINE.plus(ExpectedTimeCheck.GRACE)));
        assertEquals(Phase.EXPIRED, ExpectedTimeCheck.phase(SUNDAY_DEADLINE, SUNDAY_DEADLINE.plus(ExpectedTimeCheck.WINDOW)));
        assertEquals(Phase.NOT_DUE, ExpectedTimeCheck.phase(null, SUNDAY_DEADLINE));
    }

    @Test
    void arrive_by_is_breached_when_not_inside_and_leave_by_when_still_inside() {
        assertTrue(ExpectedTimeCheck.breached(Kind.ARRIVE_BY, false));
        assertTrue(ExpectedTimeCheck.breached(Kind.ARRIVE_BY, null), "never seen at the place counts as not arrived");
        assertFalse(ExpectedTimeCheck.breached(Kind.ARRIVE_BY, true));
        assertTrue(ExpectedTimeCheck.breached(Kind.LEAVE_BY, true));
        assertFalse(ExpectedTimeCheck.breached(Kind.LEAVE_BY, false));
        assertFalse(ExpectedTimeCheck.breached(Kind.LEAVE_BY, null));
    }

    @Test
    void daily_slot_is_half_open_in_local_time() {
        LocalTime nine = LocalTime.of(21, 0);
        Duration slot = Duration.ofMinutes(30);
        assertFalse(ExpectedTimeCheck.inDailySlot(nine, slot, DHAKA, Instant.parse("2026-10-04T14:59:59Z")));
        assertTrue(ExpectedTimeCheck.inDailySlot(nine, slot, DHAKA, Instant.parse("2026-10-04T15:00:00Z")));
        assertTrue(ExpectedTimeCheck.inDailySlot(nine, slot, DHAKA, Instant.parse("2026-10-04T15:29:59Z")));
        assertFalse(ExpectedTimeCheck.inDailySlot(nine, slot, DHAKA, Instant.parse("2026-10-04T15:30:00Z")));
    }
}
