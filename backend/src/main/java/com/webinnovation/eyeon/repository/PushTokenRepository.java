package com.webinnovation.eyeon.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Expo push tokens for the mobile app. A token is unique per app install;
 * re-registration by a different user (phone changed hands, re-login) simply
 * reassigns the row to the new user/org.
 */
@Repository
@RequiredArgsConstructor
public class PushTokenRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /** @param locale the app language on that install ({@code bn} / {@code en}); null = org default */
    public void upsert(UUID orgId, UUID userId, String token, String platform, String locale) {
        jdbc.update("""
                INSERT INTO push_tokens (org_id, user_id, token, platform, locale)
                VALUES (:orgId, :userId, :token, :platform, :locale)
                ON CONFLICT (token) DO UPDATE
                SET org_id = EXCLUDED.org_id,
                    user_id = EXCLUDED.user_id,
                    platform = EXCLUDED.platform,
                    locale = EXCLUDED.locale,
                    last_seen_at = now()
                """, new MapSqlParameterSource()
                        .addValue("orgId", orgId)
                        .addValue("userId", userId)
                        .addValue("token", token)
                        .addValue("platform", platform)
                        .addValue("locale", locale));
    }

    /** A push destination and the language its notifications should be written in. */
    public record Target(String token, String locale) {}

    /** Delete a token owned by this user (sign-out). Returns true if a row was removed. */
    public boolean deleteForUser(UUID userId, String token) {
        int n = jdbc.update(
                "DELETE FROM push_tokens WHERE user_id = :userId AND token = :token",
                new MapSqlParameterSource("userId", userId).addValue("token", token));
        return n > 0;
    }

    /** All tokens registered by users of the org — push fanout audience. */
    public List<String> listTokensForOrg(UUID orgId) {
        return jdbc.queryForList(
                "SELECT token FROM push_tokens WHERE org_id = :orgId",
                new MapSqlParameterSource("orgId", orgId),
                String.class);
    }

    /**
     * Tokens of org users who want pushes for {@code alarmType}: users without a
     * settings row get everything (the pre-V15 behaviour), users with a row are
     * filtered by their push_types.
     */
    /**
     * Tokens of org users who opted in to {@code alarmType} pushes AND may see the device:
     * admins, {@code see_all_devices} users, or an explicit {@code user_devices} row.
     */
    public List<Target> listTokensForOrgAndType(UUID orgId, String alarmType, String deviceImei) {
        return jdbc.query("""
                SELECT pt.token, COALESCE(pt.locale, o.locale) AS locale
                  FROM push_tokens pt
                  JOIN users u ON u.id = pt.user_id
                  JOIN organizations o ON o.id = pt.org_id
                  LEFT JOIN user_notification_settings s ON s.user_id = pt.user_id
                 WHERE pt.org_id = :orgId
                   AND u.is_active = true
                   AND (s.user_id IS NULL OR :type = ANY(s.push_types))
                   AND (u.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
                        OR u.see_all_devices = true
                        OR EXISTS (SELECT 1 FROM user_devices ud
                                    WHERE ud.user_id = pt.user_id AND ud.device_imei = :imei))
                """, new MapSqlParameterSource("orgId", orgId)
                        .addValue("type", alarmType)
                        .addValue("imei", deviceImei),
                (rs, rn) -> new Target(rs.getString("token"), rs.getString("locale")));
    }

    /** Purge tokens Expo reported as DeviceNotRegistered (app uninstalled). */
    public void deleteAll(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) return;
        jdbc.update("DELETE FROM push_tokens WHERE token IN (:tokens)",
                new MapSqlParameterSource("tokens", tokens));
    }
}
