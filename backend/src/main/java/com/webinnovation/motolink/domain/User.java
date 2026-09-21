package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

public record User(
        UUID id,
        UUID orgId,
        String email,
        String phone,
        String passwordHash,
        String fullName,
        String role,
        boolean isActive,
        boolean seeAllDevices,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt
) {}
