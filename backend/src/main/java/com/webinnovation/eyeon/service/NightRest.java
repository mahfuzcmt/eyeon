package com.webinnovation.eyeon.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Clock arithmetic for a daily time window such as the tracker's night rest. Pure.
 *
 * <p>A window may cross midnight (23:00-06:00). {@code from == to} is not a window.
 */
public final class NightRest {

    private NightRest() {}

    /** Is {@code at} inside the daily window, in the given zone? The start is inside, the end is not. */
    public static boolean inWindow(LocalTime from, LocalTime to, ZoneId zone, Instant at) {
        if (from.equals(to)) return false;
        LocalTime t = at.atZone(zone).toLocalTime();
        return from.isBefore(to)
                ? !t.isBefore(from) && t.isBefore(to)
                : !t.isBefore(from) || t.isBefore(to);
    }

    /** The latest moment a window ended, at or before {@code now}. */
    public static Instant lastEnd(LocalTime to, ZoneId zone, Instant now) {
        LocalDate today = now.atZone(zone).toLocalDate();
        Instant end = ZonedDateTime.of(today, to, zone).toInstant();
        return end.isAfter(now) ? ZonedDateTime.of(today.minusDays(1), to, zone).toInstant() : end;
    }
}
