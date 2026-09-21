package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.Organization;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class OrganizationRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final RowMapper<Organization> ROW_MAPPER = (rs, rn) -> new Organization(
            rs.getObject("id", UUID.class),
            rs.getString("name"),
            rs.getString("slug"),
            rs.getString("plan_tier"),
            rs.getString("status"),
            rs.getString("contact_email"),
            rs.getString("contact_phone"),
            rs.getString("address"),
            rs.getString("locale"),
            rs.getString("timezone"),
            rs.getString("google_maps_api_key"),
            rs.getObject("created_at", java.time.OffsetDateTime.class).toInstant(),
            rs.getObject("updated_at", java.time.OffsetDateTime.class).toInstant()
    );

    public Optional<Organization> findById(UUID id) {
        try {
            Organization o = jdbc.queryForObject(
                    "SELECT * FROM organizations WHERE id = :id",
                    new MapSqlParameterSource("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(o);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Organization> findBySlug(String slug) {
        try {
            Organization o = jdbc.queryForObject(
                    "SELECT * FROM organizations WHERE slug = :slug",
                    new MapSqlParameterSource("slug", slug),
                    ROW_MAPPER);
            return Optional.ofNullable(o);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public java.util.List<Organization> findAll() {
        return jdbc.query(
                "SELECT * FROM organizations ORDER BY created_at DESC",
                ROW_MAPPER);
    }

    public int update(UUID id, String name, String contactEmail, String contactPhone,
                      String address, String locale, String timezone) {
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", name)
                .addValue("contactEmail", contactEmail)
                .addValue("contactPhone", contactPhone)
                .addValue("address", address)
                .addValue("locale", locale)
                .addValue("timezone", timezone);
        return jdbc.update("""
                UPDATE organizations
                   SET name          = COALESCE(:name, name),
                       contact_email = COALESCE(:contactEmail, contact_email),
                       contact_phone = COALESCE(:contactPhone, contact_phone),
                       address       = COALESCE(:address, address),
                       locale        = COALESCE(:locale, locale),
                       timezone      = COALESCE(:timezone, timezone),
                       updated_at    = now()
                 WHERE id = :id
                """, params);
    }

    /**
     * Set or clear (null) the org's own Google Maps browser key.
     */
    public int updateGoogleMapsApiKey(UUID id, String key) {
        return jdbc.update("""
                UPDATE organizations
                   SET google_maps_api_key = :key,
                       updated_at          = now()
                 WHERE id = :id
                """, new MapSqlParameterSource("id", id).addValue("key", key));
    }

    /**
     * Create a new organization (Super Admin only).
     */
    public UUID create(String name, String slug, String planTier,
                       String contactEmail, String contactPhone, String address) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("name", name)
                .addValue("slug", slug)
                .addValue("planTier", planTier != null ? planTier : "BASIC")
                .addValue("contactEmail", contactEmail)
                .addValue("contactPhone", contactPhone)
                .addValue("address", address);
        jdbc.update("""
                INSERT INTO organizations (id, name, slug, plan_tier, status,
                    contact_email, contact_phone, address, locale, timezone,
                    created_at, updated_at)
                VALUES (:id, :name, :slug, :planTier, 'ACTIVE',
                    :contactEmail, :contactPhone, :address, 'bn-BD', 'Asia/Dhaka',
                    now(), now())
                """, params);
        return id;
    }

    /**
     * Update organization status (Super Admin only).
     */
    public int updateStatus(UUID id, String status) {
        return jdbc.update("""
                UPDATE organizations SET status = :status, updated_at = now()
                WHERE id = :id
                """, new MapSqlParameterSource("id", id).addValue("status", status));
    }

    /**
     * Count devices in an organization.
     */
    public int countDevices(UUID orgId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM devices WHERE org_id = :orgId",
                new MapSqlParameterSource("orgId", orgId),
                Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Count users in an organization.
     */
    public int countUsers(UUID orgId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM users WHERE org_id = :orgId AND is_active = true",
                new MapSqlParameterSource("orgId", orgId),
                Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Check if slug already exists.
     */
    public boolean slugExists(String slug) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM organizations WHERE slug = :slug",
                new MapSqlParameterSource("slug", slug),
                Integer.class);
        return count != null && count > 0;
    }
}
