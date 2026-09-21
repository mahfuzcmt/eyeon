package com.webinnovation.eyeon.netty;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.function.Consumer;

/**
 * Per-connection hand-off between the asynchronous login lookup and the packets that follow it.
 *
 * <p>The login packet is ACKed on the event loop at once (devices disconnect after ~5 s without
 * an ACK) and the IMEI is resolved to a device off the event loop. A tracker often sends its
 * next packet - a location, or the SOS alarm it woke up to send - within milliseconds. Before
 * 2026-09-21 such a packet was ACKed and then silently dropped because the channel was not
 * "registered" yet; the device, having received its ACK, never resent it. On localhost the
 * first location after every login was lost.
 *
 * <p>Now every packet goes through {@link #submit}: before the lookup finishes it is queued (in
 * arrival order, bounded by {@link #MAX_PENDING}); afterwards it runs directly. {@link #resolve}
 * releases the queue as ONE task so queued packets are processed in the order they arrived.
 * If the tracker turns out to be unknown the queue is discarded, exactly as before.
 */
@Slf4j
public final class LoginGate {

    /** The resolved identity of the tracker on this connection. */
    public record Session(String imei, UUID orgId) {}

    /** A login lookup takes milliseconds; 64 packets is far more than a tracker sends in that time. */
    static final int MAX_PENDING = 64;

    private final Object lock = new Object();
    private boolean resolved;
    private Session session;                 // null after resolve = unknown / failed tracker
    private List<Consumer<Session>> pending = new ArrayList<>();
    private int overflow;

    /** Run {@code task} with the tracker's session now, or as soon as the login lookup finishes. */
    public void submit(Consumer<Session> task, Executor executor) {
        Session s;
        synchronized (lock) {
            if (!resolved) {
                if (pending.size() < MAX_PENDING) {
                    pending.add(task);
                } else {
                    overflow++;
                }
                return;
            }
            s = session;
        }
        if (s != null) executor.execute(() -> task.accept(s));
    }

    /**
     * Called once by the login lookup. {@code session == null} means the tracker could not be
     * registered: queued packets are discarded, like packets from an unregistered channel.
     *
     * @return how many queued packets were released (or discarded)
     */
    public int resolve(Session session, Executor executor) {
        List<Consumer<Session>> queued;
        int lost;
        synchronized (lock) {
            if (resolved) return 0;
            resolved = true;
            this.session = session;
            queued = pending;
            pending = List.of();
            lost = overflow;
        }
        if (lost > 0) {
            log.warn("Login gate overflow: {} packets beyond {} were dropped before login finished (imei={})",
                    lost, MAX_PENDING, session == null ? "?" : session.imei());
        }
        if (session == null || queued.isEmpty()) return queued.size();
        executor.execute(() -> {
            for (Consumer<Session> task : queued) {
                try {
                    task.accept(session);
                } catch (Exception e) {
                    log.error("Queued packet failed for imei={}: {}", session.imei(), e.getMessage(), e);
                }
            }
        });
        return queued.size();
    }
}
