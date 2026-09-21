package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.domain.enums.PersonType;
import com.webinnovation.eyeon.dto.DeviceDtos.DeviceUpdateRequest;
import com.webinnovation.eyeon.dto.DeviceDtos.DeviceView;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.exception.ForbiddenException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.SubscriptionRepository;
import com.webinnovation.eyeon.repository.SubscriptionRepository.SubInfo;
import com.webinnovation.eyeon.repository.TripRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.DeviceGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceRepository deviceRepo;
    private final SubscriptionRepository subscriptionRepo;
    private final TripRepository tripRepo;
    private final UserRepository userRepo;
    private final DeviceGroupService groupService;

    @GetMapping
    public List<DeviceView> list(@RequestParam(value = "status", required = false) String status) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        boolean seeAllDevices = canSeeAllDevices(userId);

        List<Device> devices;
        if (status == null || status.isBlank()) {
            devices = deviceRepo.listForUser(orgId, userId, seeAllDevices);
        } else {
            // For status filter, get user's visible devices then filter
            devices = deviceRepo.listForUser(orgId, userId, seeAllDevices).stream()
                    .filter(d -> status.equalsIgnoreCase(d.status()))
                    .toList();
        }

        Map<String, SubInfo> subs = subscriptionRepo.latestByOrg(orgId);
        Map<String, Instant> parked = tripRepo.parkedSinceByImei(orgId);
        Map<String, UUID> groups = userId == null ? Map.of() : groupService.membership(userId);
        return devices.stream()
                .map(d -> DeviceView.of(d, subs.get(d.imei()), parked.get(d.imei()), groups.get(d.imei())))
                .toList();
    }

    @GetMapping("/{imei}")
    public DeviceView get(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        boolean seeAllDevices = canSeeAllDevices(userId);

        // Check access
        if (!deviceRepo.canUserAccessDevice(orgId, userId, imei, seeAllDevices)) {
            throw new ForbiddenException("You do not have access to this device");
        }

        Device d = deviceRepo.findByOrgAndImei(orgId, imei)
                .orElseThrow(() -> new NotFoundException("device", imei));
        return DeviceView.of(d,
                subscriptionRepo.latestForImei(orgId, imei).orElse(null),
                tripRepo.parkedSinceForImei(orgId, imei).orElse(null),
                groupFor(imei));
    }

    /** The calling user's group for this vehicle, if they filed it into one. */
    private UUID groupFor(String imei) {
        UUID userId = TenantContext.currentUserId();
        return userId == null ? null : groupService.membership(userId).get(imei);
    }

    private boolean canSeeAllDevices(UUID userId) {
        if (userId == null) return true; // fallback
        String role = TenantContext.currentRole();
        // Admins always see all devices
        if ("SUPER_ADMIN".equals(role) || "ORG_ADMIN".equals(role)) {
            return true;
        }
        // Check user's seeAllDevices flag
        return userRepo.findById(userId)
                .map(User::seeAllDevices)
                .orElse(false);
    }

    private static final Pattern HEX_COLOR = Pattern.compile("#[0-9a-fA-F]{6}");

    @PatchMapping("/{imei}")
    public DeviceView update(@PathVariable String imei, @RequestBody DeviceUpdateRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        boolean seeAllDevices = canSeeAllDevices(userId);

        // Check access
        if (!deviceRepo.canUserAccessDevice(orgId, userId, imei, seeAllDevices)) {
            throw new ForbiddenException("You do not have access to this device");
        }

        // `vehicleType` is the inherited field name; its values are person types (BOY/GIRL/PERSON).
        String personType = null;
        if (req.vehicleType() != null && !req.vehicleType().isBlank()) {
            personType = PersonType.canonical(req.vehicleType());
            if (personType == null) {
                throw new DomainException("INVALID_PERSON_TYPE",
                        "Type must be one of " + PersonType.NAMES.stream().sorted().toList());
            }
        }
        if (req.iconColor() != null && !HEX_COLOR.matcher(req.iconColor()).matches()) {
            throw new DomainException("INVALID_ICON_COLOR", "iconColor must be #RRGGBB");
        }
        int updated = deviceRepo.updateProfile(orgId, imei,
                req.name(), req.simMsisdn(), req.vehiclePlate(), personType, req.iconColor());
        if (updated == 0) throw new NotFoundException("device", imei);
        Device d = deviceRepo.findByOrgAndImei(orgId, imei)
                .orElseThrow(() -> new NotFoundException("device", imei));
        return DeviceView.of(d,
                subscriptionRepo.latestForImei(orgId, imei).orElse(null),
                tripRepo.parkedSinceForImei(orgId, imei).orElse(null),
                groupFor(imei));
    }
}
