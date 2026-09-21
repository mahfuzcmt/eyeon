package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Alarm;
import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.PushTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Push notification dispatch via the Expo Push Service
 * (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Expo relays to FCM on Android and APNs on iOS, so the backend needs no
 * Firebase/APNs credentials and the mobile app stays Expo Go-compatible.
 *
 * <p>Runs {@code @Async} — alarm dispatch must never block the ingestion
 * path (CLAUDE.md §3.2 rule 4). Tokens Expo reports as
 * {@code DeviceNotRegistered} (app uninstalled) are purged.
 */
@Service
@Slf4j
public class PushService {

    /** Expo caps each push request at 100 messages. */
    private static final int CHUNK_SIZE = 100;

    private static final DateTimeFormatter DHAKA_TIME =
            DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Dhaka"));

    private final PushTokenRepository tokenRepo;
    private final DeviceRepository deviceRepo;
    private final RestClient restClient;
    private final boolean enabled;

    public PushService(PushTokenRepository tokenRepo,
                       DeviceRepository deviceRepo,
                       RestClient.Builder restClientBuilder,
                       @Value("${motolink.push.enabled:true}") boolean enabled,
                       @Value("${motolink.push.expo-url:https://exp.host/--/api/v2/push/send}") String expoUrl,
                       @Value("${motolink.push.access-token:}") String accessToken) {
        this.tokenRepo = tokenRepo;
        this.deviceRepo = deviceRepo;
        this.enabled = enabled;
        restClientBuilder = restClientBuilder.clone()
                .baseUrl(expoUrl)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "application/json");
        if (!accessToken.isBlank()) {
            restClientBuilder.defaultHeader("Authorization", "Bearer " + accessToken);
        }
        this.restClient = restClientBuilder.build();
    }

    /**
     * Push an alarm to every registered mobile device of the alarm's org.
     * Fire-and-forget: failures are logged, never propagated to the caller.
     */
    @Async
    public void sendAlarmPush(Alarm alarm) {
        if (!enabled) return;
        try {
            // Respect each user's push preferences (Settings → Notifications).
            List<String> tokens = tokenRepo.listTokensForOrgAndType(alarm.orgId(), alarm.type(), alarm.deviceImei());
            if (tokens.isEmpty()) return;

            String deviceLabel = deviceRepo.findByImei(alarm.deviceImei())
                    .map(Device::name)
                    .filter(n -> n != null && !n.isBlank())
                    .orElse(alarm.deviceImei());
            String typeLabel = alarm.type().replace('_', ' ');
            boolean critical = "CRITICAL".equals(alarm.severity());
            String title = (critical ? "🚨 " : "⚠️ ") + typeLabel + " — " + deviceLabel;
            String body = capitalize(alarm.severity()) + " alarm at "
                    + DHAKA_TIME.format(alarm.ts()) + ". Tap to view the vehicle.";

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("alarmId", alarm.id().toString());
            data.put("imei", alarm.deviceImei());
            data.put("type", alarm.type());
            data.put("severity", alarm.severity());

            for (int i = 0; i < tokens.size(); i += CHUNK_SIZE) {
                List<String> chunk = tokens.subList(i, Math.min(i + CHUNK_SIZE, tokens.size()));
                sendChunk(chunk, title, body, data);
            }
        } catch (Exception e) {
            log.warn("Push dispatch failed for alarm {}: {}", alarm.id(), e.getMessage());
        }
    }

    private void sendChunk(List<String> tokens, String title, String body, Map<String, Object> data) {
        List<Map<String, Object>> messages = new ArrayList<>(tokens.size());
        for (String token : tokens) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("to", token);
            m.put("title", title);
            m.put("body", body);
            m.put("data", data);
            m.put("sound", "default");
            m.put("priority", "high");
            m.put("channelId", "alarms");
            messages.add(m);
        }
        try {
            ExpoPushResponse response = restClient.post()
                    .body(messages)
                    .retrieve()
                    .body(ExpoPushResponse.class);
            handleTickets(tokens, response);
        } catch (Exception e) {
            log.warn("Expo push request failed ({} tokens): {}", tokens.size(), e.getMessage());
        }
    }

    /** Tickets come back in request order; purge tokens for dead installs. */
    private void handleTickets(List<String> tokens, ExpoPushResponse response) {
        if (response == null || response.data() == null) return;
        List<String> dead = new ArrayList<>();
        List<ExpoPushTicket> tickets = response.data();
        for (int i = 0; i < tickets.size() && i < tokens.size(); i++) {
            ExpoPushTicket t = tickets.get(i);
            if (t != null && "error".equals(t.status())) {
                String error = t.details() == null ? null : t.details().error();
                if ("DeviceNotRegistered".equals(error)) {
                    dead.add(tokens.get(i));
                } else {
                    log.warn("Expo push ticket error for token …{}: {} ({})",
                            tail(tokens.get(i)), t.message(), error);
                }
            }
        }
        if (!dead.isEmpty()) {
            tokenRepo.deleteAll(dead);
            log.info("Purged {} unregistered push tokens", dead.size());
        }
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return "";
        return s.charAt(0) + s.substring(1).toLowerCase(Locale.ROOT);
    }

    private static String tail(String token) {
        return token.length() <= 8 ? token : token.substring(token.length() - 8);
    }

    record ExpoPushResponse(List<ExpoPushTicket> data) {}

    record ExpoPushTicket(String status, String message, ExpoPushTicketDetails details) {}

    record ExpoPushTicketDetails(String error) {}
}
