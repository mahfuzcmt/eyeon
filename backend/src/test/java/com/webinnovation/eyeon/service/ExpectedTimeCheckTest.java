package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.ExpectedTimeCheck.Kind;
import com.webinnovation.eyeon.service.ExpectedTimeCheck.Action;
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

    // 08:00 with 10 minutes grace, Sunday: 02:00 UTC, decided at 02:10 UTC.
    private static final Instant EIGHT = Instant.parse("2026-10-04T02:00:00Z");
    private static final Instant MORNING_ARRIVAL = Instant.parse("2026-10-04T01:52:00Z");
    private static final Instant YESTERDAY = Instant.parse("2026-10-03T08:00:00Z");

    private static Action arrive(Boolean inside, Instant changedAt, String status, Instant now) {
        return ExpectedTimeCheck.decide(Kind.ARRIVE_BY, inside, changedAt, EIGHT, 10, status, DHAKA, now);
    }

    private static Action leave(Boolean inside, Instant changedAt, String status, Instant now) {
        return ExpectedTimeCheck.decide(Kind.LEAVE_BY, inside, changedAt, EIGHT, 10, status, DHAKA, now);
    }

    @Test
    void nothing_before_the_expected_time() {
        assertEquals(Action.NONE, arrive(true, MORNING_ARRIVAL, null, EIGHT.minusSeconds(1)));
        assertEquals(Action.NONE, arrive(false, null, null, EIGHT.minusSeconds(1)));
    }

    @Test
    void already_there_at_the_time_is_on_time_at_once() {
        assertEquals(Action.ON_TIME, arrive(true, MORNING_ARRIVAL, null, EIGHT));
        assertEquals(Action.NONE, arrive(true, MORNING_ARRIVAL, ExpectedTimeCheck.OK_SENT, EIGHT.plusSeconds(60)));
    }

    @Test
    void not_there_at_the_time_probes_once_then_waits_for_the_grace() {
        assertEquals(Action.PROBE, arrive(false, null, null, EIGHT));
        assertEquals(Action.NONE, arrive(false, null, ExpectedTimeCheck.PROBED, EIGHT.plusSeconds(300)));
        assertEquals(Action.NONE, arrive(false, null, ExpectedTimeCheck.PROBED, EIGHT.plusSeconds(599)));
    }

    @Test
    void arriving_inside_the_grace_is_on_time() {
        assertEquals(Action.ON_TIME, arrive(true, EIGHT.plusSeconds(360), ExpectedTimeCheck.PROBED, EIGHT.plusSeconds(420)));
    }

    @Test
    void still_missing_when_the_grace_ends_is_missed_once() {
        assertEquals(Action.MISSED, arrive(false, null, ExpectedTimeCheck.PROBED, EIGHT.plusSeconds(600)));
        assertEquals(Action.NONE, arrive(false, null, ExpectedTimeCheck.ALERTED, EIGHT.plusSeconds(900)));
    }

    @Test
    void arriving_after_the_alert_is_reported_as_late_within_three_hours() {
        assertEquals(Action.LATE, arrive(true, EIGHT.plusSeconds(1500), ExpectedTimeCheck.ALERTED, EIGHT.plusSeconds(1560)));
        assertEquals(Action.SKIP, arrive(true, EIGHT.plusSeconds(4 * 3600), ExpectedTimeCheck.ALERTED,
                EIGHT.plusSeconds(4 * 3600)));
        assertEquals(Action.NONE, arrive(true, EIGHT.plusSeconds(1500), ExpectedTimeCheck.LATE_SENT, EIGHT.plusSeconds(1620)));
    }

    @Test
    void a_short_grace_still_leaves_time_for_the_probe() {
        Instant decide = ExpectedTimeCheck.decisionAt(EIGHT, 0);
        assertEquals(EIGHT.plus(ExpectedTimeCheck.MIN_PROBE), decide);
        assertEquals(EIGHT.plusSeconds(600), ExpectedTimeCheck.decisionAt(EIGHT, 10));
    }

    @Test
    void a_check_first_seen_long_after_its_time_is_skipped() {
        Instant late = EIGHT.plusSeconds(600).plus(ExpectedTimeCheck.WINDOW);
        assertEquals(Action.SKIP, arrive(false, null, null, late));
        assertEquals(Action.SKIP, arrive(true, MORNING_ARRIVAL, null, late));
    }

    @Test
    void leaving_on_time_and_late() {
        // Left at 07:58 after being there in the morning.
        assertEquals(Action.ON_TIME, leave(false, Instant.parse("2026-10-04T01:58:00Z"), null, EIGHT));
        // Still inside at the time: probe, then missed, then late when they do leave.
        assertEquals(Action.PROBE, leave(true, MORNING_ARRIVAL, null, EIGHT));
        assertEquals(Action.MISSED, leave(true, MORNING_ARRIVAL, ExpectedTimeCheck.PROBED, EIGHT.plusSeconds(600)));
        assertEquals(Action.LATE, leave(false, EIGHT.plusSeconds(1200), ExpectedTimeCheck.ALERTED, EIGHT.plusSeconds(1260)));
    }

    @Test
    void never_at_the_place_today_says_nothing_about_leaving_it() {
        assertEquals(Action.SKIP, leave(false, YESTERDAY, null, EIGHT));
        assertEquals(Action.SKIP, leave(null, null, null, EIGHT));
    }

    @Test
    void the_old_ok_status_counts_as_done() {
        assertEquals(Action.NONE, arrive(true, MORNING_ARRIVAL, ExpectedTimeCheck.LEGACY_OK, EIGHT.plusSeconds(60)));
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
