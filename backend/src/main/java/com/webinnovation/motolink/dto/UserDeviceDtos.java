package com.webinnovation.motolink.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

/**
 * DTOs for user-device assignment operations.
 */
public final class UserDeviceDtos {

    private UserDeviceDtos() {}

    /**
     * Request to assign devices to a user.
     * Note: userId is taken from the path, not the body.
     */
    public record AssignDevicesRequest(
            @NotEmpty List<String> deviceImeis
    ) {}

    /**
     * Request to unassign a device from a user.
     * Note: userId and deviceImei are taken from the path.
     */
    public record UnassignDeviceRequest(
            @NotBlank String deviceImei
    ) {}

    /**
     * Request to replace all device assignments for a user.
     * Note: userId is taken from the path.
     */
    public record SetUserDevicesRequest(
            List<String> deviceImeis  // can be empty or null to clear all assignments
    ) {}

    /**
     * Request to update user's seeAllDevices setting.
     * Note: userId is taken from the path.
     */
    public record UpdateSeeAllDevicesRequest(
            boolean seeAllDevices
    ) {}

    /**
     * View of a user with their device assignment info.
     */
    public record UserDeviceAssignmentView(
            UUID userId,
            String email,
            String fullName,
            String role,
            boolean seeAllDevices,
            int assignedDeviceCount,
            List<String> assignedImeis
    ) {}

    /**
     * View of device assignment details.
     */
    public record DeviceAssignmentView(
            String imei,
            String name,
            String vehiclePlate,
            List<AssignedUserInfo> assignedUsers
    ) {}

    /**
     * Brief info about a user assigned to a device.
     */
    public record AssignedUserInfo(
            UUID userId,
            String email,
            String fullName
    ) {}
}
