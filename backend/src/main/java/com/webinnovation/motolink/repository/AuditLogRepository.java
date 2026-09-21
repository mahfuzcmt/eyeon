package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.AuditLog;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AuditLogRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final RowMapper<AuditLog> ROW_MAPPER = (rs, rn) -> new AuditLog(
            rs.getLong("id"),
            rs.getObject("org_id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getString("action"),
            rs.getString("resource_type"),
            rs.getString("resource_id"),
            rs.getString("metadata"),
            rs.getString("ip_address"),
            rs.getString("user_agent"),
            rs.getObject("ts", OffsetDateTime.class).toInstant()
    );

    public void insert(UUID orgId, UUID userId, String action, String resourceType,
                       String resourceId, String metadataJson, String ipAddress, String userAgent) {
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("userId", userId)
                .addValue("action", action)
                .addValue("resourceType", resourceType)
                .addValue("resourceId", resourceId)
                .addValue("metadata", metadataJson)
                .addValue("ipAddress", ipAddress)
                .addValue("userAgent", userAgent);
        jdbc.update("""
                INSERT INTO audit_log
                  (org_id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
                VALUES
                  (:orgId, :userId, :action, :resourceType, :resourceId,
                   CAST(:metadata AS jsonb), CAST(:ipAddress AS inet), :userAgent)
                """, params);
    }

    public List<AuditLog> findByOrg(UUID orgId, Instant from, Instant to,
                                    String action, UUID userId, String resourceType,
                                    int limit, int offset) {
        StringBuilder sql = new StringBuilder(
                "SELECT * FROM audit_log WHERE org_id = :orgId");
        var params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("limit", Math.min(limit, 500))
                .addValue("offset", Math.max(offset, 0));
        if (from != null) {
            sql.append(" AND ts >= :from");
            params.addValue("from", OffsetDateTime.ofInstant(from, java.time.ZoneOffset.UTC));
        }
        if (to != null) {
            sql.append(" AND ts <= :to");
            params.addValue("to", OffsetDateTime.ofInstant(to, java.time.ZoneOffset.UTC));
        }
        if (action != null && !action.isBlank()) {
            sql.append(" AND action = :action");
            params.addValue("action", action);
        }
        if (userId != null) {
            sql.append(" AND user_id = :userId");
            params.addValue("userId", userId);
        }
        if (resourceType != null && !resourceType.isBlank()) {
            sql.append(" AND resource_type = :resourceType");
            params.addValue("resourceType", resourceType);
        }
        sql.append(" ORDER BY ts DESC LIMIT :limit OFFSET :offset");
        return jdbc.query(sql.toString(), params, ROW_MAPPER);
    }

    public List<AuditLog> findAll(Instant from, Instant to, UUID orgId, String action,
                                  int limit, int offset) {
        StringBuilder sql = new StringBuilder("SELECT * FROM audit_log WHERE 1=1");
        var params = new MapSqlParameterSource()
                .addValue("limit", Math.min(limit, 500))
                .addValue("offset", Math.max(offset, 0));
        if (from != null) {
            sql.append(" AND ts >= :from");
            params.addValue("from", OffsetDateTime.ofInstant(from, java.time.ZoneOffset.UTC));
        }
        if (to != null) {
            sql.append(" AND ts <= :to");
            params.addValue("to", OffsetDateTime.ofInstant(to, java.time.ZoneOffset.UTC));
        }
        if (orgId != null) {
            sql.append(" AND org_id = :orgId");
            params.addValue("orgId", orgId);
        }
        if (action != null && !action.isBlank()) {
            sql.append(" AND action = :action");
            params.addValue("action", action);
        }
        sql.append(" ORDER BY ts DESC LIMIT :limit OFFSET :offset");
        List<AuditLog> rows = new ArrayList<>(jdbc.query(sql.toString(), params, ROW_MAPPER));
        return rows;
    }
}
