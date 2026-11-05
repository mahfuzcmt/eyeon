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
    public record RefreshTokenRow(UUID id, UUID userId, Instant expiresAt, Instant revokedAt, Instant rotatedAt,
                                  UUID replacedBy) {}

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
                    SELECT id, user_id, expires_at, revoked_at, rotated_at, replaced_by
                    FROM refresh_tokens WHERE token_hash = :hash
                    """, new MapSqlParameterSource("hash", tokenHash),
                    (rs, rn) -> new RefreshTokenRow(
                            rs.getObject("id", UUID.class),
                            rs.getObject("user_id", UUID.class),
                            rs.getObject("expires_at", java.time.OffsetDateTime.class).toInstant(),
                            instant(rs.getObject("revoked_at", java.time.OffsetDateTime.class)),
                            instant(rs.getObject("rotated_at", java.time.OffsetDateTime.class)),
                            rs.getObject("replaced_by", UUID.class)
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

    /**
     * Exchanged for a new pair: revoked, but still accepted within the rotation grace, and for as
     * long as {@code replacement} has not been used (V34).
     */
    public void markRotated(UUID id, UUID replacement) {
        jdbc.update("""
                UPDATE refresh_tokens
                   SET revoked_at = COALESCE(revoked_at, now()), rotated_at = COALESCE(rotated_at, now()),
                       replaced_by = :next
                 WHERE id = :id
                """, new MapSqlParameterSource("id", id).addValue("next", replacement));
    }

    /** True when the token exists, has never been exchanged or revoked, and has not expired. */
    public boolean isUnused(UUID id) {
        Boolean b = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM refresh_tokens WHERE id = :id AND revoked_at IS NULL AND expires_at > now())",
                new MapSqlParameterSource("id", id), Boolean.class);
        return Boolean.TRUE.equals(b);
    }

    public void revoke(UUID id) {
        jdbc.update(
                "UPDATE refresh_tokens SET revoked_at = now() WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }
}
