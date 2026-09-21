package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * A vehicle group. Groups belong to one user (V18): every user organises the
 * vehicles they can see into their own folders, like ADL Moto Viewer.
 */
public record DeviceGroup(
        UUID id,
        UUID orgId,
        UUID ownerUserId,
        String name,
        String description,
        String color,
        String icon,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt
) {}
