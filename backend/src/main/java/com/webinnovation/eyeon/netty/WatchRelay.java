package com.webinnovation.eyeon.netty;

import io.netty.bootstrap.Bootstrap;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufUtil;
import io.netty.buffer.Unpooled;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelOption;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.timeout.IdleStateEvent;
import io.netty.util.ReferenceCountUtil;
import lombok.extern.slf4j.Slf4j;

import java.net.Inet6Address;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Queue;

/**
 * Passes a smart-watch connection that arrived on the tracker port through to the watch
 * server, byte for byte in both directions. The watch server is told the watch's real address
 * with a PROXY protocol v1 line sent before the first byte, so its logs and {@code last_ip}
 * show the watch, not the backend.
 *
 * The outbound connection uses the inbound channel's event loop, so both sides are handled on
 * one thread. Reading from the watch is paused until the watch server has accepted; what
 * arrived before that (including the bytes the sniffer read) is queued and sent first.
 *
 * <p>With a {@link WatchIngest} the backend also reads a copy of what the watch sends, which is
 * how the watch becomes a device on the map. The relay itself is unchanged by it.
 */
@Slf4j
public class WatchRelay extends ChannelInboundHandlerAdapter {

    private static final int CONNECT_TIMEOUT_MS = 5_000;

    private final WatchTarget target;
    private final WatchIngest ingest;
    private final Queue<Object> pending = new ArrayDeque<>();
    private Channel outbound;
    private boolean connected;
    private WatchIngest.Connection tap;

    public WatchRelay(WatchTarget target) {
        this(target, null);
    }

    /** @param ingest reads a copy of the watch's frames into EyeOn; null = relay only */
    public WatchRelay(WatchTarget target, WatchIngest ingest) {
        this.target = target;
        this.ingest = ingest;
    }

    @Override
    public void handlerAdded(ChannelHandlerContext ctx) {
        Channel inbound = ctx.channel();
        if (ingest != null) {
            tap = ingest.open(String.valueOf(inbound.remoteAddress()));
        }
        inbound.config().setAutoRead(false);
        ChannelFuture f = new Bootstrap()
                .group(inbound.eventLoop())
                .channel(NioSocketChannel.class)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, CONNECT_TIMEOUT_MS)
                .option(ChannelOption.TCP_NODELAY, true)
                .option(ChannelOption.SO_KEEPALIVE, true)
                .handler(new Backward(inbound))
                .connect(target.host(), target.port());
        outbound = f.channel();
        f.addListener((ChannelFutureListener) done -> {
            if (!done.isSuccess()) {
                log.warn("Watch relay: cannot reach watch server {} ({}); closing watch connection {}",
                        target, done.cause() == null ? "?" : done.cause().getMessage(), inbound.id());
                drainPending();
                inbound.close();
                return;
            }
            connected = true;
            outbound.write(Unpooled.copiedBuffer(proxyHeader(inbound), StandardCharsets.US_ASCII));
            Object msg;
            while ((msg = pending.poll()) != null) {
                outbound.write(msg);
            }
            outbound.flush();
            if (inbound.isActive()) {
                inbound.config().setAutoRead(true);
                inbound.read();
            } else {
                outbound.close();
            }
        });
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        if (tap != null && msg instanceof ByteBuf bytes) {
            try {
                tap.onBytes(ByteBufUtil.getBytes(bytes));  // a copy; the buffer goes on to the watch server
            } catch (Exception e) {
                log.warn("Watch ingest failed on connection {}: {}", ctx.channel().id(), e.getMessage());
            }
        }
        if (connected && outbound.isActive()) {
            outbound.writeAndFlush(msg);
        } else if (!connected && outbound != null && outbound.isOpen()) {
            pending.add(msg);
        } else {
            ReferenceCountUtil.release(msg);
        }
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        log.info("Watch connection {} closed", ctx.channel().id());
        drainPending();
        if (outbound != null) {
            outbound.close();
        }
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) {
            ctx.close();
        } else {
            ctx.fireUserEventTriggered(evt);
        }
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        log.warn("Watch relay exception (id={}): {}", ctx.channel().id(), cause.getMessage());
        ctx.close();
    }

    private void drainPending() {
        Object msg;
        while ((msg = pending.poll()) != null) {
            ReferenceCountUtil.release(msg);
        }
    }

    /** "PROXY TCP4 src dst srcport dstport\r\n" - the watch's address and the port it dialled. */
    static String proxyHeader(Channel inbound) {
        if (inbound.remoteAddress() instanceof InetSocketAddress src
                && inbound.localAddress() instanceof InetSocketAddress dst
                && src.getAddress() != null && dst.getAddress() != null) {
            String family = src.getAddress() instanceof Inet6Address ? "TCP6" : "TCP4";
            if (family.equals(dst.getAddress() instanceof Inet6Address ? "TCP6" : "TCP4")) {
                return "PROXY " + family + " " + src.getAddress().getHostAddress() + " "
                        + dst.getAddress().getHostAddress() + " " + src.getPort() + " " + dst.getPort() + "\r\n";
            }
        }
        return "PROXY UNKNOWN\r\n";
    }

    /** Watch server → watch. */
    private static final class Backward extends ChannelInboundHandlerAdapter {
        private final Channel inbound;

        Backward(Channel inbound) {
            this.inbound = inbound;
        }

        @Override
        public void channelRead(ChannelHandlerContext ctx, Object msg) {
            if (inbound.isActive()) {
                inbound.writeAndFlush(msg);
            } else {
                ReferenceCountUtil.release(msg);
            }
        }

        @Override
        public void channelInactive(ChannelHandlerContext ctx) {
            if (inbound.isActive()) {
                inbound.writeAndFlush(Unpooled.EMPTY_BUFFER).addListener(ChannelFutureListener.CLOSE);
            }
        }

        @Override
        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
            log.warn("Watch relay: watch server side error: {}", cause.getMessage());
            ctx.close();
        }
    }
}
