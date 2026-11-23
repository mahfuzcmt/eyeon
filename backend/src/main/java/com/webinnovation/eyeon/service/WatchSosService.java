package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.netty.WatchCommands;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.WatchSosRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * SOS numbers of a smart watch, set from the app (owner, 2026-11-23: "set SOS number from the app
 * like the previous device").
 *
 * <p>{@code SOS,<n1>,<n2>,<n3>}, answered with {@code SOS} (the maker's integration guide, section
 * 2.3.4). When the SOS button is held the watch calls the numbers in order, twice round if nobody
 * answers, and texts all three - from the watch's own SIM, so it needs credit. EyeOn's own SOS
 * alert in the app and the SMS from the server are separate and unchanged. The watch cannot be
 * asked which numbers it holds, so what is shown is what was last sent and acknowledged.
 * Delivery works like {@link WatchTimeService}: stored first, sent at once when the watch is
 * connected, otherwise PENDING and retried every 30 s; sent again after the watch restarts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WatchSosService {

    public static final int MAX_NUMBERS = 3;
    /** Digits with an optional leading +; 3 digits allows short service numbers such as 999. */
    private static final Pattern NUMBER = Pattern.compile("\\+?\\d{3,15}");
    private static final Pattern SEPARATORS = Pattern.compile("[\\s\\-().]");
    static final Duration REPLY_WAIT = Duration.ofSeconds(8);

    private final DeviceRepository devices;
    private final WatchSosRepository repo;
    private final WatchCommands commands;

    /** {@code status} is null until numbers were set from the app. */
    public record View(boolean online, List<String> numbers, String status, Instant syncedAt) {}

    public View get(UUID orgId, String imei) {
        requireWatch(orgId, imei);
        return view(imei);
    }

    public View save(UUID orgId, String imei, List<String> numbers) {
        requireWatch(orgId, imei);
        List<String> cleaned = clean(numbers);
        repo.saveWanted(orgId, imei, cleaned);
        deliver(imei, cleaned);
        return view(imei);
    }

    /** The watch restarted (power-on burst) and may have lost its numbers: send them again. */
    public void onWatchPowerOn(String imei) {
        try {
            if (repo.find(imei).isPresent()) {
                repo.markPending(imei);
            }
        } catch (Exception e) {
            log.warn("Watch imei={} SOS numbers not re-sent after power-on: {}", imei, e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 45_000)
    public void deliverPending() {
        for (WatchSosRepository.Row row : repo.listPending()) {
            try {
                deliver(row.imei(), row.numbers());
            } catch (Exception e) {
                log.warn("Watch SOS numbers for imei={} not delivered: {}", row.imei(), e.getMessage());
            }
        }
    }

    /**
     * Blank entries are dropped, separators removed; at most three, each a phone number, no
     * number twice. An empty list is allowed: it clears the watch's numbers.
     */
    static List<String> clean(List<String> numbers) {
        List<String> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String n : numbers == null ? List.<String>of() : numbers) {
            if (n == null) {
                continue;
            }
            String c = SEPARATORS.matcher(n).replaceAll("");
            if (c.isEmpty()) {
                continue;
            }
            if (!NUMBER.matcher(c).matches()) {
                throw new IllegalArgumentException("Not a phone number: " + n.trim());
            }
            if (!seen.add(c)) {
                throw new IllegalArgumentException("The same number is entered twice: " + c);
            }
            out.add(c);
        }
        if (out.size() > MAX_NUMBERS) {
            throw new IllegalArgumentException("A watch takes at most " + MAX_NUMBERS + " SOS numbers");
        }
        return List.copyOf(out);
    }

    /** {@code SOS,n1,n2,n3}: always three places, unused ones empty. */
    static String command(List<String> numbers) {
        StringBuilder sb = new StringBuilder("SOS");
        for (int i = 0; i < MAX_NUMBERS; i++) {
            sb.append(',').append(i < numbers.size() ? numbers.get(i) : "");
        }
        return sb.toString();
    }

    /** True when the watch answered. */
    boolean deliver(String imei, List<String> numbers) {
        if (!commands.connected(imei)) {
            return false;
        }
        try {
            CompletableFuture<String> reply = commands.send(imei, command(numbers));
            String r = reply.get(REPLY_WAIT.toMillis(), TimeUnit.MILLISECONDS);
            if (r == null || !r.startsWith("SOS")) {
                return false;
            }
            repo.markSynced(imei, numbers);
            log.info("Watch imei={} took {} SOS number(s)", imei, numbers.size());
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            // no answer in time, or the connection went away: stays PENDING
        }
        return false;
    }

    private View view(String imei) {
        boolean online = commands.connected(imei);
        return repo.find(imei)
                .map(r -> new View(online, r.numbers(), r.status(), r.syncedAt()))
                .orElseGet(() -> new View(online, List.of(), null, null));
    }

    private void requireWatch(UUID orgId, String imei) {
        Device device = devices.findByOrgAndImei(orgId, imei).orElseThrow(() -> new NotFoundException("Device", imei));
        if (!WatchTimeService.WATCH.equals(device.protocol())) {
            throw new IllegalArgumentException("This tracker is not a watch");
        }
    }
}
