package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.NotificationDefaults;
import com.webinnovation.motolink.domain.NotificationSettings;

import java.util.List;
import java.util.Set;

public final class NotificationDtos {

    private NotificationDtos() {}

    /** Effective settings for the caller plus the catalogue of alarm types the UI can offer. */
    public record NotificationSettingsView(
            Set<String> popupTypes,
            Set<String> soundTypes,
            Set<String> pushTypes,
            List<String> availableTypes,
            boolean customized
    ) {
        public static NotificationSettingsView of(NotificationSettings s) {
            return new NotificationSettingsView(s.popupTypes(), s.soundTypes(), s.pushTypes(),
                    List.copyOf(NotificationDefaults.ALL_TYPES), true);
        }

        public static NotificationSettingsView defaults() {
            return new NotificationSettingsView(NotificationDefaults.POPUP, NotificationDefaults.SOUND,
                    NotificationDefaults.PUSH, List.copyOf(NotificationDefaults.ALL_TYPES), false);
        }
    }

    /** Full replacement; each set may be empty (= never notify that way). */
    public record NotificationSettingsUpdate(
            Set<String> popupTypes,
            Set<String> soundTypes,
            Set<String> pushTypes
    ) {}
}
