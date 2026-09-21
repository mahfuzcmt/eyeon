package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Alarm;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import com.webinnovation.eyeon.repository.UserRepository.SmsRecipient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlarmSmsServiceTest {

    private static final String IMEI = "864290061234567";

    private UserRepository userRepo;
    private SmsService smsService;
    private ValueOperations<String, String> valueOps;
    private AlarmSmsService service;
    private UUID orgId;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        userRepo = mock(UserRepository.class);
        DeviceRepository deviceRepo = mock(DeviceRepository.class);
        smsService = mock(SmsService.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        when(deviceRepo.findByImei(IMEI)).thenReturn(Optional.empty());
        when(smsService.sendRaw(anyString(), anyString())).thenReturn(true);
        orgId = UUID.randomUUID();
        service = new AlarmSmsService(userRepo, deviceRepo, smsService, new NotificationComposer(), redis, 120, 10);
    }

    private Alarm sos() {
        return new Alarm(UUID.randomUUID(), orgId, IMEI, "SOS", "CRITICAL",
                Instant.parse("2026-09-21T02:02:00Z"), 23.8103, 90.4125,
                false, null, null, null, null, Map.of(), Instant.now());
    }

    @Test
    void sos_is_texted_to_every_parent_with_a_phone_with_a_map_link() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(List.of(
                new SmsRecipient("01711-111111", "bn-BD"),
                new SmsRecipient("+8801822222222", "bn-BD")));

        service.sendCriticalAlarmSms(sos());

        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(smsService, times(2)).sendRaw(to.capture(), text.capture());
        assertEquals(List.of("8801711111111", "8801822222222"), to.getAllValues());
        String sms = text.getAllValues().get(0);
        assertTrue(sms.startsWith("EyeOn SOS! "), sms);
        assertTrue(sms.contains("জরুরি সাহায্য দরকার"), sms);
        assertTrue(sms.contains("সময় সকাল ৮:০২।"), sms);
        assertTrue(sms.endsWith("https://maps.google.com/?q=23.81030,90.41250"), sms);
    }

    @Test
    void the_same_number_on_two_accounts_is_texted_once() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(List.of(
                new SmsRecipient("01711111111", "bn"),
                new SmsRecipient("+880 1711-111111", "bn")));

        service.sendCriticalAlarmSms(sos());

        verify(smsService, times(1)).sendRaw(eq("8801711111111"), anyString());
    }

    @Test
    void english_organizations_get_english_text() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(List.of(new SmsRecipient("01711111111", "en-US")));

        service.sendCriticalAlarmSms(sos());

        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(smsService).sendRaw(anyString(), text.capture());
        assertTrue(text.getValue().startsWith("EyeOn SOS! " + IMEI + " needs help. 8:02 AM."), text.getValue());
    }

    @Test
    void a_held_down_sos_button_texts_once_per_cooldown() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(List.of(new SmsRecipient("01711111111", "bn")));
        when(valueOps.setIfAbsent(eq("sms:alarm:" + IMEI + ":SOS"), anyString(), eq(Duration.ofSeconds(120))))
                .thenReturn(true, false, false);

        service.sendCriticalAlarmSms(sos());
        service.sendCriticalAlarmSms(sos());
        service.sendCriticalAlarmSms(sos());

        verify(smsService, times(1)).sendRaw(anyString(), anyString());
    }

    @Test
    void redis_being_down_never_blocks_an_sos_text() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(List.of(new SmsRecipient("01711111111", "bn")));
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenThrow(new IllegalStateException("redis down"));

        service.sendCriticalAlarmSms(sos());

        verify(smsService, times(1)).sendRaw(anyString(), anyString());
    }

    @Test
    void nobody_with_a_phone_sends_nothing_and_does_not_burn_the_cooldown() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(List.of());

        service.sendCriticalAlarmSms(sos());

        verify(smsService, never()).sendRaw(anyString(), anyString());
        verify(valueOps, never()).setIfAbsent(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void recipients_are_capped() {
        List<SmsRecipient> many = new ArrayList<>();
        for (int i = 0; i < 25; i++) many.add(new SmsRecipient(String.format("017%08d", i), "bn"));
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenReturn(many);

        service.sendCriticalAlarmSms(sos());

        verify(smsService, times(10)).sendRaw(anyString(), anyString());
    }

    @Test
    void a_failing_provider_never_throws_into_the_alarm_pipeline() {
        when(userRepo.listAlarmSmsRecipients(orgId, IMEI)).thenThrow(new IllegalStateException("db down"));
        service.sendCriticalAlarmSms(sos()); // must not throw
    }
}
