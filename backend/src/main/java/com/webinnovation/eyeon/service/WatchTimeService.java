package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.netty.WatchCommands;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.WatchSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Language and time zone of a smart watch, set from the app (2026-11-17).
 *
 * <p>The watch protocol has one command for both, {@code LZ,<language>,<zone>}, answered with
 * {@code LZ}; there is none to set the date or the time, which the watch takes from the network.
 * The zone is whole hours from UTC (the vendor document only shows whole hours). A change is
 * stored first and sent at once when the watch is connected; without an answer within
 * {@link #REPLY_WAIT} it stays PENDING and {@link #deliverPending} tries again every 30 s, so
 * it arrives when the watch next has a live connection (it heartbeats every 5 minutes).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WatchTimeService {

    public static final String WATCH = "WATCH";
    /** Vendor document "Setting language and time zone"; not every firmware has all of them. */
    public static final Set<Integer> LANGUAGES = Set.of(0, 1, 3, 4, 5, 7, 8, 9, 10);
    static final int MIN_ZONE = -12;
    static final int MAX_ZONE = 14;
    static final Duration REPLY_WAIT = Duration.ofSeconds(8);
    /** What a watch is set to when nobody chose otherwise: English, Bangladesh time (UTC+6). */
    public static final int DEFAULT_LANGUAGE = 0;
    public static final int DEFAULT_ZONE = 6;

    private final DeviceRepository devices;
    private final WatchSettingsRepository repo;
    private final WatchCommands commands;

    /** {@code language} / {@code zoneHours} are null until something was set from the app. */
    public record View(boolean online, Integer language, Integer zoneHours, String status, Instant syncedAt) {}

    public View get(UUID orgId, String imei) {
        requireWatch(orgId, imei);
        return view(imei);
    }

    public View save(UUID orgId, String imei, Integer language, Integer zoneHours) {
        requireWatch(orgId, imei);
        if (language == null || !LANGUAGES.contains(language)) {
            throw new IllegalArgumentException("Unknown watch language: " + language);
        }
        if (zoneHours == null || zoneHours < MIN_ZONE || zoneHours > MAX_ZONE) {
            throw new IllegalArgumentException("Time zone must be between UTC" + MIN_ZONE + " and UTC+" + MAX_ZONE);
        }
        repo.saveWanted(orgId, imei, language, zoneHours);
        deliver(imei, language, zoneHours);
        return view(imei);
    }

    /**
     * A watch identified on a connection (2026-11-21, owner: "when a watch connects its date, time
     * and time zone should follow the server, Bangladesh +6"). A watch never set from the app gets
     * the defaults; the sweep below delivers them within 30 s. The watch takes the date and the
     * time itself from the mobile network; the time zone is what decides what its face shows.
     */
    public void onWatchConnected(UUID orgId, String imei) {
        try {
            if (repo.find(imei).isEmpty()) {
                repo.saveWanted(orgId, imei, DEFAULT_LANGUAGE, DEFAULT_ZONE);
                log.info("Watch imei={} has no time zone set yet: UTC+{} will be sent", imei, DEFAULT_ZONE);
            }
        } catch (Exception e) {
            log.warn("Watch imei={} time zone not prepared: {}", imei, e.getMessage());
        }
    }

    /**
     * The watch's power-on burst (CONFIG, RYIMEI): it has restarted - after a flat battery, or a
     * factory reset - and may have lost what it was set to, so the stored values go out again.
     */
    public void onWatchPowerOn(UUID orgId, String imei) {
        try {
            if (repo.find(imei).isPresent()) {
                repo.markPending(imei);
            } else {
                repo.saveWanted(orgId, imei, DEFAULT_LANGUAGE, DEFAULT_ZONE);
            }
        } catch (Exception e) {
            log.warn("Watch imei={} time zone not re-sent after power-on: {}", imei, e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    public void deliverPending() {
        for (WatchSettingsRepository.Row row : repo.listPending()) {
            try {
                deliver(row.imei(), row.language(), row.zoneHours());
            } catch (Exception e) {
                log.warn("Watch settings for imei={} not delivered: {}", row.imei(), e.getMessage());
            }
        }
    }

    /** True when the watch answered. */
    /**
     * {@code LZ,<language>,<zone>} sets language and zone (the 2018 protocol document);
     * {@code ZONE,<zone>} is the time-zone command of the maker's integration guide of 2026-03-17
     * (section 2.3.3), which the production watch answered on 2026-11-21. Both are sent; the
     * setting counts as delivered once the watch has answered both. Neither document has a
     * command for the date or the time of day: the watch takes them from the mobile network, and
     * the zone decides what it shows.
     */
    boolean deliver(String imei, int language, int zoneHours) {
        if (!commands.connected(imei)) {
            return false;
        }
        try {
            if (!answered(commands.send(imei, "LZ," + language + "," + zoneHours), "LZ")) {
                return false;
            }
            if (!answered(commands.send(imei, "ZONE," + zoneHours), "ZONE")) {
                return false;
            }
            repo.markSynced(imei, language, zoneHours);
            log.info("Watch imei={} took language={} zone=UTC{}{}", imei, language, zoneHours < 0 ? "" : "+", zoneHours);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            // no answer in time, or the connection went away: stays PENDING
        }
        return false;
    }

    private static boolean answered(java.util.concurrent.CompletableFuture<String> reply, String command) throws Exception {
        String r = reply.get(REPLY_WAIT.toMillis(), TimeUnit.MILLISECONDS);
        return r != null && r.startsWith(command);
    }

    private View view(String imei) {
        boolean online = commands.connected(imei);
        return repo.find(imei)
                .map(r -> new View(online, r.language(), r.zoneHours(), r.status(), r.syncedAt()))
                .orElseGet(() -> new View(online, null, null, null, null));
    }

    private void requireWatch(UUID orgId, String imei) {
        Device device = devices.findByOrgAndImei(orgId, imei).orElseThrow(() -> new NotFoundException("Device", imei));
        if (!WATCH.equals(device.protocol())) {
            throw new IllegalArgumentException("This tracker is not a watch");
        }
    }
}
