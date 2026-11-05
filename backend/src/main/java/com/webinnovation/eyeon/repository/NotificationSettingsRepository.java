package com.webinnovation.eyeon.repository;

import com.webinnovation.eyeon.domain.NotificationDefaults;
import com.webinnovation.eyeon.domain.NotificationSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class NotificationSettingsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * A type the user was never offered (added after they last saved, V33 {@code known_types})
     * gets the platform default instead of counting as switched off.
     */
    private static final RowMapper<NotificationSettings> ROW_MAPPER = (rs, rn) -> {
        Set<String> known = rs.getArray("known_types") == null ? null : toSet(rs.getArray("known_types"));
        return new NotificationSettings(
                rs.getObject("user_id", UUID.class),
                rs.getObject("org_id", UUID.class),
                withUnseen(toSet(rs.getArray("popup_types")), known, NotificationDefaults.POPUP),
                withUnseen(toSet(rs.getArray("sound_types")), known, NotificationDefaults.SOUND),
                withUnseen(toSet(rs.getArray("push_types")), known, NotificationDefaults.PUSH),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant()
        );
    };

    /** {@code stored} plus every default-on type that is not in {@code known}. */
    static Set<String> withUnseen(Set<String> stored, Set<String> known, Set<String> defaults) {
        if (known == null) return stored;
        Set<String> out = new LinkedHashSet<>(stored);
        for (String t : defaults) if (!known.contains(t)) out.add(t);
        return out;
    }

    public Optional<NotificationSettings> findByUser(UUID userId) {
        try {
            return Optional.ofNullable(jdbc.queryForObject(
                    "SELECT * FROM user_notification_settings WHERE user_id = :userId",
                    new MapSqlParameterSource("userId", userId),
                    ROW_MAPPER));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public void upsert(UUID userId, UUID orgId, Set<String> popup, Set<String> sound, Set<String> push) {
        jdbc.update("""
                INSERT INTO user_notification_settings (user_id, org_id, popup_types, sound_types, push_types, known_types)
                VALUES (:userId, :orgId, :popup, :sound, :push, :known)
                ON CONFLICT (user_id) DO UPDATE
                   SET org_id      = EXCLUDED.org_id,
                       popup_types = EXCLUDED.popup_types,
                       sound_types = EXCLUDED.sound_types,
                       push_types  = EXCLUDED.push_types,
                       known_types = EXCLUDED.known_types,
                       updated_at  = now()
                """, new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("orgId", orgId)
                        .addValue("popup", popup.toArray(String[]::new))
                        .addValue("sound", sound.toArray(String[]::new))
                        .addValue("push", push.toArray(String[]::new))
                        .addValue("known", NotificationDefaults.ALL_TYPES.toArray(String[]::new)));
    }

    private static Set<String> toSet(Array array) throws SQLException {
        if (array == null) return new LinkedHashSet<>();
        String[] values = (String[]) array.getArray();
        return new LinkedHashSet<>(Arrays.asList(values));
    }
}
