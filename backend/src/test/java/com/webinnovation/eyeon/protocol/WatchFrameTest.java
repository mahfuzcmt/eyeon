package com.webinnovation.eyeon.protocol;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WatchFrameTest {

    private static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.ISO_8859_1);
    }

    @Test
    void readsCommandAndArgs() {
        List<WatchFrame> frames = new WatchFrame.Reader().feed(ascii("[3G*8800000015*000D*LK,50,100,100]"));
        assertThat(frames).hasSize(1);
        WatchFrame f = frames.get(0);
        assertThat(f.vendor()).isEqualTo("3G");
        assertThat(f.deviceId()).isEqualTo("8800000015");
        assertThat(f.command()).isEqualTo("LK");
        assertThat(f.args()).containsExactly("50", "100", "100");
    }

    @Test
    void bareCommandHasNoArgs() {
        WatchFrame f = new WatchFrame.Reader().feed(ascii("[3G*1378748302*000F*DEVPWDCHECKBIND]")).get(0);
        assertThat(f.command()).isEqualTo("DEVPWDCHECKBIND");
        assertThat(f.args()).isEmpty();
    }

    @Test
    void emptyFieldsAreKept() {
        // Wi-Fi entries come with an empty SSID: ",mac,rssi"
        WatchFrame f = new WatchFrame.Reader().feed(ascii("[3G*1378748302*000A*X,,aa,-77,]")).get(0);
        assertThat(f.args()).containsExactly("", "aa", "-77", "");
    }

    @Test
    void severalFramesInOneReadAndOneFrameAcrossReads() {
        WatchFrame.Reader reader = new WatchFrame.Reader();
        String lk = "[3G*8800000015*000D*LK,50,100,100]";
        String cs = "[CS*8800000015*0002*LK]";
        assertThat(reader.feed(ascii(lk + cs + lk.substring(0, 12)))).extracting(WatchFrame::vendor)
                .containsExactly("3G", "CS");
        assertThat(reader.feed(ascii(lk.substring(12, 20)))).isEmpty();
        assertThat(reader.feed(ascii(lk.substring(20)))).extracting(WatchFrame::content)
                .containsExactly("LK,50,100,100");
    }

    @Test
    void lengthDelimitsContentSoItMayHoldBrackets() {
        List<WatchFrame> frames = new WatchFrame.Reader().feed(ascii("[3G*8800000015*0008*TK,a]*[b][3G*8800000015*0002*LK]"));
        assertThat(frames).extracting(WatchFrame::content).containsExactly("TK,a]*[b", "LK");
    }

    @Test
    void garbageAndBrokenHeadersAreSkipped() {
        WatchFrame.Reader reader = new WatchFrame.Reader();
        List<WatchFrame> frames = new ArrayList<>();
        frames.addAll(reader.feed(ascii("GET / HTTP/1.1\r\n[not a frame][3G*88000000")));
        frames.addAll(reader.feed(ascii("15*00ZZ*LK][3G*8800000015*0002*LK]")));
        assertThat(frames).extracting(WatchFrame::content).containsExactly("LK");
    }

    @Test
    void endlessNonFrameDataDoesNotGrowTheBuffer() {
        WatchFrame.Reader reader = new WatchFrame.Reader();
        byte[] junk = ascii("[3G*8800000015*FFFF*" + "x".repeat(4000));
        for (int i = 0; i < 100; i++) {
            assertThat(reader.feed(junk)).isEmpty();
        }
        // still decodes once real frames follow
        assertThat(reader.feed(ascii("y".repeat(70_000) + "[3G*8800000015*0002*LK]")))
                .extracting(WatchFrame::content).contains("LK");
    }
}
