package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Alarm;
import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.Location;
import com.webinnovation.motolink.domain.Trip;
import com.webinnovation.motolink.dto.ReportDtos.MonthlyDay;
import com.webinnovation.motolink.dto.ReportDtos.MonthlySummary;
import com.webinnovation.motolink.dto.ReportDtos.MonthlyTotals;
import com.webinnovation.motolink.repository.AlarmRepository;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.LocationRepository;
import com.webinnovation.motolink.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Excel export service for generating professional .xlsx reports.
 * Supports trips, alarms, monthly summary, device list, and location history exports.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private static final ZoneId DHAKA = ZoneId.of("Asia/Dhaka");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final TripRepository tripRepo;
    private final AlarmRepository alarmRepo;
    private final DeviceRepository deviceRepo;
    private final LocationRepository locationRepo;
    private final ReportService reportService;

    /**
     * Export trips report to Excel.
     */
    public byte[] exportTrips(UUID orgId, LocalDate from, LocalDate to) throws IOException {
        Instant fromTs = from.atStartOfDay(DHAKA).toInstant();
        Instant toTs = to.plusDays(1).atStartOfDay(DHAKA).toInstant();
        List<Trip> trips = tripRepo.listForOrg(orgId, fromTs, toTs, 10_000, 0);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Trips Report");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Trips Report: " + from + " to " + to);
            CellStyle titleStyle = createTitleStyle(workbook);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 8));

            // Header row
            Row headerRow = sheet.createRow(2);
            String[] headers = {"Trip ID", "Device IMEI", "Started At", "Ended At", "Distance (km)",
                               "Duration (min)", "Max Speed (km/h)", "Avg Speed (km/h)", "Status"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 3;
            for (Trip trip : trips) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(trip.id().toString());
                row.createCell(1).setCellValue(trip.deviceImei());

                Cell startCell = row.createCell(2);
                startCell.setCellValue(formatDateTime(trip.startedAt()));
                startCell.setCellStyle(dateStyle);

                Cell endCell = row.createCell(3);
                endCell.setCellValue(trip.endedAt() != null ? formatDateTime(trip.endedAt()) : "In Progress");
                endCell.setCellStyle(dateStyle);

                Cell distCell = row.createCell(4);
                distCell.setCellValue(trip.distanceM() / 1000.0);
                distCell.setCellStyle(numberStyle);

                Cell durCell = row.createCell(5);
                durCell.setCellValue(trip.durationS() != null ? trip.durationS() / 60 : 0);
                durCell.setCellStyle(numberStyle);

                row.createCell(6).setCellValue(trip.maxSpeed());
                row.createCell(7).setCellValue(trip.avgSpeed());
                row.createCell(8).setCellValue(trip.status());
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Summary row
            Row summaryRow = sheet.createRow(rowNum + 1);
            summaryRow.createCell(0).setCellValue("Total Trips: " + trips.size());

            return writeToBytes(workbook);
        }
    }

    /**
     * Export alarms report to Excel.
     */
    public byte[] exportAlarms(UUID orgId, LocalDate from, LocalDate to) throws IOException {
        Instant fromTs = from.atStartOfDay(DHAKA).toInstant();
        Instant toTs = to.plusDays(1).atStartOfDay(DHAKA).toInstant();
        List<Alarm> alarms = alarmRepo.findInRange(orgId, fromTs, toTs);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Alarms Report");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle criticalStyle = createCriticalStyle(workbook);
            CellStyle warningStyle = createWarningStyle(workbook);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Alarms Report: " + from + " to " + to);
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 7));

            // Header row
            Row headerRow = sheet.createRow(2);
            String[] headers = {"Alarm ID", "Device IMEI", "Type", "Severity", "Timestamp",
                               "Latitude", "Longitude", "Acknowledged"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 3;
            for (Alarm alarm : alarms) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(alarm.id().toString());
                row.createCell(1).setCellValue(alarm.deviceImei());
                row.createCell(2).setCellValue(alarm.type());

                Cell severityCell = row.createCell(3);
                severityCell.setCellValue(alarm.severity());
                if ("CRITICAL".equals(alarm.severity())) {
                    severityCell.setCellStyle(criticalStyle);
                } else if ("WARNING".equals(alarm.severity())) {
                    severityCell.setCellStyle(warningStyle);
                }

                Cell tsCell = row.createCell(4);
                tsCell.setCellValue(formatDateTime(alarm.ts()));
                tsCell.setCellStyle(dateStyle);

                row.createCell(5).setCellValue(alarm.latitude() != null ? alarm.latitude() : 0);
                row.createCell(6).setCellValue(alarm.longitude() != null ? alarm.longitude() : 0);
                row.createCell(7).setCellValue(alarm.acknowledged() ? "Yes" : "No");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Summary
            Row summaryRow = sheet.createRow(rowNum + 1);
            long criticalCount = alarms.stream().filter(a -> "CRITICAL".equals(a.severity())).count();
            long warningCount = alarms.stream().filter(a -> "WARNING".equals(a.severity())).count();
            summaryRow.createCell(0).setCellValue(String.format("Total: %d | Critical: %d | Warning: %d",
                    alarms.size(), criticalCount, warningCount));

            return writeToBytes(workbook);
        }
    }

    /** ADL-style Alarm Overview: one row per vehicle, one column per alarm type seen in the period. */
    public byte[] exportAlarmOverview(UUID orgId, LocalDate from, LocalDate to,
                                      com.webinnovation.motolink.dto.AlarmDtos.AlarmOverview overview) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Alarm Overview");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle totalStyle = createTotalStyle(workbook);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Alarm Overview: " + from + " to " + to);
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, Math.max(3, overview.types().size() + 3)));

            Row headerRow = sheet.createRow(2);
            List<String> headers = new java.util.ArrayList<>(List.of("Device Name", "IMEI", "Plate No."));
            headers.addAll(overview.types());
            headers.add("Total");
            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 3;
            int grand = 0;
            for (var r : overview.rows()) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(r.name() == null ? "" : r.name());
                row.createCell(1).setCellValue(r.imei());
                row.createCell(2).setCellValue(r.vehiclePlate() == null ? "" : r.vehiclePlate());
                int col = 3;
                for (String t : overview.types()) {
                    row.createCell(col++).setCellValue(r.counts().getOrDefault(t, 0));
                }
                Cell totalCell = row.createCell(col);
                totalCell.setCellValue(r.total());
                totalCell.setCellStyle(totalStyle);
                grand += r.total();
            }
            Row sum = sheet.createRow(rowNum + 1);
            sum.createCell(0).setCellValue("Vehicles: " + overview.rows().size() + " | Alarms: " + grand);
            for (int i = 0; i < headers.size(); i++) sheet.autoSizeColumn(i);
            return writeToBytes(workbook);
        }
    }

    /**
     * Export monthly summary to Excel.
     */
    public byte[] exportMonthlySummary(UUID orgId, String imei, YearMonth month) throws IOException {
        MonthlySummary summary = reportService.monthlySummary(orgId, imei, month);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Monthly Summary");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);
            CellStyle totalStyle = createTotalStyle(workbook);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Monthly Driving Report: " + month + " - Device: " + imei);
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

            // Header row
            Row headerRow = sheet.createRow(2);
            String[] headers = {"Date", "Trips", "Distance (km)", "Driving (min)",
                               "Idle (min)", "Stopped (min)", "Max Speed (km/h)"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 3;
            for (MonthlyDay day : summary.days()) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(day.date().toString());
                row.createCell(1).setCellValue(day.trips());

                Cell distCell = row.createCell(2);
                distCell.setCellValue(day.distanceM() / 1000.0);
                distCell.setCellStyle(numberStyle);

                row.createCell(3).setCellValue(day.drivingS() / 60);
                row.createCell(4).setCellValue(day.idleS() / 60);
                row.createCell(5).setCellValue(day.stoppedS() / 60);
                row.createCell(6).setCellValue(day.maxSpeed());
            }

            // Totals row
            MonthlyTotals totals = summary.totals();
            Row totalRow = sheet.createRow(rowNum++);
            for (int i = 0; i < 7; i++) {
                totalRow.createCell(i).setCellStyle(totalStyle);
            }
            totalRow.getCell(0).setCellValue("TOTAL");
            totalRow.getCell(1).setCellValue(totals.trips());
            totalRow.getCell(2).setCellValue(totals.distanceM() / 1000.0);
            totalRow.getCell(3).setCellValue(totals.drivingS() / 60);
            totalRow.getCell(4).setCellValue(totals.idleS() / 60);
            totalRow.getCell(5).setCellValue(totals.stoppedS() / 60);
            totalRow.getCell(6).setCellValue(totals.maxSpeed());

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            return writeToBytes(workbook);
        }
    }

    /**
     * Export device list to Excel.
     */
    public byte[] exportDevices(UUID orgId) throws IOException {
        List<Device> devices = deviceRepo.listForOrg(orgId);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Devices");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle onlineStyle = createOnlineStyle(workbook);
            CellStyle offlineStyle = createOfflineStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Device List - Generated: " + LocalDateTime.now(DHAKA).format(DATETIME_FORMAT));
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 9));

            // Header row
            Row headerRow = sheet.createRow(2);
            String[] headers = {"IMEI", "Name", "Vehicle Plate", "Vehicle Type", "Status",
                               "Last Seen", "Last Speed (km/h)", "Last Latitude", "Last Longitude", "SIM Number"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 3;
            int onlineCount = 0, offlineCount = 0;
            for (Device device : devices) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(device.imei());
                row.createCell(1).setCellValue(device.name() != null ? device.name() : "");
                row.createCell(2).setCellValue(device.vehiclePlate() != null ? device.vehiclePlate() : "");
                row.createCell(3).setCellValue(device.vehicleType() != null ? device.vehicleType() : "");

                Cell statusCell = row.createCell(4);
                statusCell.setCellValue(device.status());
                if ("ONLINE".equals(device.status())) {
                    statusCell.setCellStyle(onlineStyle);
                    onlineCount++;
                } else {
                    statusCell.setCellStyle(offlineStyle);
                    offlineCount++;
                }

                Cell lastSeenCell = row.createCell(5);
                lastSeenCell.setCellValue(device.lastSeenAt() != null ? formatDateTime(device.lastSeenAt()) : "Never");
                lastSeenCell.setCellStyle(dateStyle);

                row.createCell(6).setCellValue(device.lastSpeed() != null ? device.lastSpeed() : 0);
                row.createCell(7).setCellValue(device.lastLatitude() != null ? device.lastLatitude() : 0);
                row.createCell(8).setCellValue(device.lastLongitude() != null ? device.lastLongitude() : 0);
                row.createCell(9).setCellValue(device.simMsisdn() != null ? device.simMsisdn() : "");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Summary
            Row summaryRow = sheet.createRow(rowNum + 1);
            summaryRow.createCell(0).setCellValue(String.format("Total: %d | Online: %d | Offline: %d",
                    devices.size(), onlineCount, offlineCount));

            return writeToBytes(workbook);
        }
    }

    /**
     * Export location history to Excel.
     */
    public byte[] exportLocationHistory(UUID orgId, String imei, LocalDate from, LocalDate to) throws IOException {
        Instant fromTs = from.atStartOfDay(DHAKA).toInstant();
        Instant toTs = to.plusDays(1).atStartOfDay(DHAKA).toInstant();
        List<Location> locations = locationRepo.findHistory(orgId, imei, fromTs, toTs, 50_000);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Location History");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Location History: " + imei + " (" + from + " to " + to + ")");
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 8));

            // Header row
            Row headerRow = sheet.createRow(2);
            String[] headers = {"Timestamp", "Latitude", "Longitude", "Speed (km/h)", "Course",
                               "Altitude", "Satellites", "ACC", "Valid"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 3;
            for (Location loc : locations) {
                Row row = sheet.createRow(rowNum++);

                Cell tsCell = row.createCell(0);
                tsCell.setCellValue(formatDateTime(loc.ts()));
                tsCell.setCellStyle(dateStyle);

                Cell latCell = row.createCell(1);
                latCell.setCellValue(loc.latitude());
                latCell.setCellStyle(numberStyle);

                Cell lngCell = row.createCell(2);
                lngCell.setCellValue(loc.longitude());
                lngCell.setCellStyle(numberStyle);

                row.createCell(3).setCellValue(loc.speed());
                row.createCell(4).setCellValue(loc.course());
                row.createCell(5).setCellValue(loc.altitude() != null ? loc.altitude() : 0);
                row.createCell(6).setCellValue(loc.satellites() != null ? loc.satellites() : 0);
                row.createCell(7).setCellValue(loc.accOn() != null && loc.accOn() ? "On" : "Off");
                row.createCell(8).setCellValue(loc.valid() ? "Yes" : "No");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Summary
            Row summaryRow = sheet.createRow(rowNum + 1);
            summaryRow.createCell(0).setCellValue("Total Points: " + locations.size());

            return writeToBytes(workbook);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Style helpers
    // ─────────────────────────────────────────────────────────────

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        font.setColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFont(font);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd hh:mm:ss"));
        return style;
    }

    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
        return style;
    }

    private CellStyle createTotalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderTop(BorderStyle.DOUBLE);
        return style;
    }

    private CellStyle createCriticalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.RED.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createWarningStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createOnlineStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setColor(IndexedColors.GREEN.getIndex());
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private CellStyle createOfflineStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFont(font);
        return style;
    }

    private String formatDateTime(Instant instant) {
        if (instant == null) return "";
        return instant.atZone(DHAKA).format(DATETIME_FORMAT);
    }

    private byte[] writeToBytes(Workbook workbook) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        return out.toByteArray();
    }
}
