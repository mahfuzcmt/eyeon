package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.DeviceGroup;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.DeviceGroupRepository;
import com.webinnovation.motolink.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Per-user vehicle groups: a user only ever sees and edits their own. */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceGroupService {

    private final DeviceGroupRepository groupRepo;
    private final DeviceRepository deviceRepo;
    private final DeviceAccessService access;

    public List<DeviceGroup> listForOwner(UUID ownerUserId) {
        return groupRepo.listForOwner(ownerUserId);
    }

    public DeviceGroup getById(UUID ownerUserId, UUID id) {
        return groupRepo.findById(ownerUserId, id)
                .orElseThrow(() -> new NotFoundException("Device group not found: " + id));
    }

    public Map<UUID, Integer> getDeviceCounts(UUID ownerUserId) {
        return groupRepo.countMembersByGroup(ownerUserId);
    }

    /** imei -> group id, used to decorate the vehicle list for the current user. */
    public Map<String, UUID> membership(UUID ownerUserId) {
        return groupRepo.membershipForOwner(ownerUserId);
    }

    @Transactional
    public DeviceGroup create(UUID orgId, UUID ownerUserId, String name, String description, String color, String icon) {
        if (groupRepo.findByName(ownerUserId, name).isPresent()) {
            throw new DomainException("DUPLICATE_NAME", "A group with this name already exists");
        }
        int maxOrder = groupRepo.listForOwner(ownerUserId).stream()
                .mapToInt(DeviceGroup::sortOrder).max().orElse(-1);
        DeviceGroup created = groupRepo.create(orgId, ownerUserId, name, description,
                color != null ? color : "#0284C7", icon != null ? icon : "folder", maxOrder + 1);
        log.info("Created device group '{}' (id={}) for user={}", name, created.id(), ownerUserId);
        return created;
    }

    @Transactional
    public DeviceGroup update(UUID ownerUserId, UUID id, String name, String description, String color, String icon, Integer sortOrder) {
        DeviceGroup existing = getById(ownerUserId, id);
        if (name != null && !name.equals(existing.name()) && groupRepo.findByName(ownerUserId, name).isPresent()) {
            throw new DomainException("DUPLICATE_NAME", "A group with this name already exists");
        }
        if (groupRepo.update(ownerUserId, id, name, description, color, icon, sortOrder) == 0) {
            throw new NotFoundException("Device group not found: " + id);
        }
        return getById(ownerUserId, id);
    }

    @Transactional
    public void delete(UUID ownerUserId, UUID id) {
        if (groupRepo.delete(ownerUserId, id) == 0) {
            throw new NotFoundException("Device group not found: " + id);
        }
        log.info("Deleted device group id={} for user={}", id, ownerUserId);
    }

    /**
     * Files the vehicles into {@code groupId}; null moves them back to "Ungrouped".
     * Only vehicles in the org that the user may see are accepted.
     */
    @Transactional
    public void assignDevices(UUID orgId, UUID ownerUserId, String role, UUID groupId, List<String> imeis) {
        if (groupId != null) getById(ownerUserId, groupId);
        if (imeis == null || imeis.isEmpty()) return;
        Set<String> visible = access.visibleImeis(ownerUserId, role);
        Set<String> inOrg = deviceRepo.listForOrg(orgId).stream().map(Device::imei).collect(Collectors.toSet());
        List<String> accepted = imeis.stream()
                .filter(inOrg::contains)
                .filter(i -> DeviceAccessService.canSee(visible, i))
                .toList();
        int rows = groupId == null
                ? groupRepo.unassign(ownerUserId, accepted)
                : groupRepo.assign(ownerUserId, groupId, accepted);
        log.info("Moved {} vehicles to group {} for user={}", rows, groupId, ownerUserId);
    }

    @Transactional
    public void reorderGroups(UUID ownerUserId, List<UUID> groupIds) {
        groupRepo.reorder(ownerUserId, groupIds);
    }
}
