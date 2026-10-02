package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The answers are the ones the production PL601 sent on 2026-10-02 (docs/PL601_SETTINGS.md);
 * the commands are the ones its manual documents.
 */
class TrackerSettingTest {

    private static Map<String, Object> map(Object... kv) {
        return TrackerSetting.map(kv);
    }

    @Test
    void reads_every_setting_from_the_trackers_real_answers() {
        assertEquals(map("numbers", List.of()), TrackerSetting.SOS_NUMBERS.parse("SOS Number:1:; 2:; 3:; 4:"));
        assertEquals(map("numbers", List.of("01712345678", "+8801812345678")),
                TrackerSetting.SOS_NUMBERS.parse("setting OK.\nSOS Number:1:01712345678; 2:+8801812345678; 3:; 4:"));
        assertEquals(map("enabled", true, "method", 0, "extra", 1),
                TrackerSetting.SOS_ALARM.parse("SOS HelpSwitch:ON,Report Mode:0,1"));
        assertEquals(map("who", 2), TrackerSetting.CALL_PERMISSION.parse("MONPERMIT:2"));
        assertEquals(map("auto", false), TrackerSetting.ANSWER_MODE.parse("ANSWER:0"));
        assertEquals(map("level", 5), TrackerSetting.CALL_VOLUME.parse("call  volume:5"));
        assertEquals(map("level", 4), TrackerSetting.RING_VOLUME.parse("ring volume:4"));
        assertEquals(map("minutes", 7), TrackerSetting.HEARTBEAT.parse("Heartbeat Interval,T1:7 Minute(s)"));
        assertEquals(map("mode", 2, "moving", 10, "still", 300), TrackerSetting.REPORTING.parse("Mode:2,10,300,1,1,1,1"));
        assertEquals(map("mode", 4, "steps", 100, "idleWait", 300, "accel", 10, "riding", 300),
                TrackerSetting.REPORTING.parse("Mode:4,100,300,10,300,1,1,1,1"));
        assertEquals(map("mode", 1, "interval", 1800), TrackerSetting.REPORTING.parse("setting OK.Mode:1,1800,1,1,1"));
        assertEquals(map("enabled", true, "from", "00:00", "to", "07:00", "mode", 2),
                TrackerSetting.NIGHT_REST.parse("FLY:ON,00:00-07:00,2"));
        assertEquals(map("enabled", false, "from", "00:00", "to", "07:00"),
                TrackerSetting.QUIET_HOURS.parse("SILENTPERIOD:OFF,00:00,07:00"));
        assertEquals(map("enabled", true, "method", 0, "led", 1, "sound", 2), TrackerSetting.LOW_BATTERY_ALARM.parse(
                "Low Battery Alarm Switch:ON,Report Mode:0,led reminder mode:1,ring reminder mode:2"));
        assertEquals(map("enabled", false, "method", 0, "immobileSeconds", 30, "muteMinutes", 3),
                TrackerSetting.FALL_ALARM.parse("DROPALM:OFF,0,30,3"));
        assertEquals(map("enabled", false), TrackerSetting.POWER_OFF_LOCK.parse("Pwrlimit switch Switch:OFF"));
        assertEquals(map("enabled", true), TrackerSetting.AUTO_POWER_ON.parse("AUTOSTART:ON"));
    }

    @Test
    void an_answer_that_is_not_about_the_setting_is_not_understood() {
        for (TrackerSetting s : TrackerSetting.values()) {
            assertNull(s.parse("Invalid command"), s.name());
        }
    }

