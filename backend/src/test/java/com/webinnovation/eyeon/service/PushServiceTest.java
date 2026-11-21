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

import static org.assertj.core.api.Assertions.assertThat;
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
    private static final String RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

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
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any(), any()))
                .thenReturn(List.of(
                        new PushTokenRepository.Target("ExponentPushToken[aaa]", "en", "v2"),
                        new PushTokenRepository.Target("ExponentPushToken[bbb]", "en", "v2")));
        when(deviceRepo.findByImei("864290061234567")).thenReturn(Optional.empty());

        server.expect(requestTo(EXPO_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[aaa]"))
                .andExpect(jsonPath("$[1].to").value("ExponentPushToken[bbb]"))
                .andExpect(jsonPath("$[0].channelId").value("alarms_v2"))
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
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any(), any()))
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
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any(), any())).thenReturn(List.of());

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
        verify(tokenRepo, never()).listTokensForOrgAndType(any(), any(), any(), any());
    }

    @Test
    void receipts_purge_tokens_that_fcm_later_reports_unregistered() {
        UUID orgId = UUID.randomUUID();
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any(), any()))
                .thenReturn(List.of(
                        new PushTokenRepository.Target("ExponentPushToken[alive]", "en"),
                        new PushTokenRepository.Target("ExponentPushToken[gone]", "en"),
                        new PushTokenRepository.Target("ExponentPushToken[late]", "en")));
        when(deviceRepo.findByImei("864290061234567")).thenReturn(Optional.empty());
        // Expo accepts all three: FCM only tells us about the dead install in the receipt.
        server.expect(requestTo(EXPO_URL))
                .andRespond(withSuccess("""
                        {"data":[{"status":"ok","id":"t-alive"},{"status":"ok","id":"t-gone"},{"status":"ok","id":"t-late"}]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo(RECEIPTS_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.ids.length()").value(3))
                .andRespond(withSuccess("""
                        {"data":{
                          "t-alive":{"status":"ok"},
                          "t-gone":{"status":"error","message":"The recipient device is not registered with FCM.","details":{"error":"DeviceNotRegistered"}}
                        }}
                        """, MediaType.APPLICATION_JSON));
        pushService.sendAlarmPush(alarm(orgId));
        assertThat(pushService.pendingReceiptCount()).isEqualTo(3);

        // Too early: nothing is asked (the single receipts expectation would otherwise be used up here).
        pushService.checkReceipts(Instant.now().plus(PushService.RECEIPT_DELAY).minusSeconds(60));
        assertThat(pushService.pendingReceiptCount()).isEqualTo(3);

        pushService.checkReceipts(Instant.now().plus(PushService.RECEIPT_DELAY).plusSeconds(60));

        server.verify();
        verify(tokenRepo).deleteAll(List.of("ExponentPushToken[gone]"));
        // "t-late" had no receipt yet: kept for the next sweep, then dropped after a day.
        assertThat(pushService.pendingReceiptCount()).isEqualTo(1);
        pushService.checkReceipts(Instant.now().plus(PushService.RECEIPT_TTL).plusSeconds(60));
        assertThat(pushService.pendingReceiptCount()).isZero();
    }

    @Test
    void test_push_goes_to_one_phone_on_the_alarm_channel_and_reports_expos_answer() {
        server.expect(requestTo(EXPO_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[mine]"))
                .andExpect(jsonPath("$[0].channelId").value("alarms_v2"))
                .andExpect(jsonPath("$[0].sound").value("default"))
                .andExpect(jsonPath("$[0].priority").value("high"))
                .andRespond(withSuccess("{\"data\":[{\"status\":\"ok\",\"id\":\"t1\"}]}", MediaType.APPLICATION_JSON));

        org.assertj.core.api.Assertions.assertThat(pushService.sendTest("ExponentPushToken[mine]", "en", "v2")).isNull();
        server.verify();
    }

    @Test
    void test_push_to_a_dead_install_says_so_and_forgets_the_token() {
        server.expect(requestTo(EXPO_URL))
                .andRespond(withSuccess("{\"data\":[{\"status\":\"error\",\"message\":\"not registered\","
                        + "\"details\":{\"error\":\"DeviceNotRegistered\"}}]}", MediaType.APPLICATION_JSON));

        org.assertj.core.api.Assertions.assertThat(pushService.sendTest("ExponentPushToken[gone]", "bn", "v2"))
                .isEqualTo("DeviceNotRegistered");
        org.mockito.Mockito.verify(tokenRepo).deleteAll(List.of("ExponentPushToken[gone]"));
    }

    @Test
    void an_older_app_gets_the_channel_it_has_and_a_newer_one_the_v2_channel() {
        UUID orgId = UUID.randomUUID();
        when(tokenRepo.listTokensForOrgAndType(eq(orgId), any(), any(), any()))
                .thenReturn(List.of(
                        new PushTokenRepository.Target("ExponentPushToken[old]", "bn", null),
                        new PushTokenRepository.Target("ExponentPushToken[new]", "bn", "v2")));
        when(deviceRepo.findByImei("864290061234567")).thenReturn(Optional.empty());

        server.expect(requestTo(EXPO_URL))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[old]"))
                .andExpect(jsonPath("$[0].channelId").value("alarms"))
                .andRespond(withSuccess("{\"data\":[{\"status\":\"ok\",\"id\":\"a\"}]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(EXPO_URL))
                .andExpect(jsonPath("$[0].to").value("ExponentPushToken[new]"))
                .andExpect(jsonPath("$[0].channelId").value("alarms_v2"))
                .andRespond(withSuccess("{\"data\":[{\"status\":\"ok\",\"id\":\"b\"}]}", MediaType.APPLICATION_JSON));

        pushService.sendAlarmPush(alarm(orgId));
        server.verify();
    }
}
