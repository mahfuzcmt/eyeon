package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.Organization;
import com.webinnovation.motolink.dto.AdminDtos.AdminStats;
import com.webinnovation.motolink.dto.AdminDtos.DeviceAdminView;
import com.webinnovation.motolink.dto.AdminDtos.DeviceReassign;
import com.webinnovation.motolink.dto.AdminDtos.OrgAdminView;
import com.webinnovation.motolink.dto.AdminDtos.OrgCreate;
import com.webinnovation.motolink.dto.AdminDtos.OrgStatusUpdate;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.exception.ForbiddenException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.OrganizationRepository;
import com.webinnovation.motolink.repository.UserRepository;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Super Admin controller for managing organizations and device assignments.
 * All endpoints require SUPER_ADMIN role (CLAUDE.md §11.3).
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private static final String ROLE_SUPER = "SUPER_ADMIN";
    private static final Set<String> VALID_STATUSES = Set.of("ACTIVE", "SUSPENDED", "CANCELLED");

    private final OrganizationRepository orgRepo;
    private final DeviceRepository deviceRepo;
    private final UserRepository userRepo;
    private final AuditService audit;

    // ─────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public AdminStats getStats() {
        requireSuperAdmin();
        List<Organization> orgs = orgRepo.findAll();
        int activeOrgs = (int) orgs.stream().filter(o -> "ACTIVE".equals(o.status())).count();
        return new AdminStats(
                orgs.size(),
                activeOrgs,
                deviceRepo.countAll(),
                deviceRepo.countOnline(),
                (int) userRepo.count()
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Organizations
    // ─────────────────────────────────────────────────────────────

    @GetMapping("/orgs")
    public List<OrgAdminView> listOrgs() {
        requireSuperAdmin();
        return orgRepo.findAll().stream()
                .map(o -> OrgAdminView.of(o, orgRepo.countDevices(o.id()), orgRepo.countUsers(o.id())))
                .toList();
    }

    @GetMapping("/orgs/{id}")
    public OrgAdminView getOrg(@PathVariable UUID id) {
        requireSuperAdmin();
        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("organization", id.toString()));
        return OrgAdminView.of(org, orgRepo.countDevices(id), orgRepo.countUsers(id));
    }

    @PostMapping("/orgs")
    public ResponseEntity<OrgAdminView> createOrg(@Valid @RequestBody OrgCreate body) {
        requireSuperAdmin();

        // Validate slug uniqueness
        String slug = body.slug().toLowerCase().replaceAll("[^a-z0-9-]", "-");
        if (orgRepo.slugExists(slug)) {
            throw new DomainException("SLUG_TAKEN", "Organization slug already in use");
        }

        UUID id = orgRepo.create(body.name(), slug, body.planTier(),
                body.contactEmail(), body.contactPhone(), body.address());

        Organization created = orgRepo.findById(id).orElseThrow();
        audit.record("ADMIN_ORG_CREATE", "organization", id.toString(),
                Map.of("name", body.name(), "slug", slug));

        log.info("Super admin created organization: {} ({})", body.name(), slug);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(OrgAdminView.of(created, 0, 0));
    }

    @PatchMapping("/orgs/{id}/status")
    public OrgAdminView updateOrgStatus(@PathVariable UUID id, @Valid @RequestBody OrgStatusUpdate body) {
        requireSuperAdmin();

        String status = body.status().toUpperCase();
        if (!VALID_STATUSES.contains(status)) {
            throw new DomainException("INVALID_STATUS",
                    "Status must be one of: ACTIVE, SUSPENDED, CANCELLED");
        }

        int rows = orgRepo.updateStatus(id, status);
        if (rows == 0) {
            throw new NotFoundException("organization", id.toString());
        }

        Organization updated = orgRepo.findById(id).orElseThrow();
        audit.record("ADMIN_ORG_STATUS_UPDATE", "organization", id.toString(),
                Map.of("status", status));

        log.info("Super admin updated org {} status to {}", id, status);
        return OrgAdminView.of(updated, orgRepo.countDevices(id), orgRepo.countUsers(id));
    }

    // ─────────────────────────────────────────────────────────────
    // Devices
    // ─────────────────────────────────────────────────────────────

    @GetMapping("/devices")
    public List<DeviceAdminView> listDevices(@RequestParam(required = false) UUID orgId) {
        requireSuperAdmin();

        // Build org name lookup
        Map<UUID, String> orgNames = orgRepo.findAll().stream()
                .collect(Collectors.toMap(Organization::id, Organization::name));

        return deviceRepo.listAllWithFilter(orgId).stream()
                .map(d -> DeviceAdminView.of(d, orgNames.getOrDefault(d.orgId(), "Unknown")))
                .toList();
    }

    @GetMapping("/devices/{imei}")
    public DeviceAdminView getDevice(@PathVariable String imei) {
        requireSuperAdmin();
        Device device = deviceRepo.findByImei(imei)
                .orElseThrow(() -> new NotFoundException("device", imei));

        String orgName = orgRepo.findById(device.orgId())
                .map(Organization::name)
                .orElse("Unknown");

        return DeviceAdminView.of(device, orgName);
    }

    @PatchMapping("/devices/{imei}/org")
    public DeviceAdminView reassignDevice(@PathVariable String imei,
                                           @Valid @RequestBody DeviceReassign body) {
        requireSuperAdmin();

        // Validate device exists
        Device device = deviceRepo.findByImei(imei)
                .orElseThrow(() -> new NotFoundException("device", imei));

        // Validate target org exists
        UUID targetOrgId;
        try {
            targetOrgId = UUID.fromString(body.targetOrgId());
        } catch (IllegalArgumentException e) {
            throw new DomainException("INVALID_ORG_ID", "Invalid organization ID format");
        }

        Organization targetOrg = orgRepo.findById(targetOrgId)
                .orElseThrow(() -> new NotFoundException("organization", body.targetOrgId()));

        // Check not already in target org
        if (device.orgId().equals(targetOrgId)) {
            throw new DomainException("SAME_ORG", "Device is already in this organization");
        }

        // Reassign
        UUID oldOrgId = device.orgId();
        int rows = deviceRepo.reassignOrg(imei, targetOrgId);
        if (rows == 0) {
            throw new DomainException("REASSIGN_FAILED", "Failed to reassign device");
        }

        audit.record("ADMIN_DEVICE_REASSIGN", "device", imei,
                Map.of("fromOrg", oldOrgId.toString(), "toOrg", targetOrgId.toString()));

        log.info("Super admin reassigned device {} from org {} to {}",
                imei, oldOrgId, targetOrgId);

        Device updated = deviceRepo.findByImei(imei).orElseThrow();
        return DeviceAdminView.of(updated, targetOrg.name());
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private void requireSuperAdmin() {
        String role = TenantContext.currentRole();
        if (!ROLE_SUPER.equals(role)) {
            throw new ForbiddenException("Super Admin role required");
        }
    }
}
