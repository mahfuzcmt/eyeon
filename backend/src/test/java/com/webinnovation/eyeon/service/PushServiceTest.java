package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Alarm;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.PushTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PushServiceTest {

    private static final String EXPO_URL = "https://exp.host/--/api/v2/push/send";

    private PushTokenRepository tokenRepo;
    private DeviceRepository deviceRepo;
    private MockRestServiceServer server;
    private PushService pushService;

    @BeforeEach
    void setUp() {
        tokenRepo = mock(PushTokenRepository.class);
        deviceRepo = mock(DeviceRepository.class);
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        pushService = new PushService(tokenRepo, deviceRepo, new NotificationComposer(), builder, true, EXPO_URL, "");
    }

    private static Alarm alarm(UUID orgId) {
        return new Alarm(UUID.randomUUID(), orgId, "864290061234567", "SOS", "CRITICAL",
                Instant.parse("2026-07-08T04:23:45Z"), 23.8103, 90.4125,
                false, null, null, null, null, Map.of(), Instant.now());
    }

    @Test
    void sends_messages_and_purges_unregistered_tokens() {
        UUID orgId = UUID.randomUUID();
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any()))
                .thenReturn(List.of(
                        new PushTokenRepository.Target("ExponentPushToken[aaa]", "en"),
                        new PushTokenRepository.Target("ExponentPushToken[bbb]", "en")));
        when(deviceRepo.findByImei("864290061234567")).thenReturn(Optional.empty());

        server.expect(requestTo(EXPO_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[aaa]"))
                .andExpect(jsonPath("$[1].to").value("ExponentPushToken[bbb]"))
                .andExpect(jsonPath("$[0].channelId").value("alarms"))
                .andExpect(jsonPath("$[0].priority").value("high"))
                .andExpect(jsonPath("$[0].data.imei").value("864290061234567"))
                .andExpect(jsonPath("$[0].data.severity").value("CRITICAL"))
                .andRespond(withSuccess("""
                        {"data":[
                          {"status":"ok","id":"ticket-1"},
                          {"status":"error","message":"gone","details":{"error":"DeviceNotRegistered"}}
                        ]}
                        """, MediaType.APPLICATION_JSON));

        pushService.sendAlarmPush(alarm(orgId));

        server.verify();
        verify(tokenRepo).deleteAll(List.of("ExponentPushToken[bbb]"));
    }

    @Test
    void each_install_gets_the_place_event_in_its_own_language() {
        UUID orgId = UUID.randomUUID();
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any()))
                .thenReturn(List.of(
                        new PushTokenRepository.Target("ExponentPushToken[bangla]", "bn-BD"),
                        new PushTokenRepository.Target("ExponentPushToken[english]", "en")));
        when(deviceRepo.findByImei("864290061234567")).thenReturn(Optional.empty());

        String ok = "{\"data\":[{\"status\":\"ok\",\"id\":\"t\"}]}";
        server.expect(requestTo(EXPO_URL))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[bangla]"))
                .andExpect(jsonPath("$[0].title").value("📍 864290061234567 এখন School-এ"))
                .andExpect(jsonPath("$[0].channelId").value("arrivals"))
                .andRespond(withSuccess(ok, MediaType.APPLICATION_JSON));
        server.expect(requestTo(EXPO_URL))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[english]"))
                .andExpect(jsonPath("$[0].title").value("📍 864290061234567 reached School"))
                .andExpect(jsonPath("$[0].channelId").value("arrivals"))
                .andRespond(withSuccess(ok, MediaType.APPLICATION_JSON));

        pushService.sendAlarmPush(new Alarm(UUID.randomUUID(), orgId, "864290061234567",
                "PLACE_ARRIVED", "INFO", Instant.parse("2026-09-21T02:02:00Z"), 23.8103, 90.4125,
                false, null, null, null, null, Map.of("geofenceName", "School"), Instant.now()));

        server.verify();
    }

    @Test
    void no_registered_tokens_sends_nothing() {
        UUID orgId = UUID.randomUUID();
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any())).thenReturn(List.of());

        pushService.sendAlarmPush(alarm(orgId));

        server.verify(); // no expectations registered — any request would have failed
        verify(tokenRepo, never()).deleteAll(anyList());
    }

    @Test
    void disabled_flag_short_circuits() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer disabledServer = MockRestServiceServer.bindTo(builder).build();
        PushService disabled = new PushService(tokenRepo, deviceRepo, new NotificationComposer(), builder, false, EXPO_URL, "");

        disabled.sendAlarmPush(alarm(UUID.randomUUID()));

        disabledServer.verify();
        verify(tokenRepo, never()).listTokensForOrgAndType(any(), any(), any());
    }
}
