package com.webinnovation.eyeon.domain.enums;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who is wearing the tracker; decides the map avatar. Stored in {@code devices.vehicle_type}
 * (the column name is inherited from the vehicle product; EyeOn tracks people).
 * Must match {@code PERSON_TYPES} in frontend/src/lib/personIcons.ts and the avatar code in
 * mobile/src/components/WebMap.tsx. Rows holding anything else (NULL, legacy CAR ...) are
 * drawn as PERSON by the clients, so no data migration is needed.
 */
public enum PersonType {
    BOY,
    GIRL,
    PERSON;

    public static final Set<String> NAMES =
            Arrays.stream(values()).map(Enum::name).collect(Collectors.toUnmodifiableSet());

    /** @return the canonical name, or null when {@code value} is not a person type */
    public static String canonical(String value) {
        if (value == null) return null;
        String v = value.trim().toUpperCase();
        return NAMES.contains(v) ? v : null;
    }
}
