package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.dto.ScheduledCommandDtos.ScheduleRequest;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.ScheduledCommandRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A command can only be scheduled for a tracker of the caller's own organization. */
class ScheduledCommandServiceTest {

    private static final String IMEI = "864290061234567";

    private final UUID orgId = UUID.randomUUID();
    private final ScheduledCommandRepository repo = mock(ScheduledCommandRepository.class);
    private final DeviceRepository devices = mock(DeviceRepository.class);
    private final ScheduledCommandService service =
            new ScheduledCommandService(repo, mock(DeviceCommandService.class), devices);

    private final ScheduleRequest raw = new ScheduleRequest(IMEI, "RAW", "RESET#", null,
            "ONE_TIME", Instant.now().plusSeconds(600), null, null);

    @Test
    void a_tracker_of_another_organization_is_not_found() {
        when(devices.findByOrgAndImei(orgId, IMEI)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.schedule(orgId, UUID.randomUUID(), raw));
        verify(repo, never()).insert(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void a_tracker_of_the_own_organization_is_scheduled() {
        when(devices.findByOrgAndImei(orgId, IMEI)).thenReturn(Optional.of(mock(Device.class)));
        UUID user = UUID.randomUUID();

        service.schedule(orgId, user, raw);
        verify(repo).insert(eq(orgId), eq(IMEI), eq("RAW"), eq("RESET#"), eq("ONE_TIME"), any(), any(), any(),
                any(), eq(user));
    }
}
