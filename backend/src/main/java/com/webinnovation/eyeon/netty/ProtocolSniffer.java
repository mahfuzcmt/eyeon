package com.webinnovation.eyeon.netty;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelPipeline;
import io.netty.handler.codec.ByteToMessageDecoder;
import lombok.extern.slf4j.Slf4j;

import java.net.InetSocketAddress;
import java.util.List;

/**
 * First handler on every tracker connection: looks at the first byte the device sends and
 * decides which protocol the connection speaks, then removes itself.
 *
 * <ul>
 *   <li>{@code [} (0x5B) - a "3G"-protocol smart watch ({@code [3G*id*len*LK,...]}). When
 *       watch relaying is configured, the GT06 handlers are taken out and the connection is
 *       handed to {@link WatchRelay}, which passes it through to the watch server.</li>
 *   <li>anything else - GT06 (frames start 0x78 0x78 / 0x79 0x79). The pipeline is left as it
 *       was; the bytes already read go on to {@link Gt06FrameDecoder}, which resyncs past
 *       garbage exactly as before.</li>
 * </ul>
 *
 * Both kinds of device speak first after connecting, so one byte is enough and GT06 trackers
 * get no added delay. Not sharable: one instance per channel.
 */
@Slf4j
public class ProtocolSniffer extends ByteToMessageDecoder {

    static final int WATCH_START = '[';

    private final WatchTarget watchTarget;
    private final WatchIngest watchIngest;

    public ProtocolSniffer(WatchTarget watchTarget) {
        this(watchTarget, null);
    }

    /** @param watchIngest also reads relayed watch frames into EyeOn; null = relay only */
    public ProtocolSniffer(WatchTarget watchTarget, WatchIngest watchIngest) {
        this.watchTarget = watchTarget;
        this.watchIngest = watchIngest;
    }

    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        if (!in.isReadable()) {
            return;
        }
        ChannelPipeline p = ctx.pipeline();
        int first = in.getUnsignedByte(in.readerIndex());
        if (first == WATCH_START && watchTarget != null) {
            log.info("Watch connection from {} (id={}), relaying to {}",
                    remote(ctx), ctx.channel().id(), watchTarget);
            p.addAfter(ctx.name(), TrackerPipeline.WATCH_RELAY, new WatchRelay(watchTarget, watchIngest));
            if (p.get(TrackerPipeline.FRAME) != null) p.remove(TrackerPipeline.FRAME);
            if (p.get(TrackerPipeline.HANDLER) != null) p.remove(TrackerPipeline.HANDLER);
        }
        // Removing a ByteToMessageDecoder hands the bytes it has buffered to the next handler.
        p.remove(this);
    }

    private static String remote(ChannelHandlerContext ctx) {
        return ctx.channel().remoteAddress() instanceof InetSocketAddress a
                ? a.getAddress().getHostAddress() + ":" + a.getPort()
                : String.valueOf(ctx.channel().remoteAddress());
    }
}
