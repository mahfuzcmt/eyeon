package com.webinnovation.eyeon.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;

/**
 * When does "at School by 08:15" turn into an alert? Pure, so it can be tested without a clock.
 *
 * <p>A personal tracker reports in bursts and, indoors, with a delay (crossings are confirmed
 * a minute late), so the deadline itself is too early to judge. At the deadline the tracker is
 * asked for a fresh position ({@link Phase#PROBE}); the decision is taken a few minutes later
 * ({@link Phase#DECIDE}). After {@link #WINDOW} the day's check is dropped rather than raised
 * late (for instance after the server was down).
 */
public final class ExpectedTimeCheck {

    private ExpectedTimeCheck() {}

    public enum Kind { ARRIVE_BY, LEAVE_BY }

    public enum Phase { NOT_DUE, PROBE, DECIDE, EXPIRED }

    /** Time given to the tracker to answer the probe before the alert is decided. */
    public static final Duration GRACE = Duration.ofMinutes(4);
    /** A check older than this is not raised any more. */
    public static final Duration WINDOW = Duration.ofMinutes(40);

    /** The instant the schedule refers to today, or null when it does not apply on this weekday. */
    public static Instant deadlineToday(LocalTime at, Set<Integer> isoWeekdays, ZoneId zone, Instant now) {
        ZonedDateTime local = now.atZone(zone);
        if (!isoWeekdays.contains(local.getDayOfWeek().getValue())) return null;
        return local.toLocalDate().atTime(at).atZone(zone).toInstant();
    }

    public static Phase phase(Instant deadline, Instant now) {
        if (deadline == null || now.isBefore(deadline)) return Phase.NOT_DUE;
        if (now.isBefore(deadline.plus(GRACE))) return Phase.PROBE;
        if (now.isBefore(deadline.plus(WINDOW))) return Phase.DECIDE;
        return Phase.EXPIRED;
    }

    /**
     * @param inside the committed state of the person for this place; null = never seen there
     * @return true when the expectation is not met
     */
    public static boolean breached(Kind kind, Boolean inside) {
        boolean in = Boolean.TRUE.equals(inside);
        return kind == Kind.ARRIVE_BY ? !in : in;
    }

    public static LocalDate localDay(ZoneId zone, Instant now) {
        return now.atZone(zone).toLocalDate();
    }

    /** True from {@code start} for {@code length}: the slot in which a daily reminder goes out. */
    public static boolean inDailySlot(LocalTime start, Duration length, ZoneId zone, Instant now) {
        LocalTime t = now.atZone(zone).toLocalTime();
        return !t.isBefore(start) && t.isBefore(start.plus(length));
    }
}
