package com.webinnovation.eyeon.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;

/**
 * What to tell a carer about "at School by 08:00, 10 minutes grace". Pure, so it can be
 * tested without a clock or a database.
 *
 * <p>Timeline for one schedule, one person, one day (T = the expected time, G = grace):
 * <ul>
 *   <li>before T: nothing;</li>
 *   <li>from T: already where expected → an <b>on-time</b> message at once. Not yet → the tracker
 *       is asked for fresh positions ({@link Action#PROBE}, a still tracker may not have reported
 *       for a while) and the person is watched minute by minute: getting there before T + G is
 *       still on time;</li>
 *   <li>at T + G (at least {@link #MIN_PROBE} after T, so a probe can be answered): still not →
 *       a <b>not arrived / not left</b> alert;</li>
 *   <li>after the alert, for {@link #LATE_WINDOW}: getting there after all → a <b>late</b>
 *       message, so the carer is not left worrying.</li>
 * </ul>
 * A leaving time is only judged for someone who was at the place that day: if the person never
 * arrived, there is nothing to say about leaving (the arrival check has already spoken).
 * Each step happens once a day; a check first looked at more than {@link #WINDOW} late (server
 * down) is skipped rather than sent stale.
 */
public final class ExpectedTimeCheck {

    private ExpectedTimeCheck() {}

    public enum Kind { ARRIVE_BY, LEAVE_BY }

    public enum Action {
        /** Nothing to do this minute. */
        NONE,
        /** First minute past T and not there: ask the tracker for fresh positions. */
        PROBE,
        /** Where expected by T + grace: send the on-time message. */
        ON_TIME,
        /** Not where expected at T + grace: send the alert. */
        MISSED,
        /** Got there after the alert: send the late message. */
        LATE,
        /** Nothing will be said today (too late to be useful, or never at the place to leave it). */
        SKIP
    }

    /** daily_checks.status values used by expected times. */
    public static final String PROBED = "PROBED";
    public static final String OK_SENT = "OK_SENT";
    public static final String ALERTED = "ALERTED";
    public static final String LATE_SENT = "LATE";
    public static final String SKIPPED = "SKIPPED";
    /** Written by the version without grace; treated as done. */
    public static final String LEGACY_OK = "OK";

    /** The decision is never taken earlier than this after T, so the probe has time to be answered. */
    public static final Duration MIN_PROBE = Duration.ofMinutes(4);
    /** A first look later than this after the decision time is not acted on. */
    public static final Duration WINDOW = Duration.ofMinutes(40);
    /** How long after an alert a late arrival / departure is still reported. */
    public static final Duration LATE_WINDOW = Duration.ofHours(3);
    public static final int MAX_GRACE_MINUTES = 120;

    /** The instant the schedule refers to today, or null when it does not apply on this weekday. */
    public static Instant deadlineToday(LocalTime at, Set<Integer> isoWeekdays, ZoneId zone, Instant now) {
        ZonedDateTime local = now.atZone(zone);
        if (!isoWeekdays.contains(local.getDayOfWeek().getValue())) return null;
        return local.toLocalDate().atTime(at).atZone(zone).toInstant();
    }

    /** When the alert is decided: T + grace, but not before T + {@link #MIN_PROBE}. */
    public static Instant decisionAt(Instant expected, int graceMinutes) {
        Instant withGrace = expected.plus(Duration.ofMinutes(Math.max(0, graceMinutes)));
        Instant earliest = expected.plus(MIN_PROBE);
        return withGrace.isBefore(earliest) ? earliest : withGrace;
    }

    /**
     * @param inside    the committed state of the person for this place; null = never seen there
     * @param changedAt when that state began (the crossing time), or null
     * @param status    today's daily_checks status for this schedule and person, or null
     */
    public static Action decide(Kind kind, Boolean inside, Instant changedAt, Instant expected, int graceMinutes,
                                String status, ZoneId zone, Instant now) {
        if (expected == null || now.isBefore(expected)) return Action.NONE;
        if (OK_SENT.equals(status) || LATE_SENT.equals(status) || SKIPPED.equals(status) || LEGACY_OK.equals(status)) {
            return Action.NONE;
        }
        boolean in = Boolean.TRUE.equals(inside);
        Instant decideAt = decisionAt(expected, graceMinutes);

        if (kind == Kind.LEAVE_BY && !in && !today(changedAt, zone, now)) {
            // Not there and not there today at all: nothing to report about leaving.
            return ALERTED.equals(status) ? Action.NONE : Action.SKIP;
        }
        boolean met = kind == Kind.ARRIVE_BY ? in : !in;

        if (met) {
            if (ALERTED.equals(status)) {
                return now.isBefore(decideAt.plus(LATE_WINDOW)) ? Action.LATE : Action.SKIP;
            }
            return now.isBefore(decideAt.plus(WINDOW)) ? Action.ON_TIME : Action.SKIP;
        }
        if (ALERTED.equals(status)) return Action.NONE;
        if (now.isBefore(decideAt)) {
            return status == null ? Action.PROBE : Action.NONE;
        }
        return now.isBefore(decideAt.plus(WINDOW)) ? Action.MISSED : Action.SKIP;
    }

    /** True when the crossing happened today (local), so it belongs in today's message. */
    public static boolean today(Instant changedAt, ZoneId zone, Instant now) {
        return changedAt != null && localDay(zone, changedAt).equals(localDay(zone, now));
    }

    /**
     * Breach test kept for the simple case: true when the expectation is not met.
     * @param inside the committed state of the person for this place; null = never seen there
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
