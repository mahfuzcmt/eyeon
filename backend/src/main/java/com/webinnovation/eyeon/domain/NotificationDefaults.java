package com.webinnovation.eyeon.domain;

import com.webinnovation.eyeon.domain.enums.AlarmType;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * What a user gets before they touch their notification settings. Ignition
 * on/off is informational and would nag all day, so it never pops up by
 * default; emergencies, safe-area and place events and low battery make a
 * sound; push keeps the pre-V15 behaviour (every non-INFO alarm, plus the
 * place and back-in-safe-area events).
 */
public final class NotificationDefaults {

    private NotificationDefaults() {}

    public static final Set<String> ALL_TYPES = Arrays.stream(AlarmType.values())
            .map(Enum::name)
            .collect(Collectors.toCollection(LinkedHashSet::new));

    public static final Set<String> POPUP = names(EnumSet.complementOf(
            EnumSet.of(AlarmType.ACC_ON, AlarmType.ACC_OFF)));

    public static final Set<String> SOUND = names(EnumSet.of(
            AlarmType.SOS, AlarmType.COLLISION, AlarmType.POWER_CUT,
            AlarmType.REMOVE, AlarmType.SHOCK,
            // Family safety (2026-10-02): what a carer listens for. Each severity has its own
            // tone on the dashboard: leaving the safe area warns, the rest is a soft chime.
            AlarmType.GEOFENCE_EXIT, AlarmType.GEOFENCE_ENTER,
            AlarmType.PLACE_ARRIVED, AlarmType.PLACE_LEFT, AlarmType.LOW_BATTERY,
            AlarmType.NOT_ARRIVED, AlarmType.NOT_LEFT, AlarmType.CHARGE_REMINDER,
            AlarmType.ARRIVED_ON_TIME, AlarmType.LEFT_ON_TIME, AlarmType.ARRIVED_LATE, AlarmType.LEFT_LATE));

    public static final Set<String> PUSH = ALL_TYPES;

    public static boolean isKnownType(String name) {
        return name != null && ALL_TYPES.contains(name);
    }

    private static Set<String> names(Set<AlarmType> types) {
        return types.stream().map(Enum::name).collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
