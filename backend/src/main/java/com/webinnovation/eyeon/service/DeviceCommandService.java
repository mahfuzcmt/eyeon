package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.netty.ChannelKeys;
import com.webinnovation.eyeon.protocol.PacketEncoder;
import io.netty.channel.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sends server-originated commands to GT06 devices over their open Netty channels
 * and resolves the returned {@link CompletableFuture} when the device replies (0x15).
 *
 * <p>Multi-tenant: every public method takes the caller's {@code orgId}. Before sending
 * we verify that the channel attribute matches — a stolen IMEI from another tenant
 * cannot trigger a fuel cut on a device it doesn't own.
 *
 * <p>Reply correlation uses a 32-bit {@code serverFlag} we inject into the 0x80 packet.
 * The handler echoes that flag back in the 0x15 reply, and {@link #completeReply}
 * resolves the matching future.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceCommandService {

    private static final long REPLY_TIMEOUT_MS = 15_000;

    private final PacketEncoder packetEncoder;

    /** IMEI → live channel registry. Updated by Gt06Handler on login / disconnect. */
    private final Map<String, Channel> channels = new ConcurrentHashMap<>();

    /** ServerFlag → pending future, keyed by the value baked into the 0x80 packet. */
    private final Map<Integer, CompletableFuture<String>> pending = new ConcurrentHashMap<>();

    private final AtomicInteger flagSeq = new AtomicInteger(1);
    private final AtomicInteger serialSeq = new AtomicInteger(1);

    public void registerChannel(String imei, Channel channel) {
        Channel prev = channels.put(imei, channel);
        if (prev != null && prev != channel && prev.isActive()) {
            log.info("Closing prior channel for imei={}", imei);
            prev.close();
        }
    }

    public void unregisterChannel(String imei, Channel channel) {
        // Only remove if it's the same channel — a fresh login may have already swapped it.
        channels.computeIfPresent(imei, (k, current) -> current == channel ? null : current);
    }

    /** Close the tracker's live connection, if any (used after the device is deleted). */
    public void disconnect(String imei) {
        Channel c = channels.remove(imei);
        if (c != null && c.isActive()) {
            log.info("Closing channel for deleted imei={}", imei);
            c.close();
        }
    }

    public boolean isOnline(String imei) {
        Channel c = channels.get(imei);
        return c != null && c.isActive();
    }

    /**
     * Send a raw GT06 ASCII command (e.g. "DYD,123456#" for fuel cut). Returns a future
     * that completes with the device reply or completes exceptionally on timeout.
     */
    public CompletableFuture<String> sendRaw(UUID orgId, String imei, String command) {
        Channel channel = channels.get(imei);
        if (channel == null || !channel.isActive()) {
            CompletableFuture<String> f = new CompletableFuture<>();
            f.completeExceptionally(new IllegalStateException("Device offline: " + imei));
            return f;
        }
        UUID channelOrg = channel.attr(ChannelKeys.ORG_ID_KEY).get();
        if (channelOrg == null || !channelOrg.equals(orgId)) {
            CompletableFuture<String> f = new CompletableFuture<>();
            f.completeExceptionally(new SecurityException(
                    "IMEI " + imei + " does not belong to org " + orgId));
            return f;
        }

        int flag = flagSeq.getAndIncrement();
        int serial = serialSeq.getAndIncrement() & 0xFFFF;

        CompletableFuture<String> future = new CompletableFuture<>();
        pending.put(flag, future);

        channel.writeAndFlush(packetEncoder.buildServerCommand(flag, command, serial))
                .addListener(send -> {
                    if (!send.isSuccess()) {
                        pending.remove(flag);
                        future.completeExceptionally(send.cause());
                    }
                });

        // Timeout — clean up the entry to avoid memory leaks if the device never replies.
        future.orTimeout(REPLY_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                .whenComplete((reply, err) -> pending.remove(flag));

        return future;
    }

    /** Convenience wrappers for the canonical Bangladesh-market commands (CLAUDE.md §7.4). */
    public CompletableFuture<String> cutFuel(UUID orgId, String imei, String devicePassword) {
        return sendRaw(orgId, imei, "DYD," + devicePassword + "#");
    }

    public CompletableFuture<String> restoreFuel(UUID orgId, String imei, String devicePassword) {
        return sendRaw(orgId, imei, "HFYD," + devicePassword + "#");
    }

    public CompletableFuture<String> queryAddress(UUID orgId, String imei, String devicePassword) {
        return sendRaw(orgId, imei, "WHERE," + devicePassword + "#");
    }

    // ---- Jimi PL601 personal tracker (PL601 command list V1.4) ----

    /** Tracker's own interval while real-time tracking is on. */
    public static final int LIVE_INTERVAL_SECONDS = 10;

    /**
     * Real-time tracking: the tracker reports every 10 s for {@code seconds}, then returns to its
     * normal (battery-saving) mode by itself. GPS, Wi-Fi and cell data are all included.
     */
    public CompletableFuture<String> liveTracking(UUID orgId, String imei, int seconds) {
        return sendRaw(orgId, imei, "LT,ON," + LIVE_INTERVAL_SECONDS + "," + seconds + ",1,1,1#");
    }

    /** Buzzer at full volume and flashing lights for {@code seconds}; ignores do-not-disturb. */
    public CompletableFuture<String> findDevice(UUID orgId, String imei, int seconds) {
        return sendRaw(orgId, imei, "FD,ON," + seconds + "#");
    }

    /** Called by Gt06Handler when a 0x15 packet arrives from any device. */
    public void completeReply(int serverFlag, String reply) {
        CompletableFuture<String> f = pending.remove(serverFlag);
        if (f != null) f.complete(reply);
        else log.debug("No pending command for serverFlag={}", serverFlag);
    }
}
