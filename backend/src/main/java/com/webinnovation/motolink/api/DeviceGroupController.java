package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.DeviceGroup;
import com.webinnovation.motolink.dto.DeviceGroupDtos.*;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.DeviceGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Vehicle groups of the calling user (groups are per user since V18). */
@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
public class DeviceGroupController {

    private final DeviceGroupService groupService;

    private static UUID owner() {
        return TenantContext.requireUserId();
    }

    @GetMapping
    public List<DeviceGroupView> list() {
        UUID owner = owner();
        Map<UUID, Integer> counts = groupService.getDeviceCounts(owner);
        return groupService.listForOwner(owner).stream()
                .map(g -> DeviceGroupView.of(g, counts.getOrDefault(g.id(), 0)))
                .toList();
    }

    @GetMapping("/{id}")
    public DeviceGroupView get(@PathVariable UUID id) {
        UUID owner = owner();
        DeviceGroup group = groupService.getById(owner, id);
        return DeviceGroupView.of(group, groupService.getDeviceCounts(owner).getOrDefault(group.id(), 0));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeviceGroupView create(@Valid @RequestBody CreateGroupRequest req) {
        DeviceGroup group = groupService.create(TenantContext.requireOrgId(), owner(),
                req.name(), req.description(), req.color(), req.icon());
        return DeviceGroupView.of(group, 0);
    }

    @PatchMapping("/{id}")
    public DeviceGroupView update(@PathVariable UUID id, @Valid @RequestBody UpdateGroupRequest req) {
        UUID owner = owner();
        DeviceGroup group = groupService.update(owner, id, req.name(), req.description(),
                req.color(), req.icon(), req.sortOrder());
        return DeviceGroupView.of(group, groupService.getDeviceCounts(owner).getOrDefault(group.id(), 0));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        groupService.delete(owner(), id);
    }

    @PostMapping("/{id}/devices")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assignDevices(@PathVariable UUID id, @Valid @RequestBody AssignDevicesRequest req) {
        groupService.assignDevices(TenantContext.requireOrgId(), owner(), TenantContext.currentRole(), id, req.imeis());
    }

    @DeleteMapping("/{id}/devices")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassignDevices(@PathVariable UUID id, @Valid @RequestBody AssignDevicesRequest req) {
        groupService.assignDevices(TenantContext.requireOrgId(), owner(), TenantContext.currentRole(), null, req.imeis());
    }

    @PostMapping("/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@Valid @RequestBody ReorderGroupsRequest req) {
        groupService.reorderGroups(owner(), req.groupIds());
    }
}
