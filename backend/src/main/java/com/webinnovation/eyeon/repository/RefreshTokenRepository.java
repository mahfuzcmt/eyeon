package com.webinnovation.eyeon.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /** {@code rotatedAt} is set when the token was revoked by being exchanged for a new pair. */
    public record RefreshTokenRow(UUID id, UUID userId, Instant expiresAt, Instant revokedAt, Instant rotatedAt) {}

    public UUID create(UUID userId, String tokenHash, Instant expiresAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
                VALUES (:id, :userId, :hash, :expiresAt)
                """, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("userId", userId)
                .addValue("hash", tokenHash)
                .addValue("expiresAt", Timestamp.from(expiresAt)));
        return id;
    }

    public Optional<RefreshTokenRow> findByHash(String tokenHash) {
        try {
            var row = jdbc.queryForObject("""
                    SELECT id, user_id, expires_at, revoked_at, rotated_at
                    FROM refresh_tokens WHERE token_hash = :hash
                    """, new MapSqlParameterSource("hash", tokenHash),
                    (rs, rn) -> new RefreshTokenRow(
                            rs.getObject("id", UUID.class),
                            rs.getObject("user_id", UUID.class),
                            rs.getObject("expires_at", java.time.OffsetDateTime.class).toInstant(),
                            instant(rs.getObject("revoked_at", java.time.OffsetDateTime.class)),
                            instant(rs.getObject("rotated_at", java.time.OffsetDateTime.class))
                    ));
            return Optional.ofNullable(row);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    private static Instant instant(java.time.OffsetDateTime t) {
        return t == null ? null : t.toInstant();
    }

    /**
     * Password changed / reset: every other session must sign in again. Also clears
     * {@code rotated_at}, so a just-rotated token cannot use the rotation grace afterwards.
     */
    public int revokeAllForUser(UUID userId) {
        return jdbc.update("""
                UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now()), rotated_at = NULL
                WHERE user_id = :userId AND (revoked_at IS NULL OR rotated_at IS NOT NULL)
                """, new MapSqlParameterSource("userId", userId));
    }

    /** Exchanged for a new pair: revoked, but still accepted within the rotation grace. */
    public void markRotated(UUID id) {
        jdbc.update(
                "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now()), rotated_at = COALESCE(rotated_at, now()) WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }

    public void revoke(UUID id) {
        jdbc.update(
                "UPDATE refresh_tokens SET revoked_at = now() WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }
}
