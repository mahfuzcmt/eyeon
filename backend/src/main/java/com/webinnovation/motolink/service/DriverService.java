package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Driver;
import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DriverService {

    private final DriverRepository driverRepo;
    private final DeviceRepository deviceRepo;

    public List<Driver> listForOrg(UUID orgId) {
        return driverRepo.listForOrg(orgId);
    }

    public List<Driver> listByStatus(UUID orgId, String status) {
        return driverRepo.listForOrgByStatus(orgId, status);
    }

    public Driver getById(UUID orgId, UUID id) {
        return driverRepo.findById(orgId, id)
                .orElseThrow(() -> new NotFoundException("Driver not found: " + id));
    }

    public Map<UUID, Integer> getDeviceCounts(UUID orgId) {
        return driverRepo.countDevicesByDriver(orgId);
    }

    public List<Driver> getExpiringLicenses(UUID orgId, int daysAhead) {
        return driverRepo.listWithExpiringLicenses(orgId, daysAhead);
    }

    @Transactional
    public Driver create(UUID orgId, String name, String phone, String email,
                         String licenseNo, String licenseType, LocalDate licenseExpiry,
                         String nid, String photoUrl, String rfidCard,
                         String emergencyContact, String emergencyPhone,
                         String address, LocalDate dateOfBirth, LocalDate hireDate,
                         String notes) {
        // Check for duplicate RFID
        if (rfidCard != null && !rfidCard.isBlank()) {
            if (driverRepo.findByRfid(orgId, rfidCard).isPresent()) {
                throw new DomainException("DUPLICATE_RFID", "A driver with this RFID card already exists");
            }
        }

        // Check for duplicate phone
        if (phone != null && !phone.isBlank()) {
            if (driverRepo.findByPhone(orgId, phone).isPresent()) {
                throw new DomainException("DUPLICATE_PHONE", "A driver with this phone number already exists");
            }
        }

        Driver driver = new Driver(
                null, orgId, name, phone, email,
                licenseNo, licenseType, licenseExpiry,
                nid, photoUrl, rfidCard,
                emergencyContact, emergencyPhone,
                address, dateOfBirth, hireDate,
                "ACTIVE", notes, null, null
        );

        Driver created = driverRepo.create(driver);
        log.info("Created driver '{}' (id={}) for org={}", name, created.id(), orgId);
        return created;
    }

    @Transactional
    public Driver update(UUID orgId, UUID id, String name, String phone, String email,
                         String licenseNo, String licenseType, LocalDate licenseExpiry,
                         String nid, String photoUrl, String rfidCard,
                         String emergencyContact, String emergencyPhone,
                         String address, LocalDate dateOfBirth, LocalDate hireDate,
                         String status, String notes) {
        Driver existing = getById(orgId, id);

        // Check for duplicate RFID (if changing)
        if (rfidCard != null && !rfidCard.equals(existing.rfidCard())) {
            if (driverRepo.findByRfid(orgId, rfidCard).isPresent()) {
                throw new DomainException("DUPLICATE_RFID", "A driver with this RFID card already exists");
            }
        }

        // Check for duplicate phone (if changing)
        if (phone != null && !phone.equals(existing.phone())) {
            if (driverRepo.findByPhone(orgId, phone).isPresent()) {
                throw new DomainException("DUPLICATE_PHONE", "A driver with this phone number already exists");
            }
        }

        int rows = driverRepo.update(orgId, id, name, phone, email,
                licenseNo, licenseType, licenseExpiry,
                nid, photoUrl, rfidCard,
                emergencyContact, emergencyPhone,
                address, dateOfBirth, hireDate, status, notes);

        if (rows == 0) {
            throw new NotFoundException("Driver not found: " + id);
        }

        log.info("Updated driver id={} for org={}", id, orgId);
        return getById(orgId, id);
    }

    @Transactional
    public void delete(UUID orgId, UUID id) {
        Driver existing = getById(orgId, id);
        int rows = driverRepo.delete(orgId, id);
        if (rows == 0) {
            throw new NotFoundException("Driver not found: " + id);
        }
        log.info("Deleted driver '{}' (id={}) for org={}", existing.name(), id, orgId);
    }

    @Transactional
    public void assignToDevice(UUID orgId, UUID driverId, String imei) {
        // Verify driver exists
        getById(orgId, driverId);

        // Assign driver to device
        int rows = deviceRepo.assignDriver(orgId, imei, driverId);
        if (rows == 0) {
            throw new NotFoundException("Device not found: " + imei);
        }
        log.info("Assigned driver {} to device {} for org={}", driverId, imei, orgId);
    }

    @Transactional
    public void unassignFromDevice(UUID orgId, String imei) {
        int rows = deviceRepo.assignDriver(orgId, imei, null);
        if (rows == 0) {
            throw new NotFoundException("Device not found: " + imei);
        }
        log.info("Unassigned driver from device {} for org={}", imei, orgId);
    }

    /**
     * Find driver by RFID card (used when device reports RFID swipe).
     */
    public Driver findByRfid(UUID orgId, String rfidCard) {
        return driverRepo.findByRfid(orgId, rfidCard)
                .orElse(null);
    }
}
