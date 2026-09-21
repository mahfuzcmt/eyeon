package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Driver;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class DriverDtos {

    private DriverDtos() {}

    public record DriverView(
            UUID id,
            String name,
            String phone,
            String email,
            String licenseNo,
            String licenseType,
            LocalDate licenseExpiry,
            String nid,
            String photoUrl,
            String rfidCard,
            String emergencyContact,
            String emergencyPhone,
            String address,
            LocalDate dateOfBirth,
            LocalDate hireDate,
            String status,
            String notes,
            int assignedDeviceCount,
            boolean licenseExpired,
            boolean licenseExpiringSoon,
            Instant createdAt
    ) {
        public static DriverView of(Driver driver, int assignedDeviceCount) {
            return new DriverView(
                    driver.id(),
                    driver.name(),
                    driver.phone(),
                    driver.email(),
                    driver.licenseNo(),
                    driver.licenseType(),
                    driver.licenseExpiry(),
                    driver.nid(),
                    driver.photoUrl(),
                    driver.rfidCard(),
                    driver.emergencyContact(),
                    driver.emergencyPhone(),
                    driver.address(),
                    driver.dateOfBirth(),
                    driver.hireDate(),
                    driver.status(),
                    driver.notes(),
                    assignedDeviceCount,
                    driver.isLicenseExpired(),
                    driver.isLicenseExpiringSoon(),
                    driver.createdAt()
            );
        }
    }

    public record CreateDriverRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 50) String phone,
            @Size(max = 255) String email,
            @Size(max = 100) String licenseNo,
            @Size(max = 50) String licenseType,
            LocalDate licenseExpiry,
            @Size(max = 50) String nid,
            @Size(max = 500) String photoUrl,
            @Size(max = 100) String rfidCard,
            @Size(max = 100) String emergencyContact,
            @Size(max = 50) String emergencyPhone,
            String address,
            LocalDate dateOfBirth,
            LocalDate hireDate,
            String notes
    ) {}

    public record UpdateDriverRequest(
            @Size(max = 255) String name,
            @Size(max = 50) String phone,
            @Size(max = 255) String email,
            @Size(max = 100) String licenseNo,
            @Size(max = 50) String licenseType,
            LocalDate licenseExpiry,
            @Size(max = 50) String nid,
            @Size(max = 500) String photoUrl,
            @Size(max = 100) String rfidCard,
            @Size(max = 100) String emergencyContact,
            @Size(max = 50) String emergencyPhone,
            String address,
            LocalDate dateOfBirth,
            LocalDate hireDate,
            String status,
            String notes
    ) {}

    public record AssignDriverRequest(
            String imei
    ) {}
}
