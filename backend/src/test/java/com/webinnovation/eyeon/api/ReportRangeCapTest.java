package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AlarmService;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DeviceAccessService;
import com.webinnovation.eyeon.service.ExcelExportService;
import com.webinnovation.eyeon.service.ReportService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Reports built in memory cover 93 days at most; a longer range is a 400, not a slow query. */
class ReportRangeCapTest {

    private final UUID orgId = UUID.randomUUID();
    private final AlarmService alarms = mock(AlarmService.class);
    private final ExcelExportService excel = mock(ExcelExportService.class);
    private final ReportService reports = mock(ReportService.class);
    private final DeviceAccessService access = mock(DeviceAccessService.class);
    private final AlarmController alarmController = new AlarmController(alarms, mock(AuditService.class), access);
    private final ExportController exportController = new ExportController(excel, access, alarms);
    private final ReportController reportController = new ReportController(reports, access);

    @BeforeEach
    void admin() {
        TenantContext.set(orgId, UUID.randomUUID(), "ORG_ADMIN");
    }

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private static String code(Runnable call) {
        return assertThrows(DomainException.class, call::run).getCode();
    }

    @Test
    void the_alarm_overview_is_capped_at_93_days() {
        Instant to = Instant.parse("2026-11-17T00:00:00Z");

        assertEquals("INVALID_RANGE", code(() -> alarmController.overview(to.minus(94, ChronoUnit.DAYS), to)));
        verifyNoInteractions(alarms);

        alarmController.overview(to.minus(93, ChronoUnit.DAYS), to);
        verify(alarms).overview(any(), any(), any(), any(), any());
    }

    @Test
    void the_alarm_workbook_is_capped_at_93_days() throws Exception {
        assertEquals("DATE_RANGE_TOO_LARGE", code(() -> {
            try {
                exportController.exportAlarms("2026-01-01", "2026-04-05");
            } catch (java.io.IOException e) {
                throw new IllegalStateException(e);
            }
        }));
        verifyNoInteractions(excel);

        when(excel.exportAlarms(any(), any(), any(), any(), any())).thenReturn(new byte[0]);
        LocalDate from = LocalDate.of(2026, 1, 1);
        assertEquals(200, exportController.exportAlarms(from.toString(), from.plusDays(93).toString())
                .getStatusCode().value());
    }

    @Test
    void the_csv_reports_are_capped_at_93_days_and_answer_400_for_a_bad_date() {
        assertEquals("DATE_RANGE_TOO_LARGE", code(() -> reportController.tripsCsv("2026-01-01", "2026-04-05")));
        assertEquals("DATE_RANGE_TOO_LARGE", code(() -> reportController.alarmsCsv("2025-01-01", "2026-01-01")));
        assertEquals("INVALID_DATE_RANGE", code(() -> reportController.alarmsCsv("2026-02-01", "2026-01-01")));
        assertEquals("INVALID_DATE", code(() -> reportController.tripsCsv("yesterday", "2026-01-01")));
        verifyNoInteractions(reports);

        when(reports.tripsCsv(any(), any(), any())).thenReturn("a,b\n");
        assertEquals(200, reportController.tripsCsv("2026-01-01", "2026-04-04").getStatusCode().value());
    }
}
