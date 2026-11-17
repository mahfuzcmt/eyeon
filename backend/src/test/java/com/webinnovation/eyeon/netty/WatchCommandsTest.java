package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.protocol.WatchFrame;
import io.netty.buffer.ByteBuf;
import io.netty.channel.embedded.EmbeddedChannel;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

class WatchCommandsTest {

    private static final String IMEI = "355913787483028";
    private static final String WATCH_ID = "1378748302";

    @Test
    void frameCarriesTheContentLengthInHex() {
        // the frame the watch answered on production, 2026-11-17
        assertThat(WatchCommands.frame("3G", WATCH_ID, "LZ,0,6")).isEqualTo("[3G*1378748302*0006*LZ,0,6]");
        assertThat(WatchCommands.frame("3G", WATCH_ID, "LZ,10,-11")).isEqualTo("[3G*1378748302*0009*LZ,10,-11]");
    }

    @Test
    void commandIsWrittenToTheWatchAndItsEchoCompletesTheReply() {
        WatchCommands commands = new WatchCommands();
        EmbeddedChannel watch = new EmbeddedChannel();
        commands.attach(IMEI, WATCH_ID, "3G", watch);

        CompletableFuture<String> reply = commands.send(IMEI, "LZ,0,6");

        ByteBuf written = watch.readOutbound();
        assertThat(written.toString(StandardCharsets.ISO_8859_1)).isEqualTo("[3G*1378748302*0006*LZ,0,6]");
        written.release();
        assertThat(reply).isNotDone();

        commands.onFrame(IMEI, new WatchFrame("3G", WATCH_ID, "CR"));       // someone else's answer
        assertThat(reply).isNotDone();
        commands.onFrame(IMEI, new WatchFrame("3G", WATCH_ID, "LZ"));
        assertThat(reply).isCompletedWithValue("LZ");
    }

    @Test
    void nothingIsSentWithoutAConnection() {
        WatchCommands commands = new WatchCommands();
        assertThat(commands.connected(IMEI)).isFalse();
        assertThat(commands.send(IMEI, "LZ,0,6")).isCompletedExceptionally();

        EmbeddedChannel watch = new EmbeddedChannel();
        commands.attach(IMEI, WATCH_ID, "3G", watch);
        assertThat(commands.connected(IMEI)).isTrue();
        watch.close();
        assertThat(commands.connected(IMEI)).isFalse();
        assertThat(commands.send(IMEI, "LZ,0,6")).isCompletedExceptionally();
    }

    @Test
    void closingAnOldConnectionDoesNotForgetTheNewOne() {
        WatchCommands commands = new WatchCommands();
        EmbeddedChannel old = new EmbeddedChannel();
        EmbeddedChannel current = new EmbeddedChannel();
        commands.attach(IMEI, WATCH_ID, "3G", old);
        commands.attach(IMEI, WATCH_ID, "3G", current);   // the watch reconnected; the old one lingers
        commands.detach(IMEI, old);
        assertThat(commands.connected(IMEI)).isTrue();
        commands.detach(IMEI, current);
        assertThat(commands.connected(IMEI)).isFalse();
    }
}
