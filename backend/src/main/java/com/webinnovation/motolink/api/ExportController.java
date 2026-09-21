package com.webinnovation.motolink.api;

import com.webinnovation.motolink.exception.DomainException;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.ExcelExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.UUID;

/**
 * REST endpoints for Excel data exports.
 * All exports are organization-scoped via JWT authentication.
 */
@RestController
@RequestMapping("/exports")
@RequiredArgsConstructor
@Slf4j
public class ExportController {

    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ExcelExportService exportService;
    private final com.webinnovation.motolink.service.AlarmService alarmService;

    /**
     * Export trips report to Excel.
     * GET /exports/trips.xlsx?from=2024-01-01&to=2024-01-31
     */
    @GetMapping(value = "/trips.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportTrips(
            @RequestParam(name = "from") String fromIso,
            @RequestParam(name = "to") String toIso) throws IOException {
        UUID orgId = TenantContext.requireOrgId();
        LocalDate from = parseDate(fromIso, "from");
        LocalDate to = parseDate(toIso, "to");
        validateDateRange(from, to);

        log.info("Exporting trips to Excel for org={} from={} to={}", orgId, from, to);
        byte[] data = exportService.exportTrips(orgId, from, to);
        return xlsx(data, "trips_" + from + "_" + to + ".xlsx");
    }

    /**
     * Export alarms report to Excel.
     * GET /exports/alarms.xlsx?from=2024-01-01&to=2024-01-31
     */
    @GetMapping(value = "/alarms.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportAlarms(
            @RequestParam(name = "from") String fromIso,
            @RequestParam(name = "to") String toIso) throws IOException {
        UUID orgId = TenantContext.requireOrgId();
        LocalDate from = parseDate(fromIso, "from");
        LocalDate to = parseDate(toIso, "to");
        validateDateRange(from, to);

        log.info("Exporting alarms to Excel for org={} from={} to={}", orgId, from, to);
        byte[] data = exportService.exportAlarms(orgId, from, to);
        return xlsx(data, "alarms_" + from + "_" + to + ".xlsx");
    }

    /** GET /exports/alarm-overview.xlsx?from=2026-09-01&to=2026-09-16 — ADL Alarm Overview. */
    @GetMapping(value = "/alarm-overview.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportAlarmOverview(
            @RequestParam(name = "from") String fromIso,
            @RequestParam(name = "to") String toIso) throws IOException {
        UUID orgId = TenantContext.requireOrgId();
        LocalDate from = parseDate(fromIso, "from");
        LocalDate to = parseDate(toIso, "to");
        validateDateRange(from, to);
        java.time.ZoneId dhaka = java.time.ZoneId.of("Asia/Dhaka");
        var overview = alarmService.overview(orgId,
                from.atStartOfDay(dhaka).toInstant(), to.plusDays(1).atStartOfDay(dhaka).toInstant());
        byte[] data = exportService.exportAlarmOverview(orgId, from, to, overview);
        return xlsx(data, "alarm_overview_" + from + "_" + to + ".xlsx");
    }

    /**
     * Export monthly summary to Excel.
     * GET /exports/monthly-summary.xlsx?device=123456789012345&month=2024-01
     */
    @GetMapping(value = "/monthly-summary.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportMonthlySummary(
            @RequestParam(name = "device") String imei,
            @RequestParam(name = "month") String monthStr) throws IOException {
        UUID orgId = TenantContext.requireOrgId();
        YearMonth month = parseMonth(monthStr);

        log.info("Exporting monthly summary to Excel for org={} device={} month={}", orgId, imei, month);
        byte[] data = exportService.exportMonthlySummary(orgId, imei, month);
        return xlsx(data, "monthly_" + month + "_" + imei + ".xlsx");
    }

    /**
     * Export device list to Excel.
     * GET /exports/devices.xlsx
     */
    @GetMapping(value = "/devices.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportDevices() throws IOException {
        UUID orgId = TenantContext.requireOrgId();

        log.info("Exporting devices to Excel for org={}", orgId);
        byte[] data = exportService.exportDevices(orgId);
        return xlsx(data, "devices_" + LocalDate.now() + ".xlsx");
    }

    /**
     * Export location history to Excel.
     * GET /exports/locations.xlsx?device=123456789012345&from=2024-01-01&to=2024-01-31
     */
    @GetMapping(value = "/locations.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportLocations(
            @RequestParam(name = "device") String imei,
            @RequestParam(name = "from") String fromIso,
            @RequestParam(name = "to") String toIso) throws IOException {
        UUID orgId = TenantContext.requireOrgId();
        LocalDate from = parseDate(fromIso, "from");
        LocalDate to = parseDate(toIso, "to");
        validateDateRange(from, to);

        // Limit to max 7 days to prevent huge exports
        if (from.plusDays(7).isBefore(to)) {
            throw new DomainException("DATE_RANGE_TOO_LARGE",
                    "Location export is limited to 7 days. Please select a smaller range.");
        }

        log.info("Exporting locations to Excel for org={} device={} from={} to={}", orgId, imei, from, to);
        byte[] data = exportService.exportLocationHistory(orgId, imei, from, to);
        return xlsx(data, "locations_" + imei + "_" + from + "_" + to + ".xlsx");
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private LocalDate parseDate(String dateStr, String paramName) {
        try {
            return LocalDate.parse(dateStr);
        } catch (DateTimeParseException e) {
            throw new DomainException("INVALID_DATE", paramName + " must be yyyy-MM-dd format");
        }
    }

    private YearMonth parseMonth(String monthStr) {
        try {
            return YearMonth.parse(monthStr);
        } catch (DateTimeParseException e) {
            throw new DomainException("INVALID_MONTH", "month must be yyyy-MM format");
        }
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new DomainException("INVALID_DATE_RANGE", "from date must be before or equal to to date");
        }
        if (from.plusDays(365).isBefore(to)) {
            throw new DomainException("DATE_RANGE_TOO_LARGE", "Date range cannot exceed 1 year");
        }
    }

    private ResponseEntity<byte[]> xlsx(byte[] data, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(XLSX);
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        headers.setContentLength(data.length);
        return new ResponseEntity<>(data, headers, 200);
    }
}
