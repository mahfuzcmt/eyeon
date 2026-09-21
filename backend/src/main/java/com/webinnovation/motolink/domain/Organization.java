package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.UUID;

public record Organization(
        UUID id,
        String name,
        String slug,
        String planTier,
        String status,
        String contactEmail,
        String contactPhone,
        String address,
        String locale,
        String timezone,
        /** Org-owned Google Maps browser key; null = platform default. */
        String googleMapsApiKey,
        Instant createdAt,
        Instant updatedAt
) {}
