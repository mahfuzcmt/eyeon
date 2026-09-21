package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * A shareable link that allows public access to a device's location.
 * Links have an expiration time and can be revoked.
 */
public record ShareLocationLink(
        UUID id,
        UUID orgId,
        String deviceImei,
        String token,
        String label,
        Instant expiresAt,
        boolean isActive,
        boolean showHistory,
        boolean allowRealtime,
        UUID createdBy,
        Instant createdAt,
        Instant lastAccessedAt,
        int accessCount
) {
    /**
     * Check if the link is currently valid (active and not expired).
     */
    public boolean isValid() {
        return isActive && expiresAt.isAfter(Instant.now());
    }

    /**
     * Check if the link has expired.
     */
    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }
}
