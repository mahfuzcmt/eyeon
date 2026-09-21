package com.webinnovation.motolink.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Repository for user-device assignments.
 * Enables user-level device visibility control within organizations.
 */
@Repository
@RequiredArgsConstructor
public class UserDeviceRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * Assign a device to a user.
     */
    public void assign(UUID userId, String deviceImei, UUID assignedBy) {
        var sql = """
            INSERT INTO user_devices (user_id, device_imei, assigned_at, assigned_by)
            VALUES (:userId, :imei, :now, :assignedBy)
            ON CONFLICT (user_id, device_imei) DO NOTHING
            """;
        var params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("imei", deviceImei)
                .addValue("now", Timestamp.from(Instant.now()))
                .addValue("assignedBy", assignedBy);
        jdbc.update(sql, params);
    }

    /**
     * Assign multiple devices to a user.
     */
    public void assignMultiple(UUID userId, List<String> deviceImeis, UUID assignedBy) {
        if (deviceImeis == null || deviceImeis.isEmpty()) return;

        var sql = """
            INSERT INTO user_devices (user_id, device_imei, assigned_at, assigned_by)
            VALUES (:userId, :imei, :now, :assignedBy)
            ON CONFLICT (user_id, device_imei) DO NOTHING
            """;

        Timestamp now = Timestamp.from(Instant.now());
        for (String imei : deviceImeis) {
            var params = new MapSqlParameterSource()
                    .addValue("userId", userId)
                    .addValue("imei", imei)
                    .addValue("now", now)
                    .addValue("assignedBy", assignedBy);
            jdbc.update(sql, params);
        }
    }

    /**
     * Unassign a device from a user.
     */
    public int unassign(UUID userId, String deviceImei) {
        var sql = "DELETE FROM user_devices WHERE user_id = :userId AND device_imei = :imei";
        var params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("imei", deviceImei);
        return jdbc.update(sql, params);
    }

    /**
     * Unassign all devices from a user.
     */
    public int unassignAll(UUID userId) {
        var sql = "DELETE FROM user_devices WHERE user_id = :userId";
        return jdbc.update(sql, new MapSqlParameterSource("userId", userId));
    }

    /**
     * Get all device IMEIs assigned to a user.
     */
    public List<String> getDeviceImeis(UUID userId) {
        var sql = "SELECT device_imei FROM user_devices WHERE user_id = :userId";
        return jdbc.queryForList(sql, new MapSqlParameterSource("userId", userId), String.class);
    }

    /**
     * Get all user IDs assigned to a device.
     */
    public List<UUID> getUserIds(String deviceImei) {
        var sql = "SELECT user_id FROM user_devices WHERE device_imei = :imei";
        return jdbc.queryForList(sql, new MapSqlParameterSource("imei", deviceImei), UUID.class);
    }

    /**
     * Check if a user is assigned to a device.
     */
    public boolean isAssigned(UUID userId, String deviceImei) {
        var sql = """
            SELECT COUNT(*) FROM user_devices
            WHERE user_id = :userId AND device_imei = :imei
            """;
        var params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("imei", deviceImei);
        Integer count = jdbc.queryForObject(sql, params, Integer.class);
        return count != null && count > 0;
    }

    /**
     * Count devices assigned to a user.
     */
    public int countByUser(UUID userId) {
        var sql = "SELECT COUNT(*) FROM user_devices WHERE user_id = :userId";
        Integer count = jdbc.queryForObject(sql, new MapSqlParameterSource("userId", userId), Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Count users assigned to a device.
     */
    public int countByDevice(String deviceImei) {
        var sql = "SELECT COUNT(*) FROM user_devices WHERE device_imei = :imei";
        Integer count = jdbc.queryForObject(sql, new MapSqlParameterSource("imei", deviceImei), Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Replace all device assignments for a user (set exactly these devices).
     */
    public void replaceAssignments(UUID userId, List<String> deviceImeis, UUID assignedBy) {
        unassignAll(userId);
        assignMultiple(userId, deviceImeis, assignedBy);
    }
}
