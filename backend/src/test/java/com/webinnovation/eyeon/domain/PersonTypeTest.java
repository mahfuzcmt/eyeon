package com.webinnovation.eyeon.domain;

import com.webinnovation.eyeon.domain.enums.PersonType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class PersonTypeTest {

    @Test
    void accepts_person_types_in_any_case() {
        assertEquals("BOY", PersonType.canonical("BOY"));
        assertEquals("GIRL", PersonType.canonical(" girl "));
        assertEquals("PERSON", PersonType.canonical("Person"));
    }

    @Test
    void rejects_the_inherited_vehicle_types() {
        // The edit form used to fail with "vehicleType must be one of [CAR, MOTORBIKE ...]"
        // because the server still validated against vehicles after the UI moved to people.
        for (String legacy : new String[] {"CAR", "MOTORBIKE", "TRUCK", "CNG", "BUS", "MICROBUS"}) {
            assertNull(PersonType.canonical(legacy), legacy);
        }
        assertNull(PersonType.canonical(null));
        assertNull(PersonType.canonical(""));
    }
}
