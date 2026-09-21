package com.webinnovation.motolink.domain;

import com.webinnovation.motolink.domain.enums.AlarmType;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * What a user gets before they touch their notification settings. Ignition
 * on/off is informational and would nag all day, so it never pops up by
 * default; only the "someone is stealing / crashing the vehicle" class of
 * alarm makes noise; push keeps the pre-V15 behaviour (every non-INFO alarm).
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
            AlarmType.REMOVE, AlarmType.SHOCK));

    public static final Set<String> PUSH = ALL_TYPES;

    public static boolean isKnownType(String name) {
        return name != null && ALL_TYPES.contains(name);
    }

    private static Set<String> names(Set<AlarmType> types) {
        return types.stream().map(Enum::name).collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
