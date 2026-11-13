package com.webinnovation.eyeon.netty;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufUtil;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandler.Sharable;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smart watches and GT06 trackers share the tracker port: real sockets, the production
 * {@link TrackerPipeline}, a stand-in for Gt06Handler and a fake watch server.
 */
class TrackerPortWatchRelayTest {

    private static final byte[] WATCH_LK = "[3G*8800000015*000D*LK,50,100,100]".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WATCH_LK_REPLY = "[3G*8800000015*0002*LK]".getBytes(StandardCharsets.US_ASCII);

    private EventLoopGroup group;
    private Channel server;
    private ServerSocket watchServer;
    private final Capture gt06 = new Capture();

    @BeforeEach
    void setUp() throws IOException {
        group = new NioEventLoopGroup(2);
        watchServer = new ServerSocket(0, 5, java.net.InetAddress.getLoopbackAddress());
        watchServer.setSoTimeout(3000);
    }

    @AfterEach
    void tearDown() throws IOException {
        if (server != null) server.close().syncUninterruptibly();
        group.shutdownGracefully(0, 1, TimeUnit.SECONDS).syncUninterruptibly();
        watchServer.close();
    }

    private int startTrackerPort(WatchTarget target) {
        return startTrackerPort(target, null);
    }

    private int startTrackerPort(WatchTarget target, WatchIngest ingest) {
        server = new ServerBootstrap()
                .group(group)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        TrackerPipeline.configure(ch.pipeline(), gt06, target, ingest, 600);
                    }
                })
                .bind("127.0.0.1", 0).syncUninterruptibly().channel();
        return ((InetSocketAddress) server.localAddress()).getPort();
    }

    private WatchTarget watchTarget() {
        return new WatchTarget("127.0.0.1", watchServer.getLocalPort());
    }

    @Test
    void watchIsRelayedBothWaysWithItsRealAddress() throws Exception {
        int port = startTrackerPort(watchTarget());
        try (Socket watch = new Socket("127.0.0.1", port)) {
            watch.getOutputStream().write(WATCH_LK);
            watch.getOutputStream().flush();

            try (Socket relayed = watchServer.accept()) {
                relayed.setSoTimeout(3000);
                String header = readLine(relayed.getInputStream());
                assertThat(header).isEqualTo("PROXY TCP4 127.0.0.1 127.0.0.1 " + watch.getLocalPort() + " " + port);
                assertThat(readExactly(relayed.getInputStream(), WATCH_LK.length)).isEqualTo(WATCH_LK);

                relayed.getOutputStream().write(WATCH_LK_REPLY);
                relayed.getOutputStream().flush();
                watch.setSoTimeout(3000);
                assertThat(readExactly(watch.getInputStream(), WATCH_LK_REPLY.length)).isEqualTo(WATCH_LK_REPLY);

                // later frames on the same connection go the same way
                byte[] ud = "[3G*8800000015*0004*UD,1]".getBytes(StandardCharsets.US_ASCII);
                watch.getOutputStream().write(ud);
                watch.getOutputStream().flush();
                assertThat(readExactly(relayed.getInputStream(), ud.length)).isEqualTo(ud);

                // watch server hangs up -> the watch is disconnected
                relayed.close();
                assertThat(watch.getInputStream().read()).isEqualTo(-1);
            }
        }
        assertThat(gt06.frames).isEmpty();
    }

    /** The relay is untouched by the ingest: the watch server still gets every byte and answers. */
    @Test
    void relayedWatchAlsoBecomesAnEyeOnDevice() throws Exception {
        com.webinnovation.eyeon.service.DeviceService devices = org.mockito.Mockito.mock(com.webinnovation.eyeon.service.DeviceService.class);
        com.webinnovation.eyeon.domain.Device device = org.mockito.Mockito.mock(com.webinnovation.eyeon.domain.Device.class);
        org.mockito.Mockito.when(device.imei()).thenReturn("8800000015");
        org.mockito.Mockito.when(device.orgId()).thenReturn(java.util.UUID.randomUUID());
        org.mockito.Mockito.when(devices.findByWatchId("8800000015")).thenReturn(java.util.Optional.of(device));
        WatchIngest ingest = new WatchIngest(devices,
                org.mockito.Mockito.mock(com.webinnovation.eyeon.service.LocationService.class),
                org.mockito.Mockito.mock(com.webinnovation.eyeon.service.AlarmService.class),
                org.mockito.Mockito.mock(com.webinnovation.eyeon.service.NetworkLocationService.class),
                new org.springframework.core.task.SimpleAsyncTaskExecutor("ingest-"));

        int port = startTrackerPort(watchTarget(), ingest);
        try (Socket watch = new Socket("127.0.0.1", port)) {
            watch.setTcpNoDelay(true);
            // the frame arrives in two pieces: the sniffer sees only "[" first
            watch.getOutputStream().write(WATCH_LK, 0, 1);
            watch.getOutputStream().flush();
            Thread.sleep(100);
            watch.getOutputStream().write(WATCH_LK, 1, WATCH_LK.length - 1);
            watch.getOutputStream().flush();

            try (Socket relayed = watchServer.accept()) {
                relayed.setSoTimeout(3000);
                readLine(relayed.getInputStream());
                assertThat(readExactly(relayed.getInputStream(), WATCH_LK.length)).isEqualTo(WATCH_LK);
                relayed.getOutputStream().write(WATCH_LK_REPLY);
                relayed.getOutputStream().flush();
                watch.setSoTimeout(3000);
                assertThat(readExactly(watch.getInputStream(), WATCH_LK_REPLY.length)).isEqualTo(WATCH_LK_REPLY);
            }
            org.mockito.Mockito.verify(devices, org.mockito.Mockito.timeout(3000)).applyHeartbeatStatus("8800000015", null, 100, null);
        }
        assertThat(gt06.frames).isEmpty();
    }

    @Test
    void gt06TrackerIsUnchanged() throws Exception {
        int port = startTrackerPort(watchTarget());
        byte[] login = standardFrame(0x01, new byte[]{0x08, 0x68, 0x32, 0x20, 0x70, 0x07, (byte) 0x93, 0x70}, 1);
        try (Socket tracker = new Socket("127.0.0.1", port)) {
            tracker.getOutputStream().write(login);
            tracker.getOutputStream().write(login);
            tracker.getOutputStream().flush();
            assertThat(gt06.frames.poll(3, TimeUnit.SECONDS)).isEqualTo(login);
            assertThat(gt06.frames.poll(3, TimeUnit.SECONDS)).isEqualTo(login);
        }
        assertThat(noConnectionTo(watchServer)).isTrue();
    }

    @Test
    void gt06FrameSplitAcrossPacketsStillDecodes() throws Exception {
        int port = startTrackerPort(watchTarget());
        byte[] login = standardFrame(0x01, new byte[]{0x08, 0x68, 0x32, 0x20, 0x70, 0x07, (byte) 0x93, 0x70}, 2);
        try (Socket tracker = new Socket("127.0.0.1", port)) {
            tracker.setTcpNoDelay(true);
            tracker.getOutputStream().write(login, 0, 1);
            tracker.getOutputStream().flush();
            Thread.sleep(100);
            tracker.getOutputStream().write(login, 1, login.length - 1);
            tracker.getOutputStream().flush();
            assertThat(gt06.frames.poll(3, TimeUnit.SECONDS)).isEqualTo(login);
        }
    }

    @Test
    void withRelayOffWatchBytesAreIgnoredAsBefore() throws Exception {
        int port = startTrackerPort(null);
        byte[] login = standardFrame(0x01, new byte[]{0x08, 0x68, 0x32, 0x20, 0x70, 0x07, (byte) 0x93, 0x70}, 3);
        try (Socket s = new Socket("127.0.0.1", port)) {
            s.getOutputStream().write(WATCH_LK);
            s.getOutputStream().write(login);
            s.getOutputStream().flush();
            // the GT06 decoder skips the watch bytes and still finds the frame behind them
            assertThat(gt06.frames.poll(3, TimeUnit.SECONDS)).isEqualTo(login);
        }
        assertThat(noConnectionTo(watchServer)).isTrue();
    }

    @Test
    void watchIsDisconnectedWhenWatchServerIsDown() throws Exception {
        int deadPort = watchServer.getLocalPort();
        watchServer.close();
        int port = startTrackerPort(new WatchTarget("127.0.0.1", deadPort));
        try (Socket watch = new Socket("127.0.0.1", port)) {
            watch.setSoTimeout(5000);
            watch.getOutputStream().write(WATCH_LK);
            watch.getOutputStream().flush();
            assertThat(watch.getInputStream().read()).isEqualTo(-1);
        }
        assertThat(gt06.frames).isEmpty();
    }

    @Test
    void parsesWatchTarget() {
        assertThat(WatchTarget.parse("")).isNull();
        assertThat(WatchTarget.parse(null)).isNull();
        assertThat(WatchTarget.parse(" host.docker.internal:8899 ")).isEqualTo(new WatchTarget("host.docker.internal", 8899));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> WatchTarget.parse("8899"))
                .isInstanceOf(IllegalArgumentException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> WatchTarget.parse("host:0"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- helpers ----

    @Sharable
    static final class Capture extends ChannelInboundHandlerAdapter {
        final BlockingQueue<byte[]> frames = new LinkedBlockingQueue<>();

        @Override
        public void channelRead(ChannelHandlerContext ctx, Object msg) {
            ByteBuf b = (ByteBuf) msg;
            try {
                frames.add(ByteBufUtil.getBytes(b));
            } finally {
                b.release();
            }
        }
    }

    private static boolean noConnectionTo(ServerSocket ss) throws IOException {
        ss.setSoTimeout(300);
        try (Socket ignored = ss.accept()) {
            return false;
        } catch (SocketTimeoutException expected) {
            return true;
        }
    }

    private static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int prev = -1;
        int c;
        while ((c = in.read()) != -1) {
            if (prev == '\r' && c == '\n') {
                byte[] b = out.toByteArray();
                return new String(b, 0, b.length - 1, StandardCharsets.US_ASCII);
            }
            out.write(c);
            prev = c;
        }
        throw new IOException("stream ended before end of line");
    }

    private static byte[] readExactly(InputStream in, int n) throws IOException {
        byte[] b = in.readNBytes(n);
        if (b.length != n) throw new IOException("short read: " + b.length + " of " + n);
        return b;
    }

    private static byte[] standardFrame(int proto, byte[] content, int serial) {
        int payloadLen = 1 + content.length + 2 + 2;
        ByteBuffer bb = ByteBuffer.allocate(2 + 1 + payloadLen + 2);
        bb.put((byte) 0x78).put((byte) 0x78).put((byte) payloadLen).put((byte) proto).put(content).putShort((short) serial);
        int crc = ChecksumUtil.crcItu(bb.array(), 2, 1 + 1 + content.length + 2);
        bb.putShort((short) crc).put((byte) 0x0D).put((byte) 0x0A);
        return bb.array();
    }
}
