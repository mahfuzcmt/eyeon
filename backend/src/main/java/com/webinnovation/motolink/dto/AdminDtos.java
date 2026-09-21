package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.Organization;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * DTOs for Super Admin operations (CLAUDE.md §11.3).
 */
public final class AdminDtos {

    private AdminDtos() {}

    // ─────────────────────────────────────────────────────────────
    // Organization DTOs
    // ─────────────────────────────────────────────────────────────

    public record OrgCreate(
            @NotBlank @Size(min = 2, max = 255) String name,
            @NotBlank @Size(min = 2, max = 100) String slug,
            String planTier,
            String contactEmail,
            String contactPhone,
            String address
    ) {}

    public record OrgStatusUpdate(
            @NotBlank String status  // ACTIVE, SUSPENDED, CANCELLED
    ) {}

    public record OrgAdminView(
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
            int deviceCount,
            int userCount,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static OrgAdminView of(Organization o, int deviceCount, int userCount) {
            return new OrgAdminView(
                    o.id(), o.name(), o.slug(), o.planTier(), o.status(),
                    o.contactEmail(), o.contactPhone(), o.address(),
                    o.locale(), o.timezone(),
                    deviceCount, userCount,
                    o.createdAt(), o.updatedAt());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Device DTOs (Admin view with org info)
    // ─────────────────────────────────────────────────────────────

    public record DeviceReassign(
            @NotBlank String targetOrgId
    ) {}

    public record DeviceAdminView(
            UUID id,
            UUID orgId,
            String orgName,
            String imei,
            String name,
            String simMsisdn,
            String vehiclePlate,
            String vehicleType,
            String status,
            Instant lastSeenAt,
            Double lastLat,
            Double lastLng,
            Integer lastSpeed,
            Integer lastVoltageMv,
            Instant createdAt
    ) {
        public static DeviceAdminView of(Device d, String orgName) {
            return new DeviceAdminView(
                    d.id(), d.orgId(), orgName,
                    d.imei(), d.name(), d.simMsisdn(),
                    d.vehiclePlate(), d.vehicleType(),
                    d.status(), d.lastSeenAt(),
                    d.lastLatitude(), d.lastLongitude(),
                    d.lastSpeed(), d.lastVoltageMv(),
                    d.createdAt());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────

    public record AdminStats(
            int totalOrgs,
            int activeOrgs,
            int totalDevices,
            int onlineDevices,
            int totalUsers
    ) {}
}
