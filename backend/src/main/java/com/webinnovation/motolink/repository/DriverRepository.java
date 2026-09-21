package com.webinnovation.motolink.repository;

import com.webinnovation.motolink.domain.Driver;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class DriverRepository {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_FIELDS = """
            SELECT id, org_id, name, phone, email, license_no, license_type, license_expiry,
                   nid, photo_url, rfid_card, emergency_contact, emergency_phone,
                   address, date_of_birth, hire_date, status, notes,
                   created_at, updated_at
            """;

    private static final RowMapper<Driver> ROW_MAPPER = (rs, rn) -> new Driver(
            rs.getObject("id", UUID.class),
            rs.getObject("org_id", UUID.class),
            rs.getString("name"),
            rs.getString("phone"),
            rs.getString("email"),
            rs.getString("license_no"),
            rs.getString("license_type"),
            toLocalDate(rs.getDate("license_expiry")),
            rs.getString("nid"),
            rs.getString("photo_url"),
            rs.getString("rfid_card"),
            rs.getString("emergency_contact"),
            rs.getString("emergency_phone"),
            rs.getString("address"),
            toLocalDate(rs.getDate("date_of_birth")),
            toLocalDate(rs.getDate("hire_date")),
            rs.getString("status"),
            rs.getString("notes"),
            rs.getObject("created_at", OffsetDateTime.class).toInstant(),
            rs.getObject("updated_at", OffsetDateTime.class).toInstant()
    );

    private static LocalDate toLocalDate(Date date) {
        return date == null ? null : date.toLocalDate();
    }

    public Optional<Driver> findById(UUID orgId, UUID id) {
        try {
            Driver d = jdbc.queryForObject(
                    SELECT_FIELDS + " FROM drivers WHERE org_id = :orgId AND id = :id",
                    new MapSqlParameterSource("orgId", orgId).addValue("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(d);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Driver> findByRfid(UUID orgId, String rfidCard) {
        try {
            Driver d = jdbc.queryForObject(
                    SELECT_FIELDS + " FROM drivers WHERE org_id = :orgId AND rfid_card = :rfid",
                    new MapSqlParameterSource("orgId", orgId).addValue("rfid", rfidCard),
                    ROW_MAPPER);
            return Optional.ofNullable(d);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<Driver> findByPhone(UUID orgId, String phone) {
        try {
            Driver d = jdbc.queryForObject(
                    SELECT_FIELDS + " FROM drivers WHERE org_id = :orgId AND phone = :phone",
                    new MapSqlParameterSource("orgId", orgId).addValue("phone", phone),
                    ROW_MAPPER);
            return Optional.ofNullable(d);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Driver> listForOrg(UUID orgId) {
        return jdbc.query(
                SELECT_FIELDS + " FROM drivers WHERE org_id = :orgId ORDER BY name",
                new MapSqlParameterSource("orgId", orgId),
                ROW_MAPPER);
    }

    public List<Driver> listForOrgByStatus(UUID orgId, String status) {
        return jdbc.query(
                SELECT_FIELDS + " FROM drivers WHERE org_id = :orgId AND status = :status ORDER BY name",
                new MapSqlParameterSource("orgId", orgId).addValue("status", status),
                ROW_MAPPER);
    }

    public List<Driver> listWithExpiringLicenses(UUID orgId, int daysAhead) {
        return jdbc.query(
                SELECT_FIELDS + """
                 FROM drivers
                 WHERE org_id = :orgId
                   AND status = 'ACTIVE'
                   AND license_expiry IS NOT NULL
                   AND license_expiry <= CURRENT_DATE + :days
                 ORDER BY license_expiry
                """,
                new MapSqlParameterSource("orgId", orgId).addValue("days", daysAhead),
                ROW_MAPPER);
    }

    public Driver create(Driver driver) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO drivers (id, org_id, name, phone, email, license_no, license_type, license_expiry,
                                    nid, photo_url, rfid_card, emergency_contact, emergency_phone,
                                    address, date_of_birth, hire_date, status, notes, created_at, updated_at)
                VALUES (:id, :orgId, :name, :phone, :email, :licenseNo, :licenseType, :licenseExpiry,
                        :nid, :photoUrl, :rfidCard, :emergencyContact, :emergencyPhone,
                        :address, :dob, :hireDate, :status, :notes, now(), now())
                """, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("orgId", driver.orgId())
                .addValue("name", driver.name())
                .addValue("phone", driver.phone())
                .addValue("email", driver.email())
                .addValue("licenseNo", driver.licenseNo())
                .addValue("licenseType", driver.licenseType())
                .addValue("licenseExpiry", driver.licenseExpiry())
                .addValue("nid", driver.nid())
                .addValue("photoUrl", driver.photoUrl())
                .addValue("rfidCard", driver.rfidCard())
                .addValue("emergencyContact", driver.emergencyContact())
                .addValue("emergencyPhone", driver.emergencyPhone())
                .addValue("address", driver.address())
                .addValue("dob", driver.dateOfBirth())
                .addValue("hireDate", driver.hireDate())
                .addValue("status", driver.status() != null ? driver.status() : "ACTIVE")
                .addValue("notes", driver.notes()));
        return findById(driver.orgId(), id).orElseThrow();
    }

    public int update(UUID orgId, UUID id, String name, String phone, String email,
                      String licenseNo, String licenseType, LocalDate licenseExpiry,
                      String nid, String photoUrl, String rfidCard,
                      String emergencyContact, String emergencyPhone,
                      String address, LocalDate dateOfBirth, LocalDate hireDate,
                      String status, String notes) {
        return jdbc.update("""
                UPDATE drivers SET
                  name = COALESCE(:name, name),
                  phone = COALESCE(:phone, phone),
                  email = COALESCE(:email, email),
                  license_no = COALESCE(:licenseNo, license_no),
                  license_type = COALESCE(:licenseType, license_type),
                  license_expiry = COALESCE(:licenseExpiry, license_expiry),
                  nid = COALESCE(:nid, nid),
                  photo_url = COALESCE(:photoUrl, photo_url),
                  rfid_card = COALESCE(:rfidCard, rfid_card),
                  emergency_contact = COALESCE(:emergencyContact, emergency_contact),
                  emergency_phone = COALESCE(:emergencyPhone, emergency_phone),
                  address = COALESCE(:address, address),
                  date_of_birth = COALESCE(:dob, date_of_birth),
                  hire_date = COALESCE(:hireDate, hire_date),
                  status = COALESCE(:status, status),
                  notes = COALESCE(:notes, notes),
                  updated_at = now()
                WHERE org_id = :orgId AND id = :id
                """, new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("id", id)
                .addValue("name", name)
                .addValue("phone", phone)
                .addValue("email", email)
                .addValue("licenseNo", licenseNo)
                .addValue("licenseType", licenseType)
                .addValue("licenseExpiry", licenseExpiry)
                .addValue("nid", nid)
                .addValue("photoUrl", photoUrl)
                .addValue("rfidCard", rfidCard)
                .addValue("emergencyContact", emergencyContact)
                .addValue("emergencyPhone", emergencyPhone)
                .addValue("address", address)
                .addValue("dob", dateOfBirth)
                .addValue("hireDate", hireDate)
                .addValue("status", status)
                .addValue("notes", notes));
    }

    public int delete(UUID orgId, UUID id) {
        // First unassign from all devices
        jdbc.update("""
                UPDATE devices SET driver_id = NULL, updated_at = now()
                WHERE org_id = :orgId AND driver_id = :driverId
                """, new MapSqlParameterSource("orgId", orgId).addValue("driverId", id));

        return jdbc.update("""
                DELETE FROM drivers
                WHERE org_id = :orgId AND id = :id
                """, new MapSqlParameterSource("orgId", orgId).addValue("id", id));
    }

    public int countForOrg(UUID orgId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM drivers WHERE org_id = :orgId",
                new MapSqlParameterSource("orgId", orgId),
                Integer.class);
        return count != null ? count : 0;
    }

    public int countByStatus(UUID orgId, String status) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM drivers WHERE org_id = :orgId AND status = :status",
                new MapSqlParameterSource("orgId", orgId).addValue("status", status),
                Integer.class);
        return count != null ? count : 0;
    }

    /**
     * Get the count of devices assigned to each driver.
     */
    public java.util.Map<UUID, Integer> countDevicesByDriver(UUID orgId) {
        return jdbc.query("""
                SELECT driver_id, COUNT(*)::int AS count
                FROM devices
                WHERE org_id = :orgId AND driver_id IS NOT NULL
                GROUP BY driver_id
                """, new MapSqlParameterSource("orgId", orgId),
                rs -> {
                    java.util.Map<UUID, Integer> result = new java.util.HashMap<>();
                    while (rs.next()) {
                        result.put(rs.getObject("driver_id", UUID.class), rs.getInt("count"));
                    }
                    return result;
                });
    }
}
