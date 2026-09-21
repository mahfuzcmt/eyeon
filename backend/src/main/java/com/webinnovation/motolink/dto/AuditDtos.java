package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.AuditLog;

import java.time.Instant;
import java.util.UUID;

public final class AuditDtos {

    private AuditDtos() {}

    public record AuditLogView(
            long id,
            UUID orgId,
            UUID userId,
            String action,
            String resourceType,
            String resourceId,
            String metadata,
            String ipAddress,
            String userAgent,
            Instant ts
    ) {
        public static AuditLogView of(AuditLog a) {
            return new AuditLogView(
                    a.id(), a.orgId(), a.userId(), a.action(), a.resourceType(),
                    a.resourceId(), a.metadataJson(), a.ipAddress(), a.userAgent(), a.ts());
        }
    }
}
