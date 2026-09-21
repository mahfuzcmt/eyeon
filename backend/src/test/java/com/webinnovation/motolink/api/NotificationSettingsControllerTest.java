package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.NotificationDefaults;
import com.webinnovation.motolink.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationSettingsControllerTest {

    @Test
    void defaultsNeverPopUpIgnitionButAlwaysPushEverything() {
        assertFalse(NotificationDefaults.POPUP.contains("ACC_ON"));
        assertFalse(NotificationDefaults.POPUP.contains("ACC_OFF"));
        assertTrue(NotificationDefaults.POPUP.contains("SOS"));
        assertTrue(NotificationDefaults.SOUND.contains("SOS"));
        assertFalse(NotificationDefaults.SOUND.contains("OVERSPEED"));
        assertEquals(NotificationDefaults.ALL_TYPES, NotificationDefaults.PUSH);
    }

    @Test
    void cleanNormalizesNullAndRejectsUnknownTypes() {
        assertTrue(NotificationSettingsController.clean(null, "popupTypes").isEmpty());
        assertEquals(Set.of("SOS", "SHOCK"),
                NotificationSettingsController.clean(Set.of("SOS", "SHOCK"), "popupTypes"));
        DomainException ex = assertThrows(DomainException.class,
                () -> NotificationSettingsController.clean(Set.of("SOS", "BANANA"), "soundTypes"));
        assertTrue(ex.getMessage().contains("BANANA"));
    }
}
