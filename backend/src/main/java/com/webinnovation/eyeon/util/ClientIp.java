package com.webinnovation.eyeon.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * The address of the caller as seen by our own proxy, for rate limits.
 *
 * <p>nginx sets {@code X-Real-IP} to the socket address and <em>appends</em> that address to
 * whatever {@code X-Forwarded-For} the client sent. So the first X-Forwarded-For entry is chosen
 * by the caller and must not be used to limit them; X-Real-IP, or the last entry, is ours.
 */
public final class ClientIp {

    private ClientIp() {}

    /** @return the caller's address, or null when there is no request */
    public static String of(HttpServletRequest req) {
        if (req == null) return null;
        String real = req.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) return real.trim();
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String last = xff.substring(xff.lastIndexOf(',') + 1).trim();
            if (!last.isEmpty()) return last;
        }
        return req.getRemoteAddr();
    }
}
