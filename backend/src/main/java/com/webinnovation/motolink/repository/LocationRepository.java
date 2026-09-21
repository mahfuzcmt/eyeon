package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.Location;
import com.webinnovation.motolink.protocol.LocationData;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class LocationRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            id, device_imei, org_id, ts, received_at, latitude, longitude,
            speed, course, altitude, satellites, valid, acc_on, voltage_mv, mileage_m,
            gsm_signal, engine_hours_seconds
            """;

    private static final RowMapper<Location> ROW_MAPPER = (rs, rn) -> new Location(
            rs.getLong("id"),
            rs.getString("device_imei"),
            rs.getObject("org_id", UUID.class),
            rs.getObject("ts", OffsetDateTime.class).toInstant(),
            rs.getObject("received_at", OffsetDateTime.class).toInstant(),
            rs.getDouble("latitude"),
            rs.getDouble("longitude"),
            rs.getInt("speed"),
            rs.getInt("course"),
            (Integer) rs.getObject("altitude"),
            (Integer) rs.getObject("satellites"),
            rs.getBoolean("valid"),
            (Boolean) rs.getObject("acc_on"),
            (Integer) rs.getObject("voltage_mv"),
            (Long) rs.getObject("mileage_m"),
            (Integer) rs.getObject("gsm_signal"),
            (Integer) rs.getObject("engine_hours_seconds")
    );

    /**
     * Hot-path insert. Uses ST_MakePoint instead of WKT parsing for speed.
     * Called once per location packet — performance-critical (CLAUDE.md §3.2 rule 1).
     */
    public void insert(LocationData d) {
        Integer engineHours = d.getAccOnTimeSeconds() == null ? null : d.getAccOnTimeSeconds().intValue();
        var params = new MapSqlParameterSource()
                .addValue("imei", d.getImei())
                .addValue("orgId", d.getOrgId())
                .addValue("ts", Timestamp.from(d.getTimestamp()))
                .addValue("lat", d.getLatitude())
                .addValue("lng", d.getLongitude())
                .addValue("speed", d.getSpeed())
                .addValue("course", d.getCourse())
                .addValue("satellites", d.getSatellites())
                .addValue("valid", d.isValid())
                .addValue("accOn", d.getAccOn())
                .addValue("voltageMv", d.getVoltageMv())
                .addValue("mileage", d.getMileageMeters())
                .addValue("gsmSignal", d.getGsmSignal())
                .addValue("engineHours", engineHours)
                .addValue("rawPayload", d.getRawPayload())
                .addValue("mcc", d.getMcc() > 0 ? d.getMcc() : null)
                .addValue("mnc", d.getMnc() > 0 ? d.getMnc() : null)
                .addValue("lac", d.getLac() > 0 ? d.getLac() : null)
                .addValue("cellId", d.getCellId() > 0 ? d.getCellId() : null);

        jdbc.update("""
                INSERT INTO locations
                  (device_imei, org_id, ts, geom, latitude, longitude,
                   speed, course, satellites, valid, acc_on, voltage_mv, mileage_m,
                   gsm_signal, engine_hours_seconds, raw_payload,
                   mcc, mnc, lac, cell_id)
                VALUES
                  (:imei, :orgId, :ts,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                   :lat, :lng, :speed, :course, :satellites, :valid,
                   :accOn, :voltageMv, :mileage,
                   :gsmSignal, :engineHours, :rawPayload,
                   :mcc, :mnc, :lac, :cellId)
                """, params);
    }

    /** Newest packet with speed > 0 — "when did this vehicle last move". */
    public Optional<Instant> lastMovingAt(String imei) {
        var rows = jdbc.query("""
                SELECT ts FROM locations
                 WHERE device_imei = :imei AND speed > 0
                 ORDER BY ts DESC LIMIT 1
                """, new MapSqlParameterSource("imei", imei),
                (rs, rn) -> rs.getObject("ts", OffsetDateTime.class).toInstant());
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    /** ACC flag of the newest packet that carried one (V1.8 frames omit it). */
    public Optional<Boolean> lastAccOn(String imei) {
        var rows = jdbc.query("""
                SELECT acc_on FROM locations
                 WHERE device_imei = :imei AND acc_on IS NOT NULL
                 ORDER BY ts DESC LIMIT 1
                """, new MapSqlParameterSource("imei", imei),
                (rs, rn) -> rs.getBoolean("acc_on"));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public Optional<Location> findLastForImei(String imei) {
        try {
            Location l = jdbc.queryForObject(
                    "SELECT " + SELECT_FIELDS + " FROM locations WHERE device_imei = :imei ORDER BY ts DESC LIMIT 1",
                    new MapSqlParameterSource("imei", imei), ROW_MAPPER);
            return Optional.ofNullable(l);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Location> findHistory(UUID orgId, String imei, Instant from, Instant to, int limit) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to))
                .addValue("limit", limit);
        return jdbc.query(
                "SELECT " + SELECT_FIELDS + " FROM locations" +
                        " WHERE org_id = :orgId AND device_imei = :imei" +
                        " AND ts >= :from AND ts < :to ORDER BY ts ASC LIMIT :limit",
                params, ROW_MAPPER);
    }

    /**
     * Find the most recent valid location BEFORE the given timestamp.
     * Used for trip distance calculation - gets the immediately previous point.
     */
    public Optional<Location> findPreviousValidLocation(UUID orgId, String imei, Instant beforeTs) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("beforeTs", Timestamp.from(beforeTs));
        try {
            Location l = jdbc.queryForObject(
                    "SELECT " + SELECT_FIELDS + " FROM locations" +
                            " WHERE org_id = :orgId AND device_imei = :imei" +
                            " AND ts < :beforeTs AND valid = true" +
                            " ORDER BY ts DESC LIMIT 1",
                    params, ROW_MAPPER);
            return Optional.ofNullable(l);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Location> findAllLastKnownForOrg(UUID orgId) {
        return jdbc.query("""
                SELECT DISTINCT ON (device_imei) %s
                FROM locations
                WHERE org_id = :orgId
                ORDER BY device_imei, ts DESC
                """.formatted(SELECT_FIELDS),
                new MapSqlParameterSource("orgId", orgId), ROW_MAPPER);
    }

    /**
     * The newest location per device paired with the newest location that actually
     * had a GPS fix.
     *
     * <p>The two differ whenever a device is transmitting without a fix (parked under
     * cover, antenna unplugged): {@code latest} carries current freshness/telemetry,
     * {@code lastValid} carries the coordinates we last knew to be true. Callers plot
     * {@code lastValid} and use {@code latest} to tell the user the position is stale.
     * {@code lastValid} is null for a device that has never reported a fix.
     */
    public record LastKnownFix(Location latest, Location lastValid) {}

    public List<LastKnownFix> findAllLastKnownWithFixForOrg(UUID orgId) {
        var params = new MapSqlParameterSource("orgId", orgId);
        List<Location> latest = jdbc.query("""
                SELECT DISTINCT ON (device_imei) %s
                FROM locations
                WHERE org_id = :orgId
                ORDER BY device_imei, ts DESC
                """.formatted(SELECT_FIELDS), params, ROW_MAPPER);

        Map<String, Location> lastValidByImei = jdbc.query("""
                SELECT DISTINCT ON (device_imei) %s
                FROM locations
                WHERE org_id = :orgId AND valid
                ORDER BY device_imei, ts DESC
                """.formatted(SELECT_FIELDS), params, ROW_MAPPER)
                .stream()
                .collect(Collectors.toMap(Location::deviceImei, l -> l));

        return latest.stream()
                .map(l -> new LastKnownFix(l, lastValidByImei.get(l.deviceImei())))
                .toList();
    }
}
