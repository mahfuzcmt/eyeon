package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final RowMapper<User> ROW_MAPPER = (rs, rn) -> new User(
            rs.getObject("id", UUID.class),
            rs.getObject("org_id", UUID.class),
            rs.getString("email"),
            rs.getString("phone"),
            rs.getString("password_hash"),
            rs.getString("full_name"),
            rs.getString("role"),
            rs.getBoolean("is_active"),
            rs.getBoolean("see_all_devices"),
            toInstant(rs.getObject("last_login_at", OffsetDateTime.class)),
            rs.getObject("created_at", OffsetDateTime.class).toInstant(),
            rs.getObject("updated_at", OffsetDateTime.class).toInstant()
    );

    private static Instant toInstant(OffsetDateTime odt) {
        return odt == null ? null : odt.toInstant();
    }

    public Optional<User> findByEmail(String email) {
        try {
            User u = jdbc.queryForObject(
                    "SELECT * FROM users WHERE email = :email",
                    new MapSqlParameterSource("email", email),
                    ROW_MAPPER);
            return Optional.ofNullable(u);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<User> findById(UUID id) {
        try {
            User u = jdbc.queryForObject(
                    "SELECT * FROM users WHERE id = :id",
                    new MapSqlParameterSource("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(u);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public long count() {
        Long c = jdbc.getJdbcTemplate().queryForObject("SELECT COUNT(*) FROM users", Long.class);
        return c == null ? 0 : c;
    }

    public UUID create(UUID orgId, String email, String passwordHash, String fullName, String role) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("email", email)
                .addValue("passwordHash", passwordHash)
                .addValue("fullName", fullName)
                .addValue("role", role);
        jdbc.update("""
                INSERT INTO users (id, org_id, email, password_hash, full_name, role)
                VALUES (:id, :orgId, :email, :passwordHash, :fullName, :role)
                """, params);
        return id;
    }

    public void touchLastLogin(UUID userId) {
        jdbc.update(
                "UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = :id",
                new MapSqlParameterSource("id", userId));
    }

    public List<User> listByOrg(UUID orgId) {
        return jdbc.query(
                "SELECT * FROM users WHERE org_id = :orgId ORDER BY created_at",
                new MapSqlParameterSource("orgId", orgId),
                ROW_MAPPER);
    }

    public UUID createInOrg(UUID orgId, String email, String phone, String passwordHash,
                            String fullName, String role) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("email", email)
                .addValue("phone", phone)
                .addValue("passwordHash", passwordHash)
                .addValue("fullName", fullName)
                .addValue("role", role);
        jdbc.update("""
                INSERT INTO users (id, org_id, email, phone, password_hash, full_name, role)
                VALUES (:id, :orgId, :email, :phone, :passwordHash, :fullName, :role)
                """, params);
        return id;
    }

    public int update(UUID id, UUID orgId, String fullName, String phone, String role, Boolean isActive) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("fullName", fullName)
                .addValue("phone", phone)
                .addValue("role", role)
                .addValue("isActive", isActive);
        return jdbc.update("""
                UPDATE users
                   SET full_name = COALESCE(:fullName, full_name),
                       phone     = COALESCE(:phone, phone),
                       role      = COALESCE(:role, role),
                       is_active = COALESCE(:isActive, is_active),
                       updated_at = now()
                 WHERE id = :id AND org_id = :orgId
                """, params);
    }

    /** Self-service change / reset: no org scoping needed, the caller has proven identity. */
    public int updatePasswordById(UUID id, String passwordHash) {
        return jdbc.update("""
                UPDATE users
                   SET password_hash = :hash, password_changed_at = now(), updated_at = now()
                 WHERE id = :id
                """, new MapSqlParameterSource("id", id).addValue("hash", passwordHash));
    }

    public int updatePassword(UUID id, UUID orgId, String passwordHash) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("passwordHash", passwordHash);
        return jdbc.update("""
                UPDATE users SET password_hash = :passwordHash, updated_at = now()
                 WHERE id = :id AND org_id = :orgId
                """, params);
    }

    public int softDelete(UUID id, UUID orgId) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId);
        return jdbc.update("""
                UPDATE users SET is_active = false, updated_at = now()
                 WHERE id = :id AND org_id = :orgId
                """, params);
    }

    /**
     * Update whether user can see all devices in org or only assigned ones.
     */
    public int updateSeeAllDevices(UUID id, UUID orgId, boolean seeAllDevices) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("seeAllDevices", seeAllDevices);
        return jdbc.update("""
                UPDATE users SET see_all_devices = :seeAllDevices, updated_at = now()
                 WHERE id = :id AND org_id = :orgId
                """, params);
    }
}
