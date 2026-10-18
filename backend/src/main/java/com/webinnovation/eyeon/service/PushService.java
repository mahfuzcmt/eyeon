package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Alarm;
import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.PushTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Push notification dispatch via the Expo Push Service
 * (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Expo relays to FCM on Android and APNs on iOS, so the backend needs no
 * Firebase/APNs credentials and the mobile app stays Expo Go-compatible.
 *
 * <p>Runs {@code @Async} — alarm dispatch must never block the ingestion
 * path (CLAUDE.md §3.2 rule 4). Tokens Expo reports as
 * {@code DeviceNotRegistered} (app uninstalled) are purged, both from the
 * immediate ticket and from the delivery receipt Expo publishes ~15 minutes
 * later - FCM usually only says "not registered" in the receipt (2026-10-18:
 * a reinstalled phone's old token was accepted, then failed in its receipt).
 */
@Service
@Slf4j
public class PushService {

    /** Expo caps each push request at 100 messages. */
    private static final int CHUNK_SIZE = 100;
    /** Expo caps each getReceipts request at 1000 ids. */
    private static final int RECEIPT_CHUNK = 1000;
    /** Expo recommends waiting about 15 minutes before asking for receipts. */
    static final Duration RECEIPT_DELAY = Duration.ofMinutes(15);
    /** Receipts are kept by Expo for 24 hours; tickets older than that are dropped. */
    static final Duration RECEIPT_TTL = Duration.ofHours(24);
    /** Bound on remembered tickets so a long Expo outage cannot grow memory without limit. */
    private static final int MAX_PENDING = 20_000;

    private final PushTokenRepository tokenRepo;
    private final DeviceRepository deviceRepo;
    private final NotificationComposer composer;
    private final RestClient restClient;
    private final boolean enabled;
    private final String receiptsUrl;
    /** Ticket id → token it was sent to; in memory only (a restart forgets at most a day of receipts). */
    private final Map<String, Pending> pendingReceipts = new ConcurrentHashMap<>();

    record Pending(String token, Instant sentAt) {}

    public PushService(PushTokenRepository tokenRepo,
                       DeviceRepository deviceRepo,
                       NotificationComposer composer,
                       RestClient.Builder restClientBuilder,
                       @Value("${eyeon.push.enabled:true}") boolean enabled,
                       @Value("${eyeon.push.expo-url:https://exp.host/--/api/v2/push/send}") String expoUrl,
                       @Value("${eyeon.push.access-token:}") String accessToken) {
        this.tokenRepo = tokenRepo;
        this.deviceRepo = deviceRepo;
        this.composer = composer;
        this.enabled = enabled;
        this.receiptsUrl = expoUrl.endsWith("/send")
                ? expoUrl.substring(0, expoUrl.length() - "/send".length()) + "/getReceipts"
                : expoUrl;
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
            // A geofence / trusted-place alarm belongs to the place's owner alone.
            Object owner = alarm.metadata() == null ? null
                    : alarm.metadata().get(com.webinnovation.eyeon.repository.AlarmRepository.GEOFENCE_OWNER_KEY);
            UUID onlyUser = owner == null ? null : UUID.fromString(owner.toString());
            List<PushTokenRepository.Target> targets =
                    tokenRepo.listTokensForOrgAndType(alarm.orgId(), alarm.type(), alarm.deviceImei(), onlyUser);
            if (targets.isEmpty()) return;

            String personName = deviceRepo.findByImei(alarm.deviceImei())
                    .map(Device::name)
                    .filter(n -> n != null && !n.isBlank())
                    .orElse(alarm.deviceImei());

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("alarmId", alarm.id().toString());
            data.put("imei", alarm.deviceImei());
            data.put("type", alarm.type());
            data.put("severity", alarm.severity());

            // Each install gets the alarm in the language its app is set to.
            Map<NotificationComposer.Lang, List<String>> byLang = new EnumMap<>(NotificationComposer.Lang.class);
            for (PushTokenRepository.Target t : targets) {
                byLang.computeIfAbsent(NotificationComposer.Lang.of(t.locale()), k -> new ArrayList<>())
                        .add(t.token());
            }
            for (var entry : byLang.entrySet()) {
                NotificationComposer.Message msg = composer.compose(alarm, personName, entry.getKey());
                List<String> tokens = entry.getValue();
                for (int i = 0; i < tokens.size(); i += CHUNK_SIZE) {
                    List<String> chunk = tokens.subList(i, Math.min(i + CHUNK_SIZE, tokens.size()));
                    sendChunk(chunk, msg, data);
                }
            }
        } catch (Exception e) {
            log.warn("Push dispatch failed for alarm {}: {}", alarm.id(), e.getMessage());
        }
    }

    private void sendChunk(List<String> tokens, NotificationComposer.Message msg, Map<String, Object> data) {
        List<Map<String, Object>> messages = new ArrayList<>(tokens.size());
        for (String token : tokens) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("to", token);
            m.put("title", msg.title());
            m.put("body", msg.body());
            m.put("data", data);
            m.put("sound", "default");
            m.put("priority", "high");
            m.put("channelId", msg.channelId());
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
            if (t != null && "ok".equals(t.status()) && t.id() != null && pendingReceipts.size() < MAX_PENDING) {
                pendingReceipts.put(t.id(), new Pending(tokens.get(i), Instant.now()));
            } else if (t != null && "error".equals(t.status())) {
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

    @Scheduled(fixedDelayString = "${eyeon.push.receipt-check-ms:300000}", initialDelay = 120_000)
    public void checkReceipts() {
        if (enabled) checkReceipts(Instant.now());
    }

    /** Ask Expo for receipts of tickets older than {@link #RECEIPT_DELAY}; purge dead installs. */
    void checkReceipts(Instant now) {
        pendingReceipts.entrySet().removeIf(e -> e.getValue().sentAt().isBefore(now.minus(RECEIPT_TTL)));
        List<String> due = pendingReceipts.entrySet().stream()
                .filter(e -> !e.getValue().sentAt().isAfter(now.minus(RECEIPT_DELAY)))
                .map(Map.Entry::getKey)
                .toList();
        for (int i = 0; i < due.size(); i += RECEIPT_CHUNK) {
            List<String> ids = due.subList(i, Math.min(i + RECEIPT_CHUNK, due.size()));
            try {
                ExpoReceiptsResponse response = restClient.post()
                        .uri(receiptsUrl)
                        .body(Map.of("ids", ids))
                        .retrieve()
                        .body(ExpoReceiptsResponse.class);
                handleReceipts(response);
            } catch (Exception e) {
                // Leave them pending: the next sweep retries until RECEIPT_TTL.
                log.warn("Expo receipt request failed ({} ids): {}", ids.size(), e.getMessage());
            }
        }
    }

    private void handleReceipts(ExpoReceiptsResponse response) {
        if (response == null || response.data() == null) return;
        List<String> dead = new ArrayList<>();
        response.data().forEach((id, receipt) -> {
            Pending p = pendingReceipts.remove(id);
            if (p == null || receipt == null || !"error".equals(receipt.status())) return;
            String error = receipt.details() == null ? null : receipt.details().error();
            if ("DeviceNotRegistered".equals(error)) {
                dead.add(p.token());
            } else {
                log.warn("Expo push receipt error for token …{}: {} ({})", tail(p.token()), receipt.message(), error);
            }
        });
        if (!dead.isEmpty()) {
            tokenRepo.deleteAll(dead);
            log.info("Purged {} push tokens reported unregistered in receipts", dead.size());
        }
    }

    int pendingReceiptCount() {
        return pendingReceipts.size();
    }

    private static String tail(String token) {
        return token.length() <= 8 ? token : token.substring(token.length() - 8);
    }

    record ExpoPushResponse(List<ExpoPushTicket> data) {}

    record ExpoPushTicket(String status, String id, String message, ExpoPushTicketDetails details) {}

    record ExpoReceiptsResponse(Map<String, ExpoPushTicket> data) {}

    record ExpoPushTicketDetails(String error) {}
}
