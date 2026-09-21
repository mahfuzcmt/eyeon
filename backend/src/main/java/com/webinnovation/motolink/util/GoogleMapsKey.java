package com.webinnovation.motolink.util;

import java.util.regex.Pattern;

/**
 * Shape check for Google Cloud browser API keys ("AIza" + 35 URL-safe chars).
 * We cannot verify a key server-side without spending quota, so this only
 * catches pasted garbage (a URL, a key with spaces, an OAuth client id, ...).
 */
public final class GoogleMapsKey {

    private static final Pattern SHAPE = Pattern.compile("^AIza[0-9A-Za-z_-]{35}$");

    private GoogleMapsKey() {}

    public static boolean isValid(String key) {
        return key != null && SHAPE.matcher(key).matches();
    }

    /** Trims; returns null for null/blank input so callers can "clear" with "". */
    public static String normalize(String key) {
        if (key == null) return null;
        String t = key.trim();
        return t.isEmpty() ? null : t;
    }
}
