package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.Organization;
import com.webinnovation.motolink.domain.User;
import com.webinnovation.motolink.dto.OrgDtos.OrgUpdate;
import com.webinnovation.motolink.dto.OrgDtos.OrgView;
import com.webinnovation.motolink.dto.OrgDtos.UserCreate;
import com.webinnovation.motolink.dto.OrgDtos.UserUpdate;
import com.webinnovation.motolink.dto.OrgDtos.UserView;
import com.webinnovation.motolink.dto.UserDeviceDtos.AssignDevicesRequest;
import com.webinnovation.motolink.dto.UserDeviceDtos.SetUserDevicesRequest;
import com.webinnovation.motolink.dto.UserDeviceDtos.UpdateSeeAllDevicesRequest;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.exception.ForbiddenException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.OrganizationRepository;
import com.webinnovation.motolink.repository.UserDeviceRepository;
import com.webinnovation.motolink.repository.UserRepository;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import com.webinnovation.motolink.util.GoogleMapsKey;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/orgs")
@RequiredArgsConstructor
public class OrgController {

    private static final String ROLE_ADMIN = "ORG_ADMIN";
    private static final String ROLE_SUPER = "SUPER_ADMIN";

    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final UserDeviceRepository userDeviceRepo;
    private final DeviceRepository deviceRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    @GetMapping("/me")
    public OrgView getMyOrg() {
        UUID orgId = TenantContext.requireOrgId();
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new NotFoundException("organization", orgId.toString()));
        return OrgView.of(org);
    }

    @PatchMapping("/me")
    public OrgView updateMyOrg(@RequestBody OrgUpdate body) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();
        int rows = orgRepo.update(orgId, body.name(), body.contactEmail(), body.contactPhone(),
                body.address(), body.locale(), body.timezone());
        if (rows == 0) {
            throw new NotFoundException("organization", orgId.toString());
        }
        // Map key: null = untouched, blank = clear, otherwise must look like a browser key.
        if (body.googleMapsApiKey() != null) {
            String key = GoogleMapsKey.normalize(body.googleMapsApiKey());
            if (key != null && !GoogleMapsKey.isValid(key)) {
                throw new DomainException("INVALID_MAPS_KEY",
                        "That does not look like a Google Maps browser API key (AIza… , 39 characters)");
            }
            orgRepo.updateGoogleMapsApiKey(orgId, key);
        }
        Organization updated = orgRepo.findById(orgId).orElseThrow();
        // Never log the key itself; the field list says it changed, the value stays in the DB.
        audit.record("ORG_UPDATE", "organization", orgId.toString(),
                Map.of("fields", nonNullFields(body)));
        return OrgView.of(updated);
    }

    @GetMapping("/me/users")
    public List<UserView> listUsers() {
        UUID orgId = TenantContext.requireOrgId();
        return userRepo.listByOrg(orgId).stream()
                .map(u -> UserView.of(u, userDeviceRepo.countByUser(u.id())))
                .toList();
    }

    @PostMapping("/me/users")
    public ResponseEntity<UserView> createUser(@Valid @RequestBody UserCreate body) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();

        if (userRepo.findByEmail(body.email()).isPresent()) {
            throw new DomainException("EMAIL_TAKEN", "Email already in use");
        }
        String role = normalizeRole(body.role());
        UUID id = userRepo.createInOrg(orgId, body.email(), body.phone(),
                passwordEncoder.encode(body.password()), body.fullName(), role);
        User created = userRepo.findById(id).orElseThrow();

        audit.record("USER_CREATE", "user", id.toString(),
                Map.of("email", body.email(), "role", role));
        return ResponseEntity.status(HttpStatus.CREATED).body(UserView.of(created));
    }

    @PatchMapping("/me/users/{id}")
    public UserView updateUser(@PathVariable UUID id, @RequestBody UserUpdate body) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();

        User existing = userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("user", id.toString()));
        if (!orgId.equals(existing.orgId())) {
            throw new NotFoundException("user", id.toString());
        }

        String role = body.role() == null ? null : normalizeRole(body.role());
        userRepo.update(id, orgId, body.fullName(), body.phone(), role, body.isActive());

        if (body.password() != null && !body.password().isBlank()) {
            if (body.password().length() < 8) {
                throw new DomainException("WEAK_PASSWORD", "Password must be at least 8 characters");
            }
            userRepo.updatePassword(id, orgId, passwordEncoder.encode(body.password()));
        }

        User updated = userRepo.findById(id).orElseThrow();
        audit.record("USER_UPDATE", "user", id.toString(),
                Map.of("fields", nonNullFields(body), "passwordChanged",
                        body.password() != null && !body.password().isBlank()));
        return UserView.of(updated);
    }

    @DeleteMapping("/me/users/{id}")
    public ResponseEntity<Void> disableUser(@PathVariable UUID id) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();
        UUID self = TenantContext.currentUserId();
        if (id.equals(self)) {
            throw new DomainException("SELF_DISABLE",
                    "You cannot disable your own account");
        }
        int rows = userRepo.softDelete(id, orgId);
        if (rows == 0) {
            throw new NotFoundException("user", id.toString());
        }
        audit.record("USER_DISABLE", "user", id.toString(), null);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────
    // User-Device Assignments
    // ─────────────────────────────────────────────────────────────

    /**
     * Get devices assigned to a specific user.
     */
    @GetMapping("/me/users/{userId}/devices")
    public List<String> getUserDevices(@PathVariable UUID userId) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();
        verifyUserInOrg(userId, orgId);
        return userDeviceRepo.getDeviceImeis(userId);
    }

    /**
     * Assign devices to a user.
     */
    @PostMapping("/me/users/{userId}/devices")
    public ResponseEntity<List<String>> assignDevices(
            @PathVariable UUID userId,
            @Valid @RequestBody AssignDevicesRequest body) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();
        UUID assignedBy = TenantContext.currentUserId();

        verifyUserInOrg(userId, orgId);
        verifyDevicesInOrg(body.deviceImeis(), orgId);

        userDeviceRepo.assignMultiple(userId, body.deviceImeis(), assignedBy);

        audit.record("USER_DEVICES_ASSIGN", "user", userId.toString(),
                Map.of("devices", body.deviceImeis()));

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userDeviceRepo.getDeviceImeis(userId));
    }

    /**
     * Set (replace) all device assignments for a user.
     */
    @PatchMapping("/me/users/{userId}/devices")
    public List<String> setUserDevices(
            @PathVariable UUID userId,
            @Valid @RequestBody SetUserDevicesRequest body) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();
        UUID assignedBy = TenantContext.currentUserId();

        verifyUserInOrg(userId, orgId);
        if (body.deviceImeis() != null && !body.deviceImeis().isEmpty()) {
            verifyDevicesInOrg(body.deviceImeis(), orgId);
        }

        List<String> imeis = body.deviceImeis() == null ? List.of() : body.deviceImeis();
        userDeviceRepo.replaceAssignments(userId, imeis, assignedBy);

        audit.record("USER_DEVICES_SET", "user", userId.toString(),
                Map.of("devices", imeis));

        return userDeviceRepo.getDeviceImeis(userId);
    }

    /**
     * Unassign a specific device from a user.
     */
    @DeleteMapping("/me/users/{userId}/devices/{imei}")
    public ResponseEntity<Void> unassignDevice(
            @PathVariable UUID userId,
            @PathVariable String imei) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();

        verifyUserInOrg(userId, orgId);

        userDeviceRepo.unassign(userId, imei);

        audit.record("USER_DEVICE_UNASSIGN", "user", userId.toString(),
                Map.of("device", imei));

        return ResponseEntity.noContent().build();
    }

    /**
     * Update user's seeAllDevices setting.
     */
    @PatchMapping("/me/users/{userId}/see-all-devices")
    public UserView updateSeeAllDevices(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateSeeAllDevicesRequest body) {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();

        User user = verifyUserInOrg(userId, orgId);

        userRepo.updateSeeAllDevices(userId, orgId, body.seeAllDevices());

        audit.record("USER_SEE_ALL_DEVICES_UPDATE", "user", userId.toString(),
                Map.of("seeAllDevices", body.seeAllDevices()));

        User updated = userRepo.findById(userId).orElseThrow();
        return UserView.of(updated, userDeviceRepo.countByUser(userId));
    }

    /**
     * Get all org devices with user assignment info (for assignment UI).
     */
    @GetMapping("/me/devices/assignments")
    public List<Map<String, Object>> getDeviceAssignments() {
        requireAdmin();
        UUID orgId = TenantContext.requireOrgId();

        List<Device> devices = deviceRepo.listForOrg(orgId);
        List<User> users = userRepo.listByOrg(orgId);

        return devices.stream().map(d -> {
            List<UUID> assignedUserIds = userDeviceRepo.getUserIds(d.imei());
            List<Map<String, Object>> assignedUsers = users.stream()
                    .filter(u -> assignedUserIds.contains(u.id()))
                    .map(u -> Map.<String, Object>of(
                            "id", u.id(),
                            "email", u.email(),
                            "fullName", u.fullName() != null ? u.fullName() : ""))
                    .toList();

            return Map.<String, Object>of(
                    "imei", d.imei(),
                    "name", d.name() != null ? d.name() : "",
                    "vehiclePlate", d.vehiclePlate() != null ? d.vehiclePlate() : "",
                    "assignedUsers", assignedUsers);
        }).toList();
    }

    private User verifyUserInOrg(UUID userId, UUID orgId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("user", userId.toString()));
        if (!orgId.equals(user.orgId())) {
            throw new NotFoundException("user", userId.toString());
        }
        return user;
    }

    private void verifyDevicesInOrg(List<String> imeis, UUID orgId) {
        for (String imei : imeis) {
            Device device = deviceRepo.findByImei(imei)
                    .orElseThrow(() -> new NotFoundException("device", imei));
            if (!orgId.equals(device.orgId())) {
                throw new DomainException("DEVICE_NOT_IN_ORG",
                        "Device " + imei + " does not belong to this organization");
            }
        }
    }

    private static void requireAdmin() {
        String role = TenantContext.currentRole();
        if (role == null || (!ROLE_ADMIN.equals(role) && !ROLE_SUPER.equals(role))) {
            throw new ForbiddenException("Admin role required");
        }
    }

    private static String normalizeRole(String role) {
        String r = role == null ? "" : role.trim().toUpperCase();
        return switch (r) {
            case "SUPER_ADMIN", "ORG_ADMIN", "ORG_USER" -> r;
            default -> throw new DomainException("INVALID_ROLE",
                    "Role must be one of SUPER_ADMIN, ORG_ADMIN, ORG_USER");
        };
    }

    private static List<String> nonNullFields(Object record) {
        var fields = new java.util.ArrayList<String>();
        for (var c : record.getClass().getRecordComponents()) {
            try {
                Object v = c.getAccessor().invoke(record);
                if (v != null) fields.add(c.getName());
            } catch (Exception ignored) { /* skip */ }
        }
        return fields;
    }
}
