package com.webinnovation.eyeon.netty;

import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelPipeline;
import io.netty.handler.timeout.IdleStateHandler;

import java.util.concurrent.TimeUnit;

/**
 * The handler chain for one tracker connection on the GT06 port. Kept apart from Spring so the
 * tests build exactly the pipeline production uses.
 *
 * <pre>idle → sniff → frame (Gt06FrameDecoder) → handler (Gt06Handler)</pre>
 *
 * {@link ProtocolSniffer} removes itself after the first byte; for a smart watch it also
 * replaces {@code frame} and {@code handler} with {@link WatchRelay}.
 */
public final class TrackerPipeline {

    public static final String IDLE = "idle";
    public static final String SNIFF = "sniff";
    public static final String FRAME = "frame";
    public static final String HANDLER = "handler";
    public static final String WATCH_RELAY = "watch-relay";

    private TrackerPipeline() {
    }

    /**
     * @param gt06Handler the (sharable) GT06 handler
     * @param watchTarget where watch connections are relayed; null = no relaying, a watch's
     *                    bytes then go to the GT06 decoder and are discarded as before
     */
    public static void configure(ChannelPipeline p, ChannelHandler gt06Handler, WatchTarget watchTarget,
                                 int idleReadSeconds) {
        configure(p, gt06Handler, watchTarget, null, idleReadSeconds);
    }

    /**
     * @param watchIngest reads relayed watch frames into EyeOn (devices, locations, alarms);
     *                    null = watches are relayed only
     */
    public static void configure(ChannelPipeline p, ChannelHandler gt06Handler, WatchTarget watchTarget,
                                 WatchIngest watchIngest, int idleReadSeconds) {
        p.addLast(IDLE, new IdleStateHandler(idleReadSeconds, 0, 0, TimeUnit.SECONDS))
                .addLast(SNIFF, new ProtocolSniffer(watchTarget, watchIngest))
                .addLast(FRAME, new Gt06FrameDecoder())
                .addLast(HANDLER, gt06Handler);
    }
}
