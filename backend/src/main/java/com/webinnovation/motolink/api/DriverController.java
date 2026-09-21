package com.webinnovation.motolink.api;

import com.webinnovation.motolink.domain.Driver;
import com.webinnovation.motolink.dto.DriverDtos.*;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @GetMapping
    public List<DriverView> list(@RequestParam(required = false) String status) {
        UUID orgId = TenantContext.requireOrgId();
        List<Driver> drivers = status != null && !status.isBlank()
                ? driverService.listByStatus(orgId, status)
                : driverService.listForOrg(orgId);
        Map<UUID, Integer> counts = driverService.getDeviceCounts(orgId);

        return drivers.stream()
                .map(d -> DriverView.of(d, counts.getOrDefault(d.id(), 0)))
                .toList();
    }

    @GetMapping("/{id}")
    public DriverView get(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        Driver driver = driverService.getById(orgId, id);
        Map<UUID, Integer> counts = driverService.getDeviceCounts(orgId);
        return DriverView.of(driver, counts.getOrDefault(driver.id(), 0));
    }

    @GetMapping("/expiring-licenses")
    public List<DriverView> getExpiringLicenses(
            @RequestParam(defaultValue = "30") int daysAhead) {
        UUID orgId = TenantContext.requireOrgId();
        List<Driver> drivers = driverService.getExpiringLicenses(orgId, daysAhead);
        Map<UUID, Integer> counts = driverService.getDeviceCounts(orgId);

        return drivers.stream()
                .map(d -> DriverView.of(d, counts.getOrDefault(d.id(), 0)))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DriverView create(@Valid @RequestBody CreateDriverRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        Driver driver = driverService.create(
                orgId,
                req.name(),
                req.phone(),
                req.email(),
                req.licenseNo(),
                req.licenseType(),
                req.licenseExpiry(),
                req.nid(),
                req.photoUrl(),
                req.rfidCard(),
                req.emergencyContact(),
                req.emergencyPhone(),
                req.address(),
                req.dateOfBirth(),
                req.hireDate(),
                req.notes()
        );
        return DriverView.of(driver, 0);
    }

    @PatchMapping("/{id}")
    public DriverView update(@PathVariable UUID id, @Valid @RequestBody UpdateDriverRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        Driver driver = driverService.update(
                orgId,
                id,
                req.name(),
                req.phone(),
                req.email(),
                req.licenseNo(),
                req.licenseType(),
                req.licenseExpiry(),
                req.nid(),
                req.photoUrl(),
                req.rfidCard(),
                req.emergencyContact(),
                req.emergencyPhone(),
                req.address(),
                req.dateOfBirth(),
                req.hireDate(),
                req.status(),
                req.notes()
        );
        Map<UUID, Integer> counts = driverService.getDeviceCounts(orgId);
        return DriverView.of(driver, counts.getOrDefault(driver.id(), 0));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        driverService.delete(orgId, id);
    }

    @PostMapping("/{id}/assign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assignToDevice(@PathVariable UUID id, @Valid @RequestBody AssignDriverRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        driverService.assignToDevice(orgId, id, req.imei());
    }

    @DeleteMapping("/{id}/assign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassignFromDevice(@PathVariable UUID id, @Valid @RequestBody AssignDriverRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        driverService.unassignFromDevice(orgId, req.imei());
    }
}
