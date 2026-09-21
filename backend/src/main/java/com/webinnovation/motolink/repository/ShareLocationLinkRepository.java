package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.ShareLocationLink;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ShareLocationLinkRepository {

    private final JdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            id, org_id, device_imei, token, label, expires_at, is_active,
            show_history, allow_realtime, created_by, created_at, last_accessed_at, access_count
            """;

    private static final RowMapper<ShareLocationLink> ROW_MAPPER = (rs, rowNum) -> new ShareLocationLink(
            rs.getObject("id", UUID.class),
            rs.getObject("org_id", UUID.class),
            rs.getString("device_imei"),
            rs.getString("token"),
            rs.getString("label"),
            rs.getTimestamp("expires_at").toInstant(),
            rs.getBoolean("is_active"),
            rs.getBoolean("show_history"),
            rs.getBoolean("allow_realtime"),
            rs.getObject("created_by", UUID.class),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("last_accessed_at") != null ? rs.getTimestamp("last_accessed_at").toInstant() : null,
            rs.getInt("access_count")
    );

    /**
     * Create a new share link.
     */
    public ShareLocationLink create(UUID orgId, String deviceImei, String token, String label,
                                    Instant expiresAt, boolean showHistory, boolean allowRealtime, UUID createdBy) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();

        jdbc.update("""
                INSERT INTO share_location_links
                (id, org_id, device_imei, token, label, expires_at, is_active, show_history, allow_realtime, created_by, created_at, access_count)
                VALUES (?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?, 0)
                """,
                id, orgId, deviceImei, token, label, Timestamp.from(expiresAt),
                showHistory, allowRealtime, createdBy, Timestamp.from(now));

        return new ShareLocationLink(id, orgId, deviceImei, token, label, expiresAt,
                true, showHistory, allowRealtime, createdBy, now, null, 0);
    }

    /**
     * Find a link by its public token (for public access).
     */
    public Optional<ShareLocationLink> findByToken(String token) {
        List<ShareLocationLink> links = jdbc.query(
                "SELECT " + SELECT_FIELDS + " FROM share_location_links WHERE token = ? AND is_active = true",
                ROW_MAPPER, token);
        return links.isEmpty() ? Optional.empty() : Optional.of(links.get(0));
    }

    /**
     * Find a link by ID within an org.
     */
    public Optional<ShareLocationLink> findById(UUID orgId, UUID id) {
        List<ShareLocationLink> links = jdbc.query(
                "SELECT " + SELECT_FIELDS + " FROM share_location_links WHERE id = ? AND org_id = ?",
                ROW_MAPPER, id, orgId);
        return links.isEmpty() ? Optional.empty() : Optional.of(links.get(0));
    }

    /**
     * List all active links for a device.
     */
    public List<ShareLocationLink> listByDevice(UUID orgId, String deviceImei) {
        return jdbc.query(
                "SELECT " + SELECT_FIELDS + " FROM share_location_links WHERE org_id = ? AND device_imei = ? AND is_active = true ORDER BY created_at DESC",
                ROW_MAPPER, orgId, deviceImei);
    }

    /**
     * List all links for an org (including inactive).
     */
    public List<ShareLocationLink> listByOrg(UUID orgId) {
        return jdbc.query(
                "SELECT " + SELECT_FIELDS + " FROM share_location_links WHERE org_id = ? ORDER BY created_at DESC LIMIT 100",
                ROW_MAPPER, orgId);
    }

    /**
     * Deactivate (revoke) a share link.
     */
    public boolean deactivate(UUID orgId, UUID id) {
        int rows = jdbc.update(
                "UPDATE share_location_links SET is_active = false WHERE id = ? AND org_id = ?",
                id, orgId);
        return rows > 0;
    }

    /**
     * Record an access to a share link.
     */
    public void recordAccess(UUID linkId, String ipAddress, String userAgent) {
        jdbc.update("""
                UPDATE share_location_links
                SET last_accessed_at = now(), access_count = access_count + 1
                WHERE id = ?
                """, linkId);

        // Log access for analytics (optional, could be disabled for high-traffic links)
        jdbc.update("""
                INSERT INTO share_link_access_log (link_id, ip_address, user_agent)
                VALUES (?, ?::inet, ?)
                """, linkId, ipAddress, userAgent);
    }

    /**
     * Cleanup expired links (called by scheduled job).
     */
    public int deactivateExpired() {
        return jdbc.update("""
                UPDATE share_location_links
                SET is_active = false
                WHERE is_active = true AND expires_at < now()
                """);
    }

    /**
     * Count active links for a device.
     */
    public int countActiveByDevice(UUID orgId, String deviceImei) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM share_location_links WHERE org_id = ? AND device_imei = ? AND is_active = true",
                Integer.class, orgId, deviceImei);
        return count != null ? count : 0;
    }
}
