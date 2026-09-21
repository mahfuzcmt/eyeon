package com.webinnovation.motolink.repository;

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

    public record RefreshTokenRow(UUID id, UUID userId, Instant expiresAt, Instant revokedAt) {}

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
                    SELECT id, user_id, expires_at, revoked_at
                    FROM refresh_tokens WHERE token_hash = :hash
                    """, new MapSqlParameterSource("hash", tokenHash),
                    (rs, rn) -> new RefreshTokenRow(
                            rs.getObject("id", UUID.class),
                            rs.getObject("user_id", UUID.class),
                            rs.getObject("expires_at", java.time.OffsetDateTime.class).toInstant(),
                            rs.getObject("revoked_at", java.time.OffsetDateTime.class) == null
                                    ? null
                                    : rs.getObject("revoked_at", java.time.OffsetDateTime.class).toInstant()
                    ));
            return Optional.ofNullable(row);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    /** Password changed / reset: every other session must sign in again. */
    public int revokeAllForUser(UUID userId) {
        return jdbc.update(
                "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = :userId AND revoked_at IS NULL",
                new MapSqlParameterSource("userId", userId));
    }

    public void revoke(UUID id) {
        jdbc.update(
                "UPDATE refresh_tokens SET revoked_at = now() WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }
}
