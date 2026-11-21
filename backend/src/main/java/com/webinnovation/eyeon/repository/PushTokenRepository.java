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

    /**
     * @param locale   the app language on that install ({@code bn} / {@code en}); null = org default
     * @param channels the notification channels the install has: {@code v2}, or null for an app
     *                 older than 0.3.29 (see V36)
     */
    public void upsert(UUID orgId, UUID userId, String token, String platform, String locale, String channels) {
        jdbc.update("""
                INSERT INTO push_tokens (org_id, user_id, token, platform, locale, channels)
                VALUES (:orgId, :userId, :token, :platform, :locale, :channels)
                ON CONFLICT (token) DO UPDATE
                SET org_id = EXCLUDED.org_id,
                    user_id = EXCLUDED.user_id,
                    platform = EXCLUDED.platform,
                    locale = EXCLUDED.locale,
                    channels = EXCLUDED.channels,
                    last_seen_at = now()
                """, new MapSqlParameterSource()
                        .addValue("orgId", orgId)
                        .addValue("userId", userId)
                        .addValue("token", token)
                        .addValue("platform", platform)
                        .addValue("locale", locale)
                        .addValue("channels", channels));
    }

    /** A push destination, the language its notifications are written in, and its channel generation. */
    public record Target(String token, String locale, String channels) {
        public Target(String token, String locale) {
            this(token, locale, null);
        }
    }

    /** This user's registration of the token, or empty when the token is not theirs. */
    public java.util.Optional<Target> findUserToken(UUID userId, String token) {
        return jdbc.query(
                "SELECT token, locale, channels FROM push_tokens WHERE user_id = :userId AND token = :token",
                new MapSqlParameterSource("userId", userId).addValue("token", token),
                (rs, i) -> new Target(rs.getString(1), rs.getString(2), rs.getString(3))).stream().findFirst();
    }

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
    /**
     * @param onlyUserId when set, only that user's installs (the owner of the geofence / place
     *                   that raised the alarm); null = everyone who can see the tracker
     */
    // A type added after the user last saved their settings (not in known_types, V33) is on.
    public List<Target> listTokensForOrgAndType(UUID orgId, String alarmType, String deviceImei, UUID onlyUserId) {
        return jdbc.query("""
                SELECT pt.token, COALESCE(pt.locale, o.locale) AS locale, pt.channels
                  FROM push_tokens pt
                  JOIN users u ON u.id = pt.user_id
                  JOIN organizations o ON o.id = pt.org_id
                  LEFT JOIN user_notification_settings s ON s.user_id = pt.user_id
                 WHERE pt.org_id = :orgId
                   AND u.is_active = true
                   AND (s.user_id IS NULL OR :type = ANY(s.push_types)
                        OR (s.known_types IS NOT NULL AND NOT (:type = ANY(s.known_types))))
                   AND (CAST(:onlyUser AS UUID) IS NULL OR pt.user_id = :onlyUser)
                   AND (u.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
                        OR u.see_all_devices = true
                        OR EXISTS (SELECT 1 FROM user_devices ud
                                    WHERE ud.user_id = pt.user_id AND ud.device_imei = :imei))
                """, new MapSqlParameterSource("orgId", orgId)
                        .addValue("type", alarmType)
                        .addValue("imei", deviceImei)
                        .addValue("onlyUser", onlyUserId),
                (rs, rn) -> new Target(rs.getString("token"), rs.getString("locale"), rs.getString("channels")));
    }

    /** Purge tokens Expo reported as DeviceNotRegistered (app uninstalled). */
    public void deleteAll(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) return;
        jdbc.update("DELETE FROM push_tokens WHERE token IN (:tokens)",
                new MapSqlParameterSource("tokens", tokens));
    }
}
