package com.webinnovation.eyeon.netty;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginGateTest {

    private final Executor direct = Runnable::run;
    private final LoginGate.Session rafi = new LoginGate.Session("864290061234567", UUID.randomUUID());

    @Test
    void packets_that_arrive_during_login_run_after_it_in_arrival_order() {
        LoginGate gate = new LoginGate();
        List<String> ran = new ArrayList<>();
        gate.submit(s -> ran.add("location"), direct);
        gate.submit(s -> ran.add("sos"), direct);
        assertTrue(ran.isEmpty(), "nothing runs before the login lookup finishes");

        assertEquals(2, gate.resolve(rafi, direct));
        assertEquals(List.of("location", "sos"), ran);
    }

    @Test
    void after_login_packets_run_immediately_with_the_session() {
        LoginGate gate = new LoginGate();
        gate.resolve(rafi, direct);
        List<String> imeis = new ArrayList<>();
        gate.submit(s -> imeis.add(s.imei()), direct);
        assertEquals(List.of(rafi.imei()), imeis);
    }

    @Test
    void an_unregistered_tracker_s_packets_are_discarded() {
        LoginGate gate = new LoginGate();
        List<String> ran = new ArrayList<>();
        gate.submit(s -> ran.add("queued"), direct);
        assertEquals(1, gate.resolve(null, direct));
        gate.submit(s -> ran.add("later"), direct);
        assertTrue(ran.isEmpty());
    }

    @Test
    void the_queue_is_bounded_and_resolve_is_once_only() {
        LoginGate gate = new LoginGate();
        List<Integer> ran = new ArrayList<>();
        for (int i = 0; i < LoginGate.MAX_PENDING + 10; i++) {
            int n = i;
            gate.submit(s -> ran.add(n), direct);
        }
        assertEquals(LoginGate.MAX_PENDING, gate.resolve(rafi, direct));
        assertEquals(LoginGate.MAX_PENDING, ran.size());
        assertEquals(0, gate.resolve(rafi, direct), "a second resolve does nothing");
    }

    @Test
    void one_failing_queued_packet_does_not_stop_the_others() {
        LoginGate gate = new LoginGate();
        List<String> ran = new ArrayList<>();
        gate.submit(s -> { throw new IllegalStateException("bad packet"); }, direct);
        gate.submit(s -> ran.add("sos"), direct);
        gate.resolve(rafi, direct);
        assertEquals(List.of("sos"), ran);
    }
}
