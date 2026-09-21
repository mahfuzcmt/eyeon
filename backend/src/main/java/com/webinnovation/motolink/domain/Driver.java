package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Driver entity for tracking who drives vehicles.
 * Supports RFID identification, license tracking, and assignment history.
 */
public record Driver(
        UUID id,
        UUID orgId,
        String name,
        String phone,
        String email,
        String licenseNo,
        String licenseType,
        LocalDate licenseExpiry,
        String nid,
        String photoUrl,
        String rfidCard,
        String emergencyContact,
        String emergencyPhone,
        String address,
        LocalDate dateOfBirth,
        LocalDate hireDate,
        String status,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_INACTIVE = "INACTIVE";
    public static final String STATUS_SUSPENDED = "SUSPENDED";

    public boolean isActive() {
        return STATUS_ACTIVE.equals(status);
    }

    public boolean isLicenseExpired() {
        return licenseExpiry != null && licenseExpiry.isBefore(LocalDate.now());
    }

    public boolean isLicenseExpiringSoon() {
        if (licenseExpiry == null) return false;
        LocalDate thirtyDaysFromNow = LocalDate.now().plusDays(30);
        return licenseExpiry.isBefore(thirtyDaysFromNow) && !isLicenseExpired();
    }
}
