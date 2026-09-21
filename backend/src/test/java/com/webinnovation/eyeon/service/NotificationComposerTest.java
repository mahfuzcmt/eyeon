package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Alarm;
import com.webinnovation.eyeon.service.NotificationComposer.Lang;
import com.webinnovation.eyeon.service.NotificationComposer.Message;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationComposerTest {

    private final NotificationComposer composer = new NotificationComposer();

    /** 02:02 UTC = 08:02 in Dhaka. */
    private static final Instant MORNING = Instant.parse("2026-09-21T02:02:00Z");

    private static Alarm alarm(String type, String severity, Instant ts, Map<String, Object> meta) {
        return new Alarm(UUID.randomUUID(), UUID.randomUUID(), "864290061234567", type, severity,
                ts, 23.8103, 90.4125, false, null, null, null, null, meta, Instant.now());
    }

    @Test
    void arrived_in_bengali_names_the_person_place_and_dhaka_time() {
        Message m = composer.compose(
                alarm("PLACE_ARRIVED", "INFO", MORNING, Map.of("geofenceName", "স্কুল")), "রাফি", Lang.BN);
        assertEquals("📍 রাফি এখন স্কুল-এ", m.title());
        assertEquals("পৌঁছানোর সময়: সকাল ৮:০২", m.body());
        assertEquals(NotificationComposer.CHANNEL_ARRIVALS, m.channelId());
    }

    @Test
    void arrived_in_english() {
        Message m = composer.compose(
                alarm("PLACE_ARRIVED", "INFO", MORNING, Map.of("geofenceName", "School")), "Rafi", Lang.EN);
        assertEquals("📍 Rafi reached School", m.title());
        assertEquals("Arrived at 8:02 AM", m.body());
    }

    @Test
    void left_uses_the_calm_channel_in_both_languages() {
        Instant afternoon = Instant.parse("2026-09-21T08:31:00Z"); // 14:31 Dhaka
        Message bn = composer.compose(
                alarm("PLACE_LEFT", "INFO", afternoon, Map.of("geofenceName", "স্কুল")), "রাফি", Lang.BN);
        assertEquals("🚶 রাফি আর স্কুল-এ নেই", bn.title());
        assertEquals("বের হওয়ার সময়: দুপুর ২:৩১", bn.body());
        assertEquals(NotificationComposer.CHANNEL_ARRIVALS, bn.channelId());

        Message en = composer.compose(
                alarm("PLACE_LEFT", "INFO", afternoon, Map.of("geofenceName", "School")), "Rafi", Lang.EN);
        assertEquals("🚶 Rafi left School", en.title());
        assertEquals("Left at 2:31 PM", en.body());
    }

    @Test
    void boundary_exit_is_an_alarm_and_names_the_zone() {
        Message m = composer.compose(
                alarm("GEOFENCE_EXIT", "WARNING", MORNING, Map.of("geofenceName", "Dhanmondi")), "Dadu", Lang.EN);
        assertEquals("⚠️ Dadu is outside the safe area", m.title());
        assertTrue(m.body().startsWith("Dhanmondi · 8:02 AM"));
        assertEquals(NotificationComposer.CHANNEL_ALARMS, m.channelId());
    }

    @Test
    void missing_place_name_still_reads_as_a_sentence() {
        Message m = composer.compose(alarm("PLACE_ARRIVED", "INFO", MORNING, Map.of()), "Rafi", Lang.EN);
        assertEquals("📍 Rafi reached a saved place", m.title());
    }

    @Test
    void sos_is_never_worded_as_a_vehicle_alarm() {
        Message m = composer.compose(alarm("SOS", "CRITICAL", MORNING, Map.of()), "রাফি", Lang.BN);
        assertTrue(m.title().startsWith("🚨 SOS!"));
        assertFalse(m.body().toLowerCase().contains("vehicle"));
    }

    @Test
    void unknown_types_fall_back_to_a_generic_message() {
        Message m = composer.compose(alarm("POWER_CUT", "CRITICAL", MORNING, null), "Bike", Lang.EN);
        assertEquals("🚨 POWER CUT — Bike", m.title());
        assertEquals("8:02 AM · Tap for details", m.body());
    }

    @Test
    void midnight_and_noon_use_twelve_not_zero() {
        assertEquals("12:05 AM", NotificationComposer.formatTime(Instant.parse("2026-09-20T18:05:00Z"), Lang.EN));
        assertEquals("দুপুর ১২:০০", NotificationComposer.formatTime(Instant.parse("2026-09-21T06:00:00Z"), Lang.BN));
    }

    @Test
    void language_defaults_to_bengali() {
        assertEquals(Lang.BN, Lang.of(null));
        assertEquals(Lang.BN, Lang.of("bn-BD"));
        assertEquals(Lang.EN, Lang.of("en"));
        assertEquals(Lang.EN, Lang.of("en-US"));
    }
}
