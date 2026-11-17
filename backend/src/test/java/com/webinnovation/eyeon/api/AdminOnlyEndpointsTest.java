package com.webinnovation.eyeon.api;

import com.webinnovation.eyeon.dto.DriverDtos.AssignDriverRequest;
import com.webinnovation.eyeon.dto.ScheduledCommandDtos.ScheduleRequest;
import com.webinnovation.eyeon.exception.ForbiddenException;
import com.webinnovation.eyeon.security.TenantContext;
import com.webinnovation.eyeon.service.AuditService;
import com.webinnovation.eyeon.service.DriverService;
import com.webinnovation.eyeon.service.ScheduledCommandService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Scheduled commands and drivers are for administrators. Until 2026-11-17 neither controller
 * looked at the role, so a parent could schedule a RAW command for any tracker of the
 * organization, list and cancel everyone's, and read or change the driver records.
 */
class AdminOnlyEndpointsTest {

    private final UUID orgId = UUID.randomUUID();
    private final ScheduledCommandService scheduled = mock(ScheduledCommandService.class);
    private final DriverService drivers = mock(DriverService.class);
    private final ScheduledCommandController scheduledController =
            new ScheduledCommandController(scheduled, mock(AuditService.class));
    private final DriverController driverController = new DriverController(drivers);

    private final ScheduleRequest raw = new ScheduleRequest("864290061234567", "RAW", "RESET#", null,
            "ONE_TIME", Instant.now().plusSeconds(600), null, null);

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void a_parent_cannot_use_scheduled_commands_at_all() {
        TenantContext.set(orgId, UUID.randomUUID(), "ORG_USER");

        assertThrows(ForbiddenException.class, () -> scheduledController.create(raw));
        assertThrows(ForbiddenException.class, () -> scheduledController.list(100, 0));
        assertThrows(ForbiddenException.class, () -> scheduledController.cancel(UUID.randomUUID()));
        verifyNoInteractions(scheduled);
    }

    @Test
    void an_admin_still_schedules_lists_and_cancels() {
        UUID admin = UUID.randomUUID();
        TenantContext.set(orgId, admin, "ORG_ADMIN");
        UUID id = UUID.randomUUID();
        when(scheduled.schedule(orgId, admin, raw)).thenReturn(id);
        when(scheduled.list(any(), anyInt(), anyInt())).thenReturn(List.of());
        when(scheduled.cancel(orgId, id)).thenReturn(true);

        assertEquals(201, scheduledController.create(raw).getStatusCode().value());
        assertEquals(List.of(), scheduledController.list(100, 0));
        assertEquals(204, scheduledController.cancel(id).getStatusCode().value());
    }

    @Test
    void a_parent_cannot_read_or_change_drivers() {
        TenantContext.set(orgId, UUID.randomUUID(), "ORG_USER");
        UUID driver = UUID.randomUUID();
        AssignDriverRequest assign = new AssignDriverRequest("864290061234567");

        assertThrows(ForbiddenException.class, () -> driverController.list(null));
        assertThrows(ForbiddenException.class, () -> driverController.get(driver));
        assertThrows(ForbiddenException.class, () -> driverController.getExpiringLicenses(30));
        assertThrows(ForbiddenException.class, () -> driverController.create(null));
        assertThrows(ForbiddenException.class, () -> driverController.update(driver, null));
        assertThrows(ForbiddenException.class, () -> driverController.delete(driver));
        assertThrows(ForbiddenException.class, () -> driverController.assignToDevice(driver, assign));
        assertThrows(ForbiddenException.class, () -> driverController.unassignFromDevice(driver, assign));
        verifyNoInteractions(drivers);
    }

    @Test
    void an_admin_assigns_a_driver_within_their_own_organization() {
        TenantContext.set(orgId, UUID.randomUUID(), "SUPER_ADMIN");
        UUID driver = UUID.randomUUID();

        driverController.assignToDevice(driver, new AssignDriverRequest("864290061234567"));
        verify(drivers).assignToDevice(orgId, driver, "864290061234567");
    }
}
