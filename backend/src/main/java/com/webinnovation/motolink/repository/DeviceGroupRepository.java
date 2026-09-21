package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.DeviceGroup;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Per-user vehicle groups. Every query is scoped by the owning user. */
@Repository
@RequiredArgsConstructor
public class DeviceGroupRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, owner_user_id, name, description, color, icon, sort_order,
                   created_at, updated_at
              FROM device_groups
            """;

    private static final RowMapper<DeviceGroup> ROW_MAPPER = (rs, rn) -> new DeviceGroup(
            rs.getObject("id", UUID.class),
            rs.getObject("org_id", UUID.class),
            rs.getObject("owner_user_id", UUID.class),
            rs.getString("name"),
            rs.getString("description"),
            rs.getString("color"),
            rs.getString("icon"),
            rs.getInt("sort_order"),
            rs.getObject("created_at", OffsetDateTime.class).toInstant(),
            rs.getObject("updated_at", OffsetDateTime.class).toInstant()
    );

    public Optional<DeviceGroup> findById(UUID ownerUserId, UUID id) {
        try {
            return Optional.ofNullable(jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE owner_user_id = :owner AND id = :id",
                    new MapSqlParameterSource("owner", ownerUserId).addValue("id", id),
                    ROW_MAPPER));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<DeviceGroup> findByName(UUID ownerUserId, String name) {
        try {
            return Optional.ofNullable(jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE owner_user_id = :owner AND name = :name",
                    new MapSqlParameterSource("owner", ownerUserId).addValue("name", name),
                    ROW_MAPPER));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<DeviceGroup> listForOwner(UUID ownerUserId) {
        return jdbc.query(
                SELECT_FIELDS + " WHERE owner_user_id = :owner ORDER BY sort_order, name",
                new MapSqlParameterSource("owner", ownerUserId),
                ROW_MAPPER);
    }

    public DeviceGroup create(UUID orgId, UUID ownerUserId, String name, String description,
                              String color, String icon, int sortOrder) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO device_groups
                  (id, org_id, owner_user_id, name, description, color, icon, sort_order, created_at, updated_at)
                VALUES
                  (:id, :orgId, :owner, :name, :description, :color, :icon, :sortOrder, now(), now())
                """, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("owner", ownerUserId)
                .addValue("name", name)
                .addValue("description", description)
                .addValue("color", color)
                .addValue("icon", icon)
                .addValue("sortOrder", sortOrder));
        return findById(ownerUserId, id).orElseThrow();
    }

    public int update(UUID ownerUserId, UUID id, String name, String description,
                      String color, String icon, Integer sortOrder) {
        return jdbc.update("""
                UPDATE device_groups SET
                  name = COALESCE(:name, name),
                  description = COALESCE(:description, description),
                  color = COALESCE(:color, color),
                  icon = COALESCE(:icon, icon),
                  sort_order = COALESCE(:sortOrder, sort_order),
                  updated_at = now()
                WHERE owner_user_id = :owner AND id = :id
                """, new MapSqlParameterSource()
                .addValue("owner", ownerUserId)
                .addValue("id", id)
                .addValue("name", name)
                .addValue("description", description)
                .addValue("color", color)
                .addValue("icon", icon)
                .addValue("sortOrder", sortOrder));
    }

    /** Deletes the group; its memberships go with it (FK cascade). */
    public int delete(UUID ownerUserId, UUID id) {
        return jdbc.update(
                "DELETE FROM device_groups WHERE owner_user_id = :owner AND id = :id",
                new MapSqlParameterSource("owner", ownerUserId).addValue("id", id));
    }

    /** group_id -> member count, for the owner's groups. */
    public Map<UUID, Integer> countMembersByGroup(UUID ownerUserId) {
        return jdbc.query("""
                SELECT m.group_id, COUNT(*)::int AS n
                  FROM device_group_members m
                  JOIN device_groups g ON g.id = m.group_id
                 WHERE g.owner_user_id = :owner
                 GROUP BY m.group_id
                """, new MapSqlParameterSource("owner", ownerUserId),
                rs -> {
                    Map<UUID, Integer> out = new HashMap<>();
                    while (rs.next()) out.put(rs.getObject("group_id", UUID.class), rs.getInt("n"));
                    return out;
                });
    }

    /** imei -> group_id for every vehicle the owner has filed into one of their groups. */
    public Map<String, UUID> membershipForOwner(UUID ownerUserId) {
        return jdbc.query("""
                SELECT m.device_imei, m.group_id
                  FROM device_group_members m
                  JOIN device_groups g ON g.id = m.group_id
                 WHERE g.owner_user_id = :owner
                """, new MapSqlParameterSource("owner", ownerUserId),
                rs -> {
                    Map<String, UUID> out = new HashMap<>();
                    while (rs.next()) out.put(rs.getString("device_imei"), rs.getObject("group_id", UUID.class));
                    return out;
                });
    }

    /** Removes the vehicles from whichever of the owner's groups they are in. */
    public int unassign(UUID ownerUserId, Collection<String> imeis) {
        if (imeis == null || imeis.isEmpty()) return 0;
        return jdbc.update("""
                DELETE FROM device_group_members m
                 USING device_groups g
                 WHERE g.id = m.group_id AND g.owner_user_id = :owner AND m.device_imei IN (:imeis)
                """, new MapSqlParameterSource("owner", ownerUserId).addValue("imeis", imeis));
    }

    /** Moves the vehicles into {@code groupId} (a vehicle is in at most one of the owner's groups). */
    public int assign(UUID ownerUserId, UUID groupId, Collection<String> imeis) {
        if (imeis == null || imeis.isEmpty()) return 0;
        unassign(ownerUserId, imeis);
        int n = 0;
        for (String imei : imeis) {
            n += jdbc.update("""
                    INSERT INTO device_group_members (group_id, device_imei) VALUES (:gid, :imei)
                    ON CONFLICT DO NOTHING
                    """, new MapSqlParameterSource("gid", groupId).addValue("imei", imei));
        }
        return n;
    }

    public void reorder(UUID ownerUserId, List<UUID> groupIds) {
        for (int i = 0; i < groupIds.size(); i++) {
            jdbc.update("""
                    UPDATE device_groups SET sort_order = :order, updated_at = now()
                    WHERE owner_user_id = :owner AND id = :id
                    """, new MapSqlParameterSource()
                    .addValue("owner", ownerUserId)
                    .addValue("id", groupIds.get(i))
                    .addValue("order", i));
        }
    }
}
