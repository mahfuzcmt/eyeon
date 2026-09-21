package com.webinnovation.motolink.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GoogleMapsKeyTest {

    private static final String GOOD = "AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBxY"; // 39 chars, documented sample shape

    @Test
    void acceptsWellFormedBrowserKey() {
        assertTrue(GoogleMapsKey.isValid(GOOD));
        assertEquals(39, GOOD.length());
    }

    @Test
    void rejectsWrongPrefixLengthOrCharacters() {
        assertFalse(GoogleMapsKey.isValid(null));
        assertFalse(GoogleMapsKey.isValid(""));
        assertFalse(GoogleMapsKey.isValid("BIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBxY"));
        assertFalse(GoogleMapsKey.isValid(GOOD.substring(0, 38)));
        assertFalse(GoogleMapsKey.isValid(GOOD + "x"));
        assertFalse(GoogleMapsKey.isValid("AIzaSyD 9tSrke72PouQMnMX-a7eZSW0jkFMBxY"));
        assertFalse(GoogleMapsKey.isValid("https://maps.googleapis.com/maps/api/js?key=" + GOOD));
    }

    @Test
    void normalizeTrimsAndMapsBlankToNull() {
        assertNull(GoogleMapsKey.normalize(null));
        assertNull(GoogleMapsKey.normalize("   "));
        assertEquals(GOOD, GoogleMapsKey.normalize("  " + GOOD + "\n"));
    }
}
