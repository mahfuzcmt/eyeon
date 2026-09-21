package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.NotificationSettings;
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

    private static final RowMapper<NotificationSettings> ROW_MAPPER = (rs, rn) -> new NotificationSettings(
            rs.getObject("user_id", UUID.class),
            rs.getObject("org_id", UUID.class),
            toSet(rs.getArray("popup_types")),
            toSet(rs.getArray("sound_types")),
            toSet(rs.getArray("push_types")),
            rs.getObject("updated_at", OffsetDateTime.class).toInstant()
    );

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
                INSERT INTO user_notification_settings (user_id, org_id, popup_types, sound_types, push_types)
                VALUES (:userId, :orgId, :popup, :sound, :push)
                ON CONFLICT (user_id) DO UPDATE
                   SET org_id      = EXCLUDED.org_id,
                       popup_types = EXCLUDED.popup_types,
                       sound_types = EXCLUDED.sound_types,
                       push_types  = EXCLUDED.push_types,
                       updated_at  = now()
                """, new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("orgId", orgId)
                        .addValue("popup", popup.toArray(String[]::new))
                        .addValue("sound", sound.toArray(String[]::new))
                        .addValue("push", push.toArray(String[]::new)));
    }

    private static Set<String> toSet(Array array) throws SQLException {
        if (array == null) return new LinkedHashSet<>();
        String[] values = (String[]) array.getArray();
        return new LinkedHashSet<>(Arrays.asList(values));
    }
}
