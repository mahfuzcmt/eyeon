package com.webinnovation.motolink.util;

import java.security.SecureRandom;

/** Helpers for the SMS one-time-code reset flow. */
public final class PasswordResetSupport {

    private static final SecureRandom RNG = new SecureRandom();

    private PasswordResetSupport() {}

    /** Six digits, zero-padded, from a CSPRNG — easy to type from an SMS. */
    public static String generateCode() {
        return String.format("%06d", RNG.nextInt(1_000_000));
    }

    /** "+8801712345678" → "+88017••••678"; anything too short becomes "••••". */
    public static String maskPhone(String msisdn) {
        if (msisdn == null) return "••••";
        String s = msisdn.trim();
        if (s.length() < 7) return "••••";
        return s.substring(0, 6) + "••••" + s.substring(s.length() - 3);
    }

    /** Bangladesh numbers as SSL Wireless wants them: 8801XXXXXXXXX (no +, no leading 0). */
    public static String normalizeBdMsisdn(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("[^0-9]", "");
        if (d.startsWith("880")) return d;
        if (d.startsWith("01") && d.length() == 11) return "88" + d;
        if (d.startsWith("1") && d.length() == 10) return "880" + d;
        return d.isEmpty() ? null : d;
    }
}
