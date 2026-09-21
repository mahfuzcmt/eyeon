package com.webinnovation.eyeon.domain;

import java.time.Instant;
import java.time.LocalDate;

/**
 * What a person did over a time range, derived from raw location points (no trips involved).
 * Distance and moving time only count segments where the tracker itself reported movement,
 * because a wearable sitting indoors drifts tens of metres per fix and would otherwise
 * "walk" kilometres while its wearer sits in a classroom.
 */
public record Activity(
        long distanceM,
        long movingS,
        long stillS,
        int maxSpeed,
        int points,
        Instant firstTs,
        Instant lastTs
) {
    /** One calendar day (Asia/Dhaka) of activity, for the month view. */
    public record Day(LocalDate date, long distanceM, long movingS, int points) {}
}
