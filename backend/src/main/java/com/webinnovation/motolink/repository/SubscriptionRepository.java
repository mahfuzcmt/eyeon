package com.webinnovation.motolink.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Access to the subscriptions table (defined in V1). Provides device subscription
 * status, expiry info, trial creation, and admin management.
 */
@Repository
@RequiredArgsConstructor
public class SubscriptionRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /** Minimal per-device subscription state for the device view. */
    public record SubInfo(String status, LocalDate nextDueAt) {}

    /** One row per device (the one with the furthest next_due_at), keyed by IMEI. */
    public Map<String, SubInfo> latestByOrg(UUID orgId) {
        return jdbc.query("""
                SELECT DISTINCT ON (device_imei) device_imei, status, next_due_at
                FROM subscriptions
                WHERE org_id = :orgId
                ORDER BY device_imei, next_due_at DESC
                """, new MapSqlParameterSource("orgId", orgId), rs -> {
            Map<String, SubInfo> out = new HashMap<>();
            while (rs.next()) {
                out.put(rs.getString("device_imei"),
                        new SubInfo(rs.getString("status"), rs.getObject("next_due_at", LocalDate.class)));
            }
            return out;
        });
    }

    public Optional<SubInfo> latestForImei(UUID orgId, String imei) {
        try {
            SubInfo s = jdbc.queryForObject("""
                    SELECT status, next_due_at
                    FROM subscriptions
                    WHERE org_id = :orgId AND device_imei = :imei
                    ORDER BY next_due_at DESC
                    LIMIT 1
                    """,
                    new MapSqlParameterSource("orgId", orgId).addValue("imei", imei),
                    (rs, rn) -> new SubInfo(rs.getString("status"), rs.getObject("next_due_at", LocalDate.class)));
            return Optional.ofNullable(s);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    /** Global lookup by IMEI (no org filter) - used by subscription guard. */
    public Optional<SubInfo> latestForImei(String imei) {
        try {
            SubInfo s = jdbc.queryForObject("""
                    SELECT status, next_due_at
                    FROM subscriptions
                    WHERE device_imei = :imei AND status NOT IN ('CANCELLED')
                    ORDER BY next_due_at DESC
                    LIMIT 1
                    """,
                    new MapSqlParameterSource("imei", imei),
                    (rs, rn) -> new SubInfo(rs.getString("status"), rs.getObject("next_due_at", LocalDate.class)));
            return Optional.ofNullable(s);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Full subscription record for detailed views
    // ───────────────────────────────────────────────────────────────────────────

    /** Full subscription record for UI display. */
    public record Subscription(
            UUID id,
            UUID orgId,
            String deviceImei,
            String planTier,
            int monthlyPriceBdt,
            LocalDate startedAt,
            LocalDate nextDueAt,
            String status,
            boolean autoRenew,
            Instant createdAt,
            Instant updatedAt
    ) {}

    private static final String FULL_SELECT = """
            SELECT id, org_id, device_imei, plan_tier, monthly_price_bdt,
                   started_at, next_due_at, status, auto_renew, created_at, updated_at
            FROM subscriptions
            """;

    private Subscription mapRow(java.sql.ResultSet rs, int rn) throws java.sql.SQLException {
        return new Subscription(
                rs.getObject("id", UUID.class),
                rs.getObject("org_id", UUID.class),
                rs.getString("device_imei"),
                rs.getString("plan_tier"),
                rs.getInt("monthly_price_bdt"),
                rs.getObject("started_at", LocalDate.class),
                rs.getObject("next_due_at", LocalDate.class),
                rs.getString("status"),
                rs.getBoolean("auto_renew"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
        );
    }

    /** List all subscriptions for an org (user billing view). */
    public List<Subscription> findByOrgId(UUID orgId) {
        return jdbc.query(
                FULL_SELECT + "WHERE org_id = :orgId ORDER BY created_at DESC",
                new MapSqlParameterSource("orgId", orgId),
                this::mapRow
        );
    }

    /** Get subscription by ID (org-scoped for security). */
    public Optional<Subscription> findById(UUID orgId, UUID id) {
        try {
            Subscription s = jdbc.queryForObject(
                    FULL_SELECT + "WHERE id = :id AND org_id = :orgId",
                    new MapSqlParameterSource("id", id).addValue("orgId", orgId),
                    this::mapRow
            );
            return Optional.ofNullable(s);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    /** Get subscription by ID (admin - no org filter). */
    public Optional<Subscription> findById(UUID id) {
        try {
            Subscription s = jdbc.queryForObject(
                    FULL_SELECT + "WHERE id = :id",
                    new MapSqlParameterSource("id", id),
                    this::mapRow
            );
            return Optional.ofNullable(s);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Write operations
    // ───────────────────────────────────────────────────────────────────────────

    /** Creates a trial subscription (30 days active + 3 days grace = 33 days total). */
    public UUID createTrialSubscription(UUID orgId, String imei) {
        LocalDate now = LocalDate.now();
        LocalDate dueAt = now.plusDays(33); // 30 days active + 3 days grace period included
        UUID id = UUID.randomUUID();

        jdbc.update("""
                INSERT INTO subscriptions (id, org_id, device_imei, plan_tier, monthly_price_bdt,
                                          started_at, next_due_at, status, auto_renew)
                VALUES (:id, :orgId, :imei, 'TRIAL', 0, :startedAt, :nextDueAt, 'ACTIVE', false)
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("orgId", orgId)
                        .addValue("imei", imei)
                        .addValue("startedAt", now)
                        .addValue("nextDueAt", dueAt)
        );
        return id;
    }

    /** Update subscription status. */
    public int updateStatus(UUID id, String status) {
        return jdbc.update("""
                UPDATE subscriptions SET status = :status, updated_at = now()
                WHERE id = :id
                """,
                new MapSqlParameterSource("id", id).addValue("status", status)
        );
    }

    /** Extend subscription by setting a new due date (admin extend). */
    public int extendSubscription(UUID id, LocalDate newDueAt) {
        return jdbc.update("""
                UPDATE subscriptions
                SET next_due_at = :newDueAt, status = 'ACTIVE', updated_at = now()
                WHERE id = :id
                """,
                new MapSqlParameterSource("id", id).addValue("newDueAt", newDueAt)
        );
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Admin queries
    // ───────────────────────────────────────────────────────────────────────────

    /** Find subscriptions due within N days (for admin alerts). */
    public List<Subscription> findDueSoon(int days) {
        LocalDate threshold = LocalDate.now().plusDays(days);
        return jdbc.query(
                FULL_SELECT + """
                        WHERE status IN ('ACTIVE', 'GRACE')
                        AND next_due_at <= :threshold
                        ORDER BY next_due_at ASC
                        """,
                new MapSqlParameterSource("threshold", threshold),
                this::mapRow
        );
    }

    /** Find expired subscriptions (past due and not active). */
    public List<Subscription> findExpired() {
        LocalDate today = LocalDate.now();
        return jdbc.query(
                FULL_SELECT + """
                        WHERE (status = 'SUSPENDED' OR (status IN ('ACTIVE', 'GRACE') AND next_due_at < :today))
                        ORDER BY next_due_at ASC
                        """,
                new MapSqlParameterSource("today", today),
                this::mapRow
        );
    }

    /** Search subscriptions by IMEI pattern (admin search). */
    public List<Subscription> searchByImei(String imeiPattern) {
        return jdbc.query(
                FULL_SELECT + """
                        WHERE device_imei LIKE :pattern
                        ORDER BY created_at DESC
                        LIMIT 100
                        """,
                new MapSqlParameterSource("pattern", imeiPattern + "%"),
                this::mapRow
        );
    }

    /** Search subscriptions with filters (admin search). */
    public List<Subscription> search(UUID orgId, String imeiPattern, String status, LocalDate dueBefore, int limit) {
        StringBuilder sql = new StringBuilder(FULL_SELECT).append("WHERE 1=1 ");
        MapSqlParameterSource params = new MapSqlParameterSource();

        if (orgId != null) {
            sql.append("AND org_id = :orgId ");
            params.addValue("orgId", orgId);
        }
        if (imeiPattern != null && !imeiPattern.isBlank()) {
            sql.append("AND device_imei LIKE :imeiPattern ");
            params.addValue("imeiPattern", imeiPattern + "%");
        }
        if (status != null && !status.isBlank()) {
            sql.append("AND status = :status ");
            params.addValue("status", status);
        }
        if (dueBefore != null) {
            sql.append("AND next_due_at < :dueBefore ");
            params.addValue("dueBefore", dueBefore);
        }

        sql.append("ORDER BY next_due_at ASC LIMIT :limit");
        params.addValue("limit", limit);

        return jdbc.query(sql.toString(), params, this::mapRow);
    }

    /** Find devices that have no subscription at all. */
    public record DeviceWithoutSub(String imei, UUID orgId, String orgName, String deviceName) {}

    public List<DeviceWithoutSub> findDevicesWithoutSubscription(int limit) {
        return jdbc.query("""
                SELECT d.imei, d.org_id, o.name as org_name, d.name as device_name
                FROM devices d
                JOIN organizations o ON d.org_id = o.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM subscriptions s WHERE s.device_imei = d.imei
                )
                ORDER BY d.created_at DESC
                LIMIT :limit
                """,
                new MapSqlParameterSource("limit", limit),
                (rs, rn) -> new DeviceWithoutSub(
                        rs.getString("imei"),
                        rs.getObject("org_id", UUID.class),
                        rs.getString("org_name"),
                        rs.getString("device_name")
                )
        );
    }

    /** Count devices without subscriptions. */
    public int countDevicesWithoutSubscription() {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM devices d
                WHERE NOT EXISTS (
                    SELECT 1 FROM subscriptions s WHERE s.device_imei = d.imei
                )
                """,
                new MapSqlParameterSource(),
                Integer.class
        );
        return count != null ? count : 0;
    }

    /** Create subscription for existing device (admin action). */
    public UUID createSubscriptionForDevice(UUID orgId, String imei, String planTier, int monthlyPriceBdt, int days) {
        LocalDate now = LocalDate.now();
        LocalDate dueAt = now.plusDays(days);
        UUID id = UUID.randomUUID();

        jdbc.update("""
                INSERT INTO subscriptions (id, org_id, device_imei, plan_tier, monthly_price_bdt,
                                          started_at, next_due_at, status, auto_renew)
                VALUES (:id, :orgId, :imei, :planTier, :monthlyPriceBdt, :startedAt, :nextDueAt, 'ACTIVE', true)
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("orgId", orgId)
                        .addValue("imei", imei)
                        .addValue("planTier", planTier)
                        .addValue("monthlyPriceBdt", monthlyPriceBdt)
                        .addValue("startedAt", now)
                        .addValue("nextDueAt", dueAt)
        );
        return id;
    }

    /** Get billing statistics (admin stats). */
    public record BillingStats(
            int total,
            int active,
            int grace,
            int suspended,
            int cancelled,
            int expiringIn7Days,
            int expiredUnpaid
    ) {}

    public BillingStats getStats() {
        LocalDate today = LocalDate.now();
        LocalDate in7Days = today.plusDays(7);

        return jdbc.queryForObject("""
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
                    COUNT(*) FILTER (WHERE status = 'GRACE') as grace,
                    COUNT(*) FILTER (WHERE status = 'SUSPENDED') as suspended,
                    COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
                    COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'GRACE') AND next_due_at <= :in7Days AND next_due_at >= :today) as expiring_7d,
                    COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'GRACE', 'SUSPENDED') AND next_due_at < :today) as expired_unpaid
                FROM subscriptions
                """,
                new MapSqlParameterSource("today", today).addValue("in7Days", in7Days),
                (rs, rn) -> new BillingStats(
                        rs.getInt("total"),
                        rs.getInt("active"),
                        rs.getInt("grace"),
                        rs.getInt("suspended"),
                        rs.getInt("cancelled"),
                        rs.getInt("expiring_7d"),
                        rs.getInt("expired_unpaid")
                )
        );
    }
}