    @Test
    void sos_numbers_are_cleaned_checked_and_written_after_clearing_the_list() {
        Map<String, Object> v = TrackerSetting.SOS_NUMBERS.normalize(
                map("numbers", List.of("017 1234-5678", "", "+8801812345678", "01712345678")), null);
        assertEquals(List.of("01712345678", "+8801812345678"), v.get("numbers"));
        assertEquals(List.of("SOS,D,1,2,3,4#", "SOS,A,01712345678,+8801812345678#"), TrackerSetting.SOS_NUMBERS.commands(v));

        assertEquals(List.of("SOS,D,1,2,3,4#"),
                TrackerSetting.SOS_NUMBERS.commands(TrackerSetting.SOS_NUMBERS.normalize(map("numbers", List.of()), null)));
        assertThrows(IllegalArgumentException.class,
                () -> TrackerSetting.SOS_NUMBERS.normalize(map("numbers", List.of("call mum")), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.SOS_NUMBERS.normalize(
                map("numbers", List.of("0171000001", "0171000002", "0171000003", "0171000004", "0171000005")), null));
    }

    @Test
    void a_partial_change_keeps_what_the_tracker_already_has() {
        Map<String, Object> current = map("enabled", true, "method", 0, "extra", 1);
        Map<String, Object> v = TrackerSetting.SOS_ALARM.normalize(map("method", 2), current);
        assertEquals(map("enabled", true, "method", 2, "extra", 1), v);
        assertEquals(List.of("SOSALM,ON,2,1#"), TrackerSetting.SOS_ALARM.commands(v));

        Map<String, Object> battery = TrackerSetting.LOW_BATTERY_ALARM.normalize(map("method", 1),
                map("enabled", true, "method", 0, "led", 1, "sound", 2));
        assertEquals(List.of("BATALM,ON,1,1,2#"), TrackerSetting.LOW_BATTERY_ALARM.commands(battery));
    }

    @Test
    void reporting_modes_are_written_with_data_and_positioning_always_on() {
        assertEquals(List.of("MODE,2,10,300,1,1,1,1#"), TrackerSetting.REPORTING.commands(
                TrackerSetting.REPORTING.normalize(map("mode", 2, "moving", 10, "still", 300), null)));
        assertEquals(List.of("MODE,4,100,300,10,300,1,1,1,1#"), TrackerSetting.REPORTING.commands(
                TrackerSetting.REPORTING.normalize(map("mode", 4), null)));
        assertEquals(List.of("MODE,1,600,1,1,1#"), TrackerSetting.REPORTING.commands(
                TrackerSetting.REPORTING.normalize(map("mode", 1, "interval", 600), null)));

        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.REPORTING.normalize(map("mode", 2, "moving", 5, "still", 300), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.REPORTING.normalize(map("mode", 2, "moving", 10, "still", 60), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.REPORTING.normalize(map("mode", 3), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.REPORTING.normalize(map("mode", 4, "steps", 105), null));
    }

    @Test
    void the_other_commands_are_the_documented_ones() {
        assertEquals(List.of("FLY,ON,23:00-06:00,2#"), TrackerSetting.NIGHT_REST.commands(
                TrackerSetting.NIGHT_REST.normalize(map("enabled", true, "from", "23:00", "to", "06:00"), null)));
        assertEquals(List.of("FLY,OFF,00:00-07:00,2#"), TrackerSetting.NIGHT_REST.commands(
                TrackerSetting.NIGHT_REST.normalize(map("enabled", false), map("enabled", true, "from", "00:00", "to", "07:00", "mode", 2))));
        assertEquals(List.of("SILENTPERIOD,ON,08:00,13:30#"), TrackerSetting.QUIET_HOURS.commands(
                TrackerSetting.QUIET_HOURS.normalize(map("enabled", true, "from", "08:00", "to", "13:30"), null)));
        assertEquals(List.of("DROPALM,ON,2,60,10#"), TrackerSetting.FALL_ALARM.commands(
                TrackerSetting.FALL_ALARM.normalize(map("enabled", true, "method", 2, "immobileSeconds", 60, "muteMinutes", 10), null)));
        assertEquals(List.of("MONPERMIT,3#"), TrackerSetting.CALL_PERMISSION.commands(map("who", 3)));
        assertEquals(List.of("ANSWER,1#"), TrackerSetting.ANSWER_MODE.commands(map("auto", true)));
        assertEquals(List.of("CALLVOL,7#"), TrackerSetting.CALL_VOLUME.commands(map("level", 7)));
        assertEquals(List.of("RINGVOL,2#"), TrackerSetting.RING_VOLUME.commands(map("level", 2)));
        assertEquals(List.of("HBT,5#"), TrackerSetting.HEARTBEAT.commands(map("minutes", 5)));
        assertEquals(List.of("PWRLIMIT,ON#"), TrackerSetting.POWER_OFF_LOCK.commands(map("enabled", true)));
        assertEquals(List.of("AUTOSTART,OFF#"), TrackerSetting.AUTO_POWER_ON.commands(map("enabled", false)));
    }

    @Test
    void values_outside_the_trackers_limits_are_refused() {
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.HEARTBEAT.normalize(map("minutes", 30), null),
                "the server calls a tracker offline after 10 silent minutes");
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.CALL_VOLUME.normalize(map("level", 9), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.CALL_PERMISSION.normalize(map("who", 1), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.NIGHT_REST.normalize(map("enabled", true, "from", "07:00", "to", "07:00"), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.NIGHT_REST.normalize(map("enabled", true, "from", "late", "to", "07:00"), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.FALL_ALARM.normalize(map("enabled", true, "immobileSeconds", 5), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.POWER_OFF_LOCK.normalize(map("enabled", "yes"), null));
        assertThrows(IllegalArgumentException.class, () -> TrackerSetting.of("SERVER"));
    }

    @Test
    void written_means_the_tracker_reports_it_back() {
        Map<String, Object> wanted = map("enabled", true, "from", "23:00", "to", "06:00", "mode", 2);
        assertTrue(TrackerSetting.NIGHT_REST.matches(wanted, map("enabled", true, "from", "23:00", "to", "06:00", "mode", 1)));
        assertFalse(TrackerSetting.NIGHT_REST.matches(wanted, map("enabled", true, "from", "00:00", "to", "07:00", "mode", 2)));
        assertFalse(TrackerSetting.NIGHT_REST.matches(wanted, null));
        // Switched off is enough: the tracker may keep or reset the other fields.
        assertTrue(TrackerSetting.FALL_ALARM.matches(map("enabled", false, "method", 2, "immobileSeconds", 60, "muteMinutes", 10),
                map("enabled", false, "method", 0, "immobileSeconds", 30, "muteMinutes", 3)));
        assertFalse(TrackerSetting.SOS_NUMBERS.matches(map("numbers", List.of("01712345678")), map("numbers", List.of())));
    }
}
