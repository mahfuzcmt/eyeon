package com.webinnovation.eyeon.service;

import java.time.Duration;
import java.time.Instant;

/**
 * Pure decision logic for one (geofence, device) pair on one location sample.
 *
 * <p>A wearable tracker indoors drifts tens of metres, so a single sample across the
 * edge must not fire "left School". Two guards (docs/FAMILY_SAFETY_PLAN.md §5.2):
 * <ol>
 *   <li><b>Exit buffer</b> — someone who is inside only counts as outside once the point
 *       is more than {@code exit_buffer_m} beyond the edge. Entering uses the true edge.</li>
 *   <li><b>Dwell confirmation</b> — a change is first stored as a candidate; it commits
 *       only when a later sample still agrees at least {@code min_dwell_s} after the
 *       candidate was first seen. A sample that disagrees drops the candidate.</li>
 * </ol>
 * The committed event carries the time the candidate was first seen (when they actually
 * crossed), not the confirmation time.
 */
public final class GeofenceTransition {

    private GeofenceTransition() {}

    public enum Action {
        /** Nothing to write. */
        NONE,
        /** First sample for this pair: store the state, raise nothing. */
        SEED,
        /** Store a candidate change and wait for confirmation. */
        SET_PENDING,
        /** The candidate was contradicted: drop it. */
        CLEAR_PENDING,
        /** The change is confirmed: store it and raise the event. */
        COMMIT
    }

    /**
     * @param inside  the state to store (SEED, SET_PENDING, COMMIT); unused otherwise
     * @param eventTs when the crossing happened (COMMIT) / candidate start (SET_PENDING)
     */
    public record Decision(Action action, boolean inside, Instant eventTs) {
        static Decision of(Action action) {
            return new Decision(action, false, null);
        }
    }

    /**
     * @param prevInside    committed state, or null when this pair has never been evaluated
     * @param inside        the point is covered by the geofence
     * @param withinBuffer  the point is within {@code exit_buffer_m} of the geofence (true whenever {@code inside})
     * @param pendingInside candidate state awaiting confirmation, or null
     * @param pendingSince  when the candidate was first seen
     * @param ts            timestamp of this sample
     * @param minDwellS     confirmation time in seconds; 0 commits on the first sample
     */
    public static Decision decide(Boolean prevInside, boolean inside, boolean withinBuffer,
                                  Boolean pendingInside, Instant pendingSince,
                                  Instant ts, int minDwellS) {
        if (prevInside == null) {
            return new Decision(Action.SEED, inside, ts);
        }

        // Hysteresis: while inside, stay inside until clearly beyond the buffer.
        boolean observed = prevInside ? withinBuffer : inside;

        if (observed == prevInside) {
            return Decision.of(pendingInside != null ? Action.CLEAR_PENDING : Action.NONE);
        }
        if (minDwellS <= 0) {
            return new Decision(Action.COMMIT, observed, ts);
        }
        if (pendingInside == null || pendingInside != observed || pendingSince == null) {
            return new Decision(Action.SET_PENDING, observed, ts);
        }
        // Buffered uploads can arrive out of order; a negative gap simply keeps waiting.
        if (Duration.between(pendingSince, ts).getSeconds() >= minDwellS) {
            return new Decision(Action.COMMIT, observed, pendingSince);
        }
        return Decision.of(Action.NONE);
    }
}
