package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.protocol.WatchFrame;
import io.netty.buffer.Unpooled;
import io.netty.channel.Channel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Commands from EyeOn to a smart watch, written into the connection {@link WatchRelay} relays.
 * The watch server keeps answering the watch as before; this is only for what the app sets
 * ({@code LZ}: language and time zone). The watch's reply is the command name echoed back
 * ({@code [3G*id*0002*LZ]}); it reaches {@link WatchIngest} like any other frame, which hands
 * it to {@link #onFrame}. The watch server sees the reply too and logs it, nothing more.
 *
 * <p>"Connected" is the server's view: on a mobile network a watch leaves a connection without
 * closing it, so a command can be written into a dead one and never be answered. Callers wait
 * for the reply and try again later when none comes.
 */
@Component
@Slf4j
public class WatchCommands {

    private record Link(Channel channel, String watchId, String vendor) {}

    /** Device IMEI → the connection its watch last identified on. */
    private final Map<String, Link> links = new ConcurrentHashMap<>();
    /** "imei|COMMAND" → whoever waits for that command's reply. */
    private final Map<String, CompletableFuture<String>> waiting = new ConcurrentHashMap<>();

    void attach(String imei, String watchId, String vendor, Channel channel) {
        links.put(imei, new Link(channel, watchId, vendor));
    }

    void detach(String imei, Channel channel) {
        links.computeIfPresent(imei, (k, link) -> link.channel() == channel ? null : link);
    }

    /** Called for every frame of an identified watch that is not a heartbeat or a position report. */
    void onFrame(String imei, WatchFrame frame) {
        CompletableFuture<String> reply = waiting.remove(key(imei, frame.command()));
        if (reply != null) {
            reply.complete(frame.content());
        }
    }

    public boolean connected(String imei) {
        Link link = links.get(imei);
        return link != null && link.channel().isActive();
    }

    /**
     * Sends {@code content} (e.g. {@code "LZ,0,6"}) to the watch. The future completes with the
     * watch's reply, or fails at once when no connection is known; it does not time out by itself.
     */
    public CompletableFuture<String> send(String imei, String content) {
        Link link = links.get(imei);
        if (link == null || !link.channel().isActive()) {
            return CompletableFuture.failedFuture(new IllegalStateException("watch not connected"));
        }
        int comma = content.indexOf(',');
        CompletableFuture<String> reply = new CompletableFuture<>();
        CompletableFuture<String> earlier = waiting.put(key(imei, comma < 0 ? content : content.substring(0, comma)), reply);
        if (earlier != null) {
            earlier.cancel(false);
        }
        String frame = frame(link.vendor(), link.watchId(), content);
        link.channel().writeAndFlush(Unpooled.copiedBuffer(frame, StandardCharsets.ISO_8859_1));
        log.info("Watch command to imei={}: {}", imei, content);
        return reply;
    }

    /** {@code [<vendor>*<id>*<LEN hex4>*<content>]}; LEN is the byte length of the content. */
    static String frame(String vendor, String watchId, String content) {
        int length = content.getBytes(StandardCharsets.ISO_8859_1).length;
        return String.format("[%s*%s*%04X*%s]", vendor, watchId, length, content);
    }

    private static String key(String imei, String command) {
        return imei + "|" + command;
    }
}
