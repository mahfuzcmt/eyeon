package com.webinnovation.eyeon.repository;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** V33: a type the user was never offered gets the default, a type they switched off stays off. */
class NotificationKnownTypesTest {

    @Test
    void typeAddedAfterTheUserSavedIsOn() {
        Set<String> out = NotificationSettingsRepository.withUnseen(
                Set.of("SOS"), Set.of("SOS", "GEOFENCE_EXIT"), Set.of("SOS", "GEOFENCE_EXIT", "PLACE_ARRIVED"));
        assertThat(out).containsExactlyInAnyOrder("SOS", "PLACE_ARRIVED");
    }

    @Test
    void rowWithoutKnownTypesIsTakenAsStored() {
        assertThat(NotificationSettingsRepository.withUnseen(Set.of("SOS"), null, Set.of("SOS", "PLACE_ARRIVED")))
                .containsExactly("SOS");
    }
}
