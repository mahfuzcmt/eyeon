package com.webinnovation.motolink.api;

import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.webinnovation.motolink.dto.ReportDtos.MonthlySummary;
import com.webinnovation.motolink.exception.DomainException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.UUID;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final MediaType TEXT_CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final ReportService service;

    @GetMapping(value = "/trips.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> tripsCsv(
            @RequestParam(name = "from") String fromIso,
            @RequestParam(name = "to") String toIso) {
        UUID orgId = TenantContext.requireOrgId();
        LocalDate from = LocalDate.parse(fromIso);
        LocalDate to = LocalDate.parse(toIso);
        byte[] body = service.tripsCsv(orgId, from, to).getBytes(StandardCharsets.UTF_8);
        return csv(body, "trips_" + from + "_" + to + ".csv");
    }

    @GetMapping(value = "/alarms.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> alarmsCsv(
            @RequestParam(name = "from") String fromIso,
            @RequestParam(name = "to") String toIso) {
        UUID orgId = TenantContext.requireOrgId();
        LocalDate from = LocalDate.parse(fromIso);
        LocalDate to = LocalDate.parse(toIso);
        byte[] body = service.alarmsCsv(orgId, from, to).getBytes(StandardCharsets.UTF_8);
        return csv(body, "alarms_" + from + "_" + to + ".csv");
    }

    @GetMapping("/monthly-summary")
    public MonthlySummary monthlySummary(
            @RequestParam(name = "device") String imei,
            @RequestParam(name = "month") String month) {
        UUID orgId = TenantContext.requireOrgId();
        return service.monthlySummary(orgId, imei, parseMonth(month));
    }

    @GetMapping(value = "/monthly-summary.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> monthlySummaryCsv(
            @RequestParam(name = "device") String imei,
            @RequestParam(name = "month") String month) {
        UUID orgId = TenantContext.requireOrgId();
        YearMonth ym = parseMonth(month);
        byte[] body = service.monthlySummaryCsv(orgId, imei, ym).getBytes(StandardCharsets.UTF_8);
        return csv(body, "monthly_" + ym + "_" + imei + ".csv");
    }

    private static YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw new DomainException("INVALID_MONTH", "month must be yyyy-MM");
        }
    }

    private ResponseEntity<byte[]> csv(byte[] body, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(TEXT_CSV);
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        headers.setContentLength(body.length);
        return new ResponseEntity<>(body, headers, 200);
    }
}
