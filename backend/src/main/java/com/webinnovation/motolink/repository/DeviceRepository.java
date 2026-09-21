package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.Device;
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
public class DeviceRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, driver_id, imei, name, sim_msisdn, sim_iccid, vehicle_plate, vehicle_type,
                   protocol, protocol_variant, model, status, last_seen_at,
                   ST_Y(last_location::geometry) AS last_lat,
                   ST_X(last_location::geometry) AS last_lng,
                   last_speed, last_course, last_voltage_mv,
                   last_gsm_signal, last_engine_hours_seconds,
                   icon_color, engine_locked,
                   created_at, updated_at
            """;

    private static final RowMapper<Device> ROW_MAPPER = (rs, rn) -> new Device(
            rs.getObject("id", UUID.class),
            rs.getObject("org_id", UUID.class),
            rs.getObject("driver_id", UUID.class),
            rs.getString("imei"),
            rs.getString("name"),
            rs.getString("sim_msisdn"),
            rs.getString("sim_iccid"),
            rs.getString("vehicle_plate"),
            rs.getString("vehicle_type"),
            rs.getString("protocol"),
            rs.getString("protocol_variant"),
            rs.getString("model"),
            rs.getString("status"),
            toInstant(rs.getObject("last_seen_at", OffsetDateTime.class)),
            rs.getObject("last_lat") == null ? null : rs.getDouble("last_lat"),
            rs.getObject("last_lng") == null ? null : rs.getDouble("last_lng"),
            rs.getObject("last_speed") == null ? null : rs.getInt("last_speed"),
            rs.getObject("last_course") == null ? null : rs.getInt("last_course"),
            rs.getObject("last_voltage_mv") == null ? null : rs.getInt("last_voltage_mv"),
            rs.getObject("last_gsm_signal") == null ? null : rs.getInt("last_gsm_signal"),
            rs.getObject("last_engine_hours_seconds") == null ? null : rs.getInt("last_engine_hours_seconds"),
            rs.getString("icon_color"),
            rs.getBoolean("engine_locked"),
            rs.getObject("created_at", OffsetDateTime.class).toInstant(),
            rs.getObject("updated_at", OffsetDateTime.class).toInstant()
    );

    private static Instant toInstant(OffsetDateTime odt) {
        return odt == null ? null : odt.toInstant();
    }

    public Optional<Device> findByImei(String imei) {
        try {
            Device d = jdbc.queryForObject(
                    SELECT_FIELDS + " FROM devices WHERE imei = :imei",
                    new MapSqlParameterSource("imei", imei),
                    ROW_MAPPER);
            return Optional.ofNullable(d);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Device> findByOrgAndImei(UUID orgId, String imei) {
        try {
            Device d = jdbc.queryForObject(
                    SELECT_FIELDS + " FROM devices WHERE org_id = :orgId AND imei = :imei",
                    new MapSqlParameterSource("orgId", orgId).addValue("imei", imei),
                    ROW_MAPPER);
            return Optional.ofNullable(d);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Device> listForOrg(UUID orgId) {
        return jdbc.query(
                SELECT_FIELDS + " FROM devices WHERE org_id = :orgId ORDER BY created_at DESC",
                new MapSqlParameterSource("orgId", orgId),
                ROW_MAPPER);
    }

    /**
     * List devices visible to a specific user.
     * If seeAllDevices is true, returns all org devices.
     * Otherwise, returns only devices assigned to the user via user_devices table.
     */
    public List<Device> listForUser(UUID orgId, UUID userId, boolean seeAllDevices) {
        if (seeAllDevices) {
            return listForOrg(orgId);
        }
        return jdbc.query(
                SELECT_FIELDS + """
                 FROM devices d
                 WHERE d.org_id = :orgId
                   AND d.imei IN (SELECT device_imei FROM user_devices WHERE user_id = :userId)
                 ORDER BY d.created_at DESC
                """,
                new MapSqlParameterSource("orgId", orgId).addValue("userId", userId),
                ROW_MAPPER);
    }

    /**
     * Check if a user can access a specific device.
     */
    public boolean canUserAccessDevice(UUID orgId, UUID userId, String imei, boolean seeAllDevices) {
        if (seeAllDevices) {
            // User can see all devices, just verify org ownership
            return findByOrgAndImei(orgId, imei).isPresent();
        }
        // Check if device is assigned to user
        var sql = """
            SELECT COUNT(*) FROM devices d
            JOIN user_devices ud ON ud.device_imei = d.imei
            WHERE d.org_id = :orgId AND d.imei = :imei AND ud.user_id = :userId
            """;
        Integer count = jdbc.queryForObject(sql,
                new MapSqlParameterSource("orgId", orgId).addValue("imei", imei).addValue("userId", userId),
                Integer.class);
        return count != null && count > 0;
    }

    public List<Device> listForOrgByStatus(UUID orgId, String status) {
        return jdbc.query(
                SELECT_FIELDS + " FROM devices WHERE org_id = :orgId AND status = :status ORDER BY last_seen_at DESC NULLS LAST",
                new MapSqlParameterSource("orgId", orgId).addValue("status", status),
                ROW_MAPPER);
    }

    public void markOnline(String imei, Instant ts) {
        jdbc.update("""
                UPDATE devices
                SET status = 'ONLINE', last_seen_at = :ts, updated_at = now()
                WHERE imei = :imei
                """, new MapSqlParameterSource("imei", imei).addValue("ts", java.sql.Timestamp.from(ts)));
    }

    public void updateLastPosition(String imei, double lat, double lng, int speed, int course,
                                   Integer voltageMv, Integer gsmSignal, Integer engineHoursSeconds,
                                   Instant ts) {
        var params = new MapSqlParameterSource()
                .addValue("imei", imei)
                .addValue("lat", lat)
                .addValue("lng", lng)
                .addValue("speed", speed)
                .addValue("course", course)
                .addValue("voltageMv", voltageMv)
                .addValue("gsmSignal", gsmSignal)
                .addValue("engineHours", engineHoursSeconds)
                .addValue("ts", java.sql.Timestamp.from(ts));
        jdbc.update("""
                UPDATE devices SET
                  status = 'ONLINE',
                  last_seen_at = :ts,
                  last_location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  last_speed = :speed,
                  last_course = :course,
                  last_voltage_mv = COALESCE(:voltageMv, last_voltage_mv),
                  last_gsm_signal = COALESCE(:gsmSignal, last_gsm_signal),
                  last_engine_hours_seconds = COALESCE(:engineHours, last_engine_hours_seconds),
                  updated_at = now()
                WHERE imei = :imei
                """, params);
    }

    /**
     * Apply a location packet that carries NO valid GPS fix.
     *
     * The device is heard from (presence + non-positional telemetry refresh) but
     * last_location / last_speed / last_course are deliberately left untouched, so
     * the device row keeps the last position we actually know to be true. A GT06
     * with no fix repeats its stale coordinates — and some firmware emits zeroed or
     * LBS-derived coordinates instead, which would otherwise teleport the marker.
     * See CLAUDE.md §3.2 rule 1: the raw row is still persisted either way.
     */
    public void updateLastTelemetryNoFix(String imei, Integer voltageMv, Integer gsmSignal,
                                         Integer engineHoursSeconds, Instant ts) {
        var params = new MapSqlParameterSource()
                .addValue("imei", imei)
                .addValue("voltageMv", voltageMv)
                .addValue("gsmSignal", gsmSignal)
                .addValue("engineHours", engineHoursSeconds)
                .addValue("ts", java.sql.Timestamp.from(ts));
        jdbc.update("""
                UPDATE devices SET
                  status = 'ONLINE',
                  last_seen_at = :ts,
                  last_voltage_mv = COALESCE(:voltageMv, last_voltage_mv),
                  last_gsm_signal = COALESCE(:gsmSignal, last_gsm_signal),
                  last_engine_hours_seconds = COALESCE(:engineHours, last_engine_hours_seconds),
                  updated_at = now()
                WHERE imei = :imei
                """, params);
    }

    /**
     * Apply a heartbeat-derived status update (no position). Heartbeats carry
     * GSM strength independently of location packets, so we refresh the signal
     * indicator for parked vehicles between position fixes.
     */
    public void updateLastStatus(String imei, Integer gsmSignal, Instant ts) {
        var params = new MapSqlParameterSource()
                .addValue("imei", imei)
                .addValue("gsmSignal", gsmSignal)
                .addValue("ts", java.sql.Timestamp.from(ts));
        jdbc.update("""
                UPDATE devices SET
                  status = 'ONLINE',
                  last_seen_at = :ts,
                  last_gsm_signal = COALESCE(:gsmSignal, last_gsm_signal),
                  updated_at = now()
                WHERE imei = :imei
                """, params);
    }

    /**
     * Returns counts by status for the org. Keys are the literal status strings
     * (ONLINE, OFFLINE, NEVER_CONNECTED). Statuses with zero devices are absent.
     */
    public java.util.Map<String, Integer> countByStatus(UUID orgId) {
        return jdbc.query(
                "SELECT status, COUNT(*)::int AS n FROM devices WHERE org_id = :orgId GROUP BY status",
                new MapSqlParameterSource("orgId", orgId),
                rs -> {
                    java.util.Map<String, Integer> out = new java.util.HashMap<>();
                    while (rs.next()) {
                        out.put(rs.getString("status"), rs.getInt("n"));
                    }
                    return out;
                });
    }

    /** Partial profile update — null params keep the current value (scoped by org). */
    public int updateProfile(UUID orgId, String imei, String name, String simMsisdn,
                             String vehiclePlate, String vehicleType, String iconColor) {
        return jdbc.update("""
                UPDATE devices SET
                  name = COALESCE(:name, name),
                  sim_msisdn = COALESCE(:simMsisdn, sim_msisdn),
                  vehicle_plate = COALESCE(:plate, vehicle_plate),
                  vehicle_type = COALESCE(:type, vehicle_type),
                  icon_color = COALESCE(:color, icon_color),
                  updated_at = now()
                WHERE org_id = :orgId AND imei = :imei
                """, new MapSqlParameterSource("orgId", orgId)
                .addValue("imei", imei)
                .addValue("name", name)
                .addValue("simMsisdn", simMsisdn)
                .addValue("plate", vehiclePlate)
                .addValue("type", vehicleType)
                .addValue("color", iconColor));
    }

    /** Records the engine cut/restore state after a successful command (scoped by org). */
    public int setEngineLocked(UUID orgId, String imei, boolean locked) {
        return jdbc.update("""
                UPDATE devices SET engine_locked = :locked, updated_at = now()
                WHERE org_id = :orgId AND imei = :imei
                """, new MapSqlParameterSource("orgId", orgId)
                .addValue("imei", imei)
                .addValue("locked", locked));
    }

    /** Assign a driver to a device. Pass null to unassign. */
    public int assignDriver(UUID orgId, String imei, UUID driverId) {
        return jdbc.update("""
                UPDATE devices SET driver_id = :driverId, updated_at = now()
                WHERE org_id = :orgId AND imei = :imei
                """, new MapSqlParameterSource("orgId", orgId)
                .addValue("imei", imei)
                .addValue("driverId", driverId));
    }

    /** List devices assigned to a specific driver. */
    public List<Device> listByDriver(UUID orgId, UUID driverId) {
        return jdbc.query(
                SELECT_FIELDS + " FROM devices WHERE org_id = :orgId AND driver_id = :driverId ORDER BY name",
                new MapSqlParameterSource("orgId", orgId).addValue("driverId", driverId),
                ROW_MAPPER);
    }

    /** List devices without an assigned driver. */
    public List<Device> listUnassignedDrivers(UUID orgId) {
        return jdbc.query(
                SELECT_FIELDS + " FROM devices WHERE org_id = :orgId AND driver_id IS NULL ORDER BY name",
                new MapSqlParameterSource("orgId", orgId),
                ROW_MAPPER);
    }

    public int markStaleOffline(int idleMinutes) {
        return jdbc.update("""
                UPDATE devices
                SET status = 'OFFLINE', updated_at = now()
                WHERE status = 'ONLINE'
                  AND (last_seen_at IS NULL OR last_seen_at < now() - (:mins || ' minutes')::interval)
                """, new MapSqlParameterSource("mins", idleMinutes));
    }

    /**
     * Auto-register a new device when it first connects.
     * Returns the created device.
     */
    public Device createDevice(UUID orgId, String imei, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO devices (id, org_id, imei, name, status, protocol, created_at, updated_at)
                VALUES (:id, :orgId, :imei, :name, 'ONLINE', 'GT06', now(), now())
                """, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("name", name));
        return findByImei(imei).orElseThrow();
    }

    // ─────────────────────────────────────────────────────────────
    // Super Admin operations
    // ─────────────────────────────────────────────────────────────

    /**
     * List all devices across all organizations (Super Admin only).
     */
    public List<Device> listAll() {
        return jdbc.query(
                SELECT_FIELDS + " FROM devices ORDER BY created_at DESC",
                ROW_MAPPER);
    }

    /**
     * List all devices with optional org filter (Super Admin only).
     */
    public List<Device> listAllWithFilter(UUID orgId) {
        if (orgId == null) {
            return listAll();
        }
        return jdbc.query(
                SELECT_FIELDS + " FROM devices WHERE org_id = :orgId ORDER BY created_at DESC",
                new MapSqlParameterSource("orgId", orgId),
                ROW_MAPPER);
    }

    /**
     * Reassign a device to a different organization (Super Admin only).
     */
    public int reassignOrg(String imei, UUID newOrgId) {
        return jdbc.update("""
                UPDATE devices SET org_id = :newOrgId, updated_at = now()
                WHERE imei = :imei
                """, new MapSqlParameterSource("imei", imei).addValue("newOrgId", newOrgId));
    }

    /**
     * Count total devices.
     */
    public int countAll() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM devices",
                new MapSqlParameterSource(),
                Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Count online devices.
     */
    public int countOnline() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM devices WHERE status = 'ONLINE'",
                new MapSqlParameterSource(),
                Integer.class);
        return count != null ? count : 0;
    }
}
