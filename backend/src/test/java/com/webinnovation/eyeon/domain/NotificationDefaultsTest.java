package com.webinnovation.eyeon.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** What a carer hears before touching their notification settings. */
class NotificationDefaultsTest {

    @Test
    void safe_area_place_and_battery_events_are_audible_by_default() {
        for (String type : new String[] {"SOS", "GEOFENCE_EXIT", "GEOFENCE_ENTER", "PLACE_ARRIVED", "PLACE_LEFT", "LOW_BATTERY"}) {
            assertTrue(NotificationDefaults.SOUND.contains(type), type);
        }
    }

    @Test
    void ignition_events_stay_silent_and_do_not_pop_up() {
        assertFalse(NotificationDefaults.SOUND.contains("ACC_ON"));
        assertFalse(NotificationDefaults.POPUP.contains("ACC_OFF"));
    }
}
