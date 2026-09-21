package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

public record AuditLog(
        long id,
        UUID orgId,
        UUID userId,
        String action,
        String resourceType,
        String resourceId,
        String metadataJson,
        String ipAddress,
        String userAgent,
        Instant ts
) {}
