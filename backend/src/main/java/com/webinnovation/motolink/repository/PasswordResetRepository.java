package com.webinnovation.motolink.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class PasswordResetRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record ResetCodeRow(UUID id, UUID userId, String codeHash, Instant expiresAt, Instant usedAt, int attempts) {}

    public UUID create(UUID userId, String codeHash, String channel, Instant expiresAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO password_reset_codes (id, user_id, code_hash, channel, expires_at)
                VALUES (:id, :userId, :hash, :channel, :expiresAt)
                """, new MapSqlParameterSource()
                        .addValue("id", id).addValue("userId", userId).addValue("hash", codeHash)
                        .addValue("channel", channel).addValue("expiresAt", Timestamp.from(expiresAt)));
        return id;
    }

    /** The newest code for the user that has not been used yet (may be expired — caller checks). */
    public Optional<ResetCodeRow> findLatestUnused(UUID userId) {
        try {
            return Optional.ofNullable(jdbc.queryForObject("""
                    SELECT id, user_id, code_hash, expires_at, used_at, attempts
                      FROM password_reset_codes
                     WHERE user_id = :userId AND used_at IS NULL
                     ORDER BY created_at DESC LIMIT 1
                    """, new MapSqlParameterSource("userId", userId),
                    (rs, rn) -> new ResetCodeRow(
                            rs.getObject("id", UUID.class),
                            rs.getObject("user_id", UUID.class),
                            rs.getString("code_hash"),
                            rs.getObject("expires_at", OffsetDateTime.class).toInstant(),
                            rs.getObject("used_at", OffsetDateTime.class) == null ? null
                                    : rs.getObject("used_at", OffsetDateTime.class).toInstant(),
                            rs.getInt("attempts"))));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public int countCreatedSince(UUID userId, Instant since) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM password_reset_codes WHERE user_id = :userId AND created_at >= :since",
                new MapSqlParameterSource("userId", userId).addValue("since", Timestamp.from(since)), Integer.class);
        return n == null ? 0 : n;
    }

    public void bumpAttempts(UUID id) {
        jdbc.update("UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }

    /** Marks every outstanding code for the user as consumed (on success or when issuing a new one). */
    public void consumeAllForUser(UUID userId) {
        jdbc.update("UPDATE password_reset_codes SET used_at = now() WHERE user_id = :userId AND used_at IS NULL",
                new MapSqlParameterSource("userId", userId));
    }
}
