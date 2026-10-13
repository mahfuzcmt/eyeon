package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.ws.LiveAudience;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeviceDeletionServiceTest {

    private static final String IMEI = "864290061234567";

    private final DeviceRepository devices = mock(DeviceRepository.class);
    private final DeviceCommandService commands = mock(DeviceCommandService.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final LiveAudience audience = mock(LiveAudience.class);
    private final AuditService audit = mock(AuditService.class);
    private final DeviceDeletionService service = new DeviceDeletionService(devices, commands, redis, audience,
            audit, new TransactionTemplate(mock(PlatformTransactionManager.class)));

    @Test
    void deletes_rows_then_drops_connection_cache_and_audience() {
        UUID org = UUID.randomUUID();
        Device d = mock(Device.class);
        when(d.orgId()).thenReturn(org);
        when(d.name()).thenReturn("Rafi");
        when(devices.findByImei(IMEI)).thenReturn(Optional.of(d));
        when(devices.deleteDeviceCascade(IMEI)).thenReturn(1);

        service.delete(IMEI);

        verify(devices).deleteDeviceCascade(IMEI);
        verify(commands).disconnect(IMEI);
        verify(redis).delete("device:last:" + IMEI);
        verify(audience).invalidate(org);
        verify(audit).record(eq("ADMIN_DEVICE_DELETE"), eq("device"), eq(IMEI), anyMap());
    }

    @Test
    void unknown_imei_is_404_and_touches_nothing() {
        when(devices.findByImei(IMEI)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.delete(IMEI));

        verify(devices, never()).deleteDeviceCascade(anyString());
        verify(commands, never()).disconnect(anyString());
        verify(audit, never()).record(any(), any(), any(), anyMap());
    }
}
