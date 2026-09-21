package com.webinnovation.motolink.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.motolink.domain.Alarm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.util.PGobject;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
@Slf4j
public class AlarmRepository {

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, device_imei, type, severity, ts, latitude, longitude,
                   acknowledged, acknowledged_by, acknowledged_at, process_result, process_notes,
                   metadata, created_at
            FROM alarms
            """;

    private final RowMapper<Alarm> rowMapper = (rs, rn) -> {
        Object lat = rs.getObject("latitude");
        Object lng = rs.getObject("longitude");
        OffsetDateTime ackedAt = rs.getObject("acknowledged_at", OffsetDateTime.class);
        Object metaObj = rs.getObject("metadata");
        Map<String, Object> metadata = parseMetadata(metaObj);
        return new Alarm(
                rs.getObject("id", UUID.class),
                rs.getObject("org_id", UUID.class),
                rs.getString("device_imei"),
                rs.getString("type"),
                rs.getString("severity"),
                rs.getObject("ts", OffsetDateTime.class).toInstant(),
                lat == null ? null : rs.getDouble("latitude"),
                lng == null ? null : rs.getDouble("longitude"),
                rs.getBoolean("acknowledged"),
                rs.getObject("acknowledged_by", UUID.class),
                ackedAt == null ? null : ackedAt.toInstant(),
                rs.getString("process_result"),
                rs.getString("process_notes"),
                metadata,
                rs.getObject("created_at", OffsetDateTime.class).toInstant()
        );
    };

    public UUID insert(UUID orgId, String imei, String type, String severity,
                       Instant ts, Double lat, Double lng, Map<String, Object> metadata) {
        UUID id = UUID.randomUUID();
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("type", type)
                .addValue("severity", severity)
                .addValue("ts", Timestamp.from(ts))
                .addValue("lat", lat)
                .addValue("lng", lng)
                .addValue("metadata", toJsonb(metadata));
        jdbc.update("""
                INSERT INTO alarms
                  (id, org_id, device_imei, type, severity, ts, geom, latitude, longitude, metadata)
                VALUES
                  (:id, :orgId, :imei, :type, :severity, :ts,
                   CASE WHEN :lng IS NOT NULL AND :lat IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                        ELSE NULL END,
                   :lat, :lng, :metadata)
                """, params);
        return id;
    }

    public Optional<Alarm> findByOrgAndId(UUID orgId, UUID id) {
        try {
            Alarm a = jdbc.queryForObject(
                    SELECT_FIELDS + " WHERE org_id = :orgId AND id = :id",
                    new MapSqlParameterSource("orgId", orgId).addValue("id", id),
                    rowMapper);
            return Optional.ofNullable(a);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Alarm> listForOrg(UUID orgId, Boolean onlyUnacked, int limit, int offset) {
        return listForOrg(orgId, new AlarmFilter(onlyUnacked, null, null, null, null, null, null), limit, offset);
    }

    /**
     * Optional filters for the alarm center; every field may be null.
     * {@code imeis} restricts results to the caller's visible devices: null = unrestricted,
     * empty = the caller may see no device at all (returns nothing).
     */
    public record AlarmFilter(Boolean onlyUnacked, String type, String severity, String imei,
                              Instant from, Instant to, Collection<String> imeis) {}

    public List<Alarm> listForOrg(UUID orgId, AlarmFilter f, int limit, int offset) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("limit", limit)
                .addValue("offset", offset);
        StringBuilder sql = new StringBuilder(SELECT_FIELDS).append(" WHERE org_id = :orgId");
        if (f.imeis() != null) {
            if (f.imeis().isEmpty()) return List.of();
            sql.append(" AND device_imei IN (:imeis)");
            params.addValue("imeis", f.imeis());
        }
        if (Boolean.TRUE.equals(f.onlyUnacked())) {
            sql.append(" AND acknowledged = false");
        }
        if (f.type() != null) {
            sql.append(" AND type = :type");
            params.addValue("type", f.type());
        }
        if (f.severity() != null) {
            sql.append(" AND severity = :severity");
            params.addValue("severity", f.severity());
        }
        if (f.imei() != null) {
            sql.append(" AND device_imei = :imei");
            params.addValue("imei", f.imei());
        }
        if (f.from() != null) {
            sql.append(" AND ts >= :from");
            params.addValue("from", Timestamp.from(f.from()));
        }
        if (f.to() != null) {
            sql.append(" AND ts < :to");
            params.addValue("to", Timestamp.from(f.to()));
        }
        sql.append(" ORDER BY ts DESC LIMIT :limit OFFSET :offset");
        return jdbc.query(sql.toString(), params, rowMapper);
    }

    public List<Alarm> listForDevice(UUID orgId, String imei, int limit, int offset) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("imei", imei)
                .addValue("limit", limit)
                .addValue("offset", offset);
        return jdbc.query(SELECT_FIELDS + """
                 WHERE org_id = :orgId AND device_imei = :imei
                 ORDER BY ts DESC
                 LIMIT :limit OFFSET :offset
                """, params, rowMapper);
    }

    public List<Alarm> findInRange(UUID orgId, Instant from, Instant to) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to));
        return jdbc.query(SELECT_FIELDS + """
                 WHERE org_id = :orgId AND ts >= :from AND ts < :to
                 ORDER BY ts ASC
                """, params, rowMapper);
    }

    /** Total alarms for the org since {@code since}. */
    public int countSince(UUID orgId, Instant since) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM alarms WHERE org_id = :orgId AND ts >= :since",
                new MapSqlParameterSource("orgId", orgId).addValue("since", Timestamp.from(since)),
                Integer.class);
        return n == null ? 0 : n;
    }

    /** Critical alarms for the org since {@code since}. */
    public int countCriticalSince(UUID orgId, Instant since) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM alarms WHERE org_id = :orgId AND ts >= :since AND severity = 'CRITICAL'",
                new MapSqlParameterSource("orgId", orgId).addValue("since", Timestamp.from(since)),
                Integer.class);
        return n == null ? 0 : n;
    }

    /** Unacknowledged alarms for the org (any age) — feeds the alerts badge. */
    public int countUnacknowledged(UUID orgId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM alarms WHERE org_id = :orgId AND acknowledged = false",
                new MapSqlParameterSource("orgId", orgId),
                Integer.class);
        return n == null ? 0 : n;
    }

    public boolean acknowledge(UUID orgId, UUID alarmId, UUID userId) {
        return acknowledge(orgId, alarmId, userId, null, null);
    }

    /** Acknowledge with an ADL-style processing result + note (both optional). */
    public boolean acknowledge(UUID orgId, UUID alarmId, UUID userId, String result, String notes) {
        int n = jdbc.update("""
                UPDATE alarms
                SET acknowledged = true, acknowledged_by = :uid, acknowledged_at = now(),
                    process_result = COALESCE(:result, process_result),
                    process_notes  = COALESCE(:notes, process_notes)
                WHERE org_id = :orgId AND id = :id AND acknowledged = false
                """, new MapSqlParameterSource("orgId", orgId)
                        .addValue("id", alarmId)
                        .addValue("uid", userId)
                        .addValue("result", result)
                        .addValue("notes", notes));
        return n > 0;
    }

    /** One row per (device, type) with its count — feeds the Alarm Overview report. */
    public record TypeCount(String imei, String type, int count) {}

    /** @param imeis null = every device in the org; empty = nothing. */
    public List<TypeCount> countByDeviceAndType(UUID orgId, Instant from, Instant to, Collection<String> imeis) {
        if (imeis != null && imeis.isEmpty()) return List.of();
        var params = new MapSqlParameterSource("orgId", orgId)
                .addValue("from", Timestamp.from(from))
                .addValue("to", Timestamp.from(to));
        String restrict = "";
        if (imeis != null) {
            restrict = " AND device_imei IN (:imeis)";
            params.addValue("imeis", imeis);
        }
        return jdbc.query("""
                SELECT device_imei, type, COUNT(*)::int AS n
                  FROM alarms
                 WHERE org_id = :orgId AND ts >= :from AND ts < :to
                """ + restrict + """
                 GROUP BY device_imei, type
                """, params,
                (rs, rn) -> new TypeCount(rs.getString("device_imei"), rs.getString("type"), rs.getInt("n")));
    }

    private PGobject toJsonb(Map<String, Object> metadata) {
        try {
            PGobject obj = new PGobject();
            obj.setType("jsonb");
            obj.setValue(objectMapper.writeValueAsString(metadata == null ? Map.of() : metadata));
            return obj;
        } catch (JsonProcessingException | SQLException e) {
            log.warn("Failed to encode alarm metadata as jsonb: {}", e.getMessage());
            try {
                PGobject empty = new PGobject();
                empty.setType("jsonb");
                empty.setValue("{}");
                return empty;
            } catch (SQLException ignored) {
                return null;
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseMetadata(Object raw) {
        if (raw == null) return Collections.emptyMap();
        try {
            String json = raw instanceof PGobject pg ? pg.getValue() : raw.toString();
            if (json == null || json.isBlank()) return Collections.emptyMap();
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            log.debug("alarm metadata parse failed: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
