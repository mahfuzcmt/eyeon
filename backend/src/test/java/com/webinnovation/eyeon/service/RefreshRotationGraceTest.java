package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.repository.RefreshTokenRepository.RefreshTokenRow;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshRotationGraceTest {

    private static final Instant NOW = Instant.parse("2026-11-01T10:00:00Z");

    private static RefreshTokenRow row(Instant revokedAt, Instant rotatedAt) {
        return new RefreshTokenRow(UUID.randomUUID(), UUID.randomUUID(), NOW.plusSeconds(86_400), revokedAt, rotatedAt);
    }

    @Test
    void justRotatedTokenIsStillAccepted() {
        Instant t = NOW.minusSeconds(30);
        assertThat(AuthService.withinRotationGrace(row(t, t), NOW)).isTrue();
    }

    @Test
    void rotatedLongAgoIsRefused() {
        Instant t = NOW.minus(AuthService.ROTATION_GRACE).minusSeconds(1);
        assertThat(AuthService.withinRotationGrace(row(t, t), NOW)).isFalse();
    }

    @Test
    void revokedByPasswordChangeIsRefusedAtOnce() {
        // revokeAllForUser sets revoked_at and clears rotated_at
        assertThat(AuthService.withinRotationGrace(row(NOW.minusSeconds(5), null), NOW)).isFalse();
    }
}
