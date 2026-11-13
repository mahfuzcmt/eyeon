package com.webinnovation.eyeon.protocol;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Payloads captured from a HongMi 4G watch (id 1378748302) on production, 2026-11-12/13. */
public class WatchReportTest {

    /** Outdoors: GPS fix, 5 satellites, one LTE cell, 5 access points. */
    public static final String FIX = "UD_LTE,121126,043305,A,23.752181,N,90.3841902,E,4.11,340.6,0.0,5,83,50,0,0,00000000,"
            + "1,0,470,1,56263,25761547,164,5,,C8:3A:35:D7:EA:C8,-60,,78:8C:B5:2B:89:27,-68,,5C:62:8B:DF:96:60,-77,"
            + ",80:9F:E4:B8:50:78,-78,,CC:2D:21:44:3B:21,-78,0.0";
    /** Indoors: no fix, the last fix repeated as coordinates. */
    public static final String NO_FIX = "UD_LTE,121126,060753,V,23.752181,N,90.3841902,E,0.00,0.0,0.0,0,77,37,0,0,00000000,"
            + "1,0,470,3,1166,3494914,158,3,,DC:8E:8D:BA:AB:F8,-68,,0C:80:63:0A:52:BE,-78,,78:20:51:4B:04:7E,-82,0.0";
    /** Low battery alarm at 19 %, no fix. */
    public static final String LOW_BATTERY = "AL_LTE,121126,202746,V,23.752181,N,90.3841902,E,0.00,0.0,0.0,0,61,19,0,0,00020001,"
            + "1,0,470,3,1164,3234563,149,5,,34:E8:94:5C:81:A1,-74,,24:7E:51:8B:45:44,-77,,5C:92:5E:74:50:D8,-82,"
            + ",F0:B4:D2:1C:6B:D7,-86,,10:62:EB:1E:27:A9,-89,0.0";

    public static WatchReport parse(String content) {
        WatchFrame f = new WatchFrame("3G", "1378748302", content);
        return WatchReport.parse(f.command(), f.args());
    }

    @Test
    void gpsFix() {
        WatchReport r = parse(FIX);
        assertThat(r.ts()).isEqualTo(Instant.parse("2026-11-12T04:33:05Z"));
        assertThat(r.valid()).isTrue();
        assertThat(r.latitude()).isEqualTo(23.752181);
        assertThat(r.longitude()).isEqualTo(90.3841902);
        assertThat(r.speedKmh()).isEqualTo(4.11);
        assertThat(r.course()).isEqualTo(340.6);
        assertThat(r.satellites()).isEqualTo(5);
        assertThat(r.gsm()).isEqualTo(83);
        assertThat(r.battery()).isEqualTo(50);
        assertThat(r.sos()).isFalse();
        assertThat(r.lowBattery()).isFalse();
    }

    @Test
    void cellsAndAccessPointsOfAReportWithoutFix() {
        WatchReport r = parse(NO_FIX);
        assertThat(r.valid()).isFalse();
        assertThat(r.mcc()).isEqualTo(470);
        assertThat(r.mnc()).isEqualTo(3);
        assertThat(r.radio()).isEqualTo("lte");
        assertThat(r.cells()).containsExactly(new NetworkScan.Cell(1166, 3494914, 158));
        assertThat(r.wifi()).containsExactly(
                new NetworkScan.Wifi("dc:8e:8d:ba:ab:f8", -68),
                new NetworkScan.Wifi("0c:80:63:0a:52:be", -78),
                new NetworkScan.Wifi("78:20:51:4b:04:7e", -82));
        assertThat(r.hasScan()).isTrue();
        NetworkScan scan = r.scan(r.ts());
        assertThat(scan.hasWifi()).isTrue();
        assertThat(scan.ts()).isEqualTo(Instant.parse("2026-11-12T06:07:53Z"));
    }

    @Test
    void lowBatteryAlarmBit() {
        WatchReport r = parse(LOW_BATTERY);
        assertThat(r.lowBattery()).isTrue();
        assertThat(r.sos()).isFalse();
        assertThat(r.battery()).isEqualTo(19);
        assertThat(r.wifi()).hasSize(5);
    }

    @Test
    void sosBitAndSouthWest() {
        WatchReport r = parse("AL,180916,025723,A,22.570733,S,113.8626083,W,0.00,249.5,0.0,6,100,60,0,0,00010000,0,0,40.7");
        assertThat(r.sos()).isTrue();
        assertThat(r.latitude()).isEqualTo(-22.570733);
        assertThat(r.longitude()).isEqualTo(-113.8626083);
        assertThat(r.hasScan()).isFalse();
        assertThat(r.radio()).isEqualTo("gsm");
    }

    @Test
    void aDamagedTailKeepsWhatCameBeforeIt() {
        // the vendor document's own example has malformed MAC addresses and a cut-off list
        WatchReport r = parse("UD,120118,070625,A,22.570720,N,113.8620167,E,0.00,188.6,0.0,9,100,51,14188,0,00000010,"
                + "2,255,460,0,9360,5081,156,9360,4081,129,3,x,a0:c5:f2:b0:7.4:d0,-34,y,92:76:9f:48:4f:20,-48,z,38:37:8b");
        assertThat(r.cells()).hasSize(2);
        assertThat(r.radio()).isEqualTo("gsm");
        assertThat(r.wifi()).containsExactly(new NetworkScan.Wifi("92:76:9f:48:4f:20", -48));
    }

    @Test
    void aReportWithoutItsFixedFieldsIsRejected() {
        assertThatThrownBy(() -> parse("UD,1")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parse("UD,121126,0433,A,x,N,90.3,E,0,0,0,5,83,50,0,0,00000000"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
