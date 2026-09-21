package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.service.GeofenceTransition.Action;
import com.webinnovation.eyeon.service.GeofenceTransition.Decision;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeofenceTransitionTest {

    private static final Instant T0 = Instant.parse("2026-09-21T02:00:00Z");
    private static final int DWELL = 60;

    private static Instant at(int seconds) {
        return T0.plusSeconds(seconds);
    }

    @Test
    void first_sample_seeds_state_without_an_event() {
        Decision d = GeofenceTransition.decide(null, true, true, null, null, T0, DWELL);
        assertEquals(Action.SEED, d.action());
        assertTrue(d.inside());
    }

    @Test
    void staying_put_does_nothing() {
        assertEquals(Action.NONE, GeofenceTransition.decide(true, true, true, null, null, T0, DWELL).action());
        assertEquals(Action.NONE, GeofenceTransition.decide(false, false, false, null, null, T0, DWELL).action());
    }

    @Test
    void arriving_is_a_candidate_first_then_commits_after_dwell() {
        Decision first = GeofenceTransition.decide(false, true, true, null, null, T0, DWELL);
        assertEquals(Action.SET_PENDING, first.action());
        assertTrue(first.inside());
        assertEquals(T0, first.eventTs());

        Decision tooSoon = GeofenceTransition.decide(false, true, true, true, T0, at(30), DWELL);
        assertEquals(Action.NONE, tooSoon.action());

        Decision confirmed = GeofenceTransition.decide(false, true, true, true, T0, at(60), DWELL);
        assertEquals(Action.COMMIT, confirmed.action());
        assertTrue(confirmed.inside());
        // The event is stamped with when they crossed, not when we became sure.
        assertEquals(T0, confirmed.eventTs());
    }

    @Test
    void drifting_just_over_the_edge_while_inside_is_ignored() {
        // Outside the true edge but still within exit_buffer_m.
        Decision d = GeofenceTransition.decide(true, false, true, null, null, T0, DWELL);
        assertEquals(Action.NONE, d.action());
    }

    @Test
    void leaving_needs_to_clear_the_buffer_and_then_dwell() {
        Decision candidate = GeofenceTransition.decide(true, false, false, null, null, T0, DWELL);
        assertEquals(Action.SET_PENDING, candidate.action());
        assertFalse(candidate.inside());

        Decision confirmed = GeofenceTransition.decide(true, false, false, false, T0, at(300), DWELL);
        assertEquals(Action.COMMIT, confirmed.action());
        assertFalse(confirmed.inside());
        assertEquals(T0, confirmed.eventTs());
    }

    @Test
    void a_sample_that_disagrees_cancels_the_candidate() {
        // Candidate "left", but the next fix is back inside: one stray point, not a departure.
        Decision d = GeofenceTransition.decide(true, true, true, false, T0, at(20), DWELL);
        assertEquals(Action.CLEAR_PENDING, d.action());
    }

    @Test
    void buffer_does_not_help_you_enter() {
        // Outside, now within the buffer but not inside the true edge: still outside.
        Decision d = GeofenceTransition.decide(false, false, true, null, null, T0, DWELL);
        assertEquals(Action.NONE, d.action());
    }

    @Test
    void zero_dwell_commits_immediately() {
        Decision d = GeofenceTransition.decide(false, true, true, null, null, T0, 0);
        assertEquals(Action.COMMIT, d.action());
        assertEquals(T0, d.eventTs());
    }

    @Test
    void out_of_order_sample_keeps_waiting_instead_of_committing() {
        Decision d = GeofenceTransition.decide(false, true, true, true, T0, at(-120), DWELL);
        assertEquals(Action.NONE, d.action());
    }
}
