package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.DeviceGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class DeviceGroupDtos {

    private DeviceGroupDtos() {}

    public record DeviceGroupView(
            UUID id,
            String name,
            String description,
            String color,
            String icon,
            int sortOrder,
            int deviceCount,
            Instant createdAt
    ) {
        public static DeviceGroupView of(DeviceGroup group, int deviceCount) {
            return new DeviceGroupView(
                    group.id(),
                    group.name(),
                    group.description(),
                    group.color(),
                    group.icon(),
                    group.sortOrder(),
                    deviceCount,
                    group.createdAt()
            );
        }
    }

    public record CreateGroupRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 500) String description,
            @Size(max = 20) String color,
            @Size(max = 50) String icon
    ) {}

    public record UpdateGroupRequest(
            @Size(max = 255) String name,
            @Size(max = 500) String description,
            @Size(max = 20) String color,
            @Size(max = 50) String icon,
            Integer sortOrder
    ) {}

    public record AssignDevicesRequest(
            List<String> imeis
    ) {}

    public record ReorderGroupsRequest(
            List<UUID> groupIds
    ) {}
}
