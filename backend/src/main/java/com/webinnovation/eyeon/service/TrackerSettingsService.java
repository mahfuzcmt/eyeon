package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.repository.TrackerSettingsRepository;
import com.webinnovation.eyeon.repository.TrackerSettingsRepository.Row;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Reads and changes the settings of a tracker ({@link TrackerSetting}) over its own connection.
 *
 * <p>A change is stored as PENDING, written to the tracker when it is connected, and then
 * <b>read back</b>: only what the tracker reports afterwards counts ({@code applied}). If the
 * tracker is not connected the change waits; {@link #sweep()} delivers it when the tracker comes
 * back - for a tracker in its night rest, when it wakes. A connected tracker whose settings have
 * never been read is read once in the background, so the app knows, for example, that a tracker
 * rests from 00:00 to 07:00 without anyone opening its settings.
 *
 * <p>Commands to one tracker are sent one at a time ({@link #locks}).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrackerSettingsService {

    static final long REPLY_WAIT_SECONDS = 12;
    /** How long a save waits for the tracker before answering "pending". */
    static final long SAVE_WAIT_SECONDS = 11;
    static final int MAX_BACKGROUND_READS = 3;

    private final TrackerSettingsRepository repo;
    private final DeviceCommandService commands;

    private final Map<String, ReentrantLock> locks = new ConcurrentHashMap<>();
    private final Set<String> reading = ConcurrentHashMap.newKeySet();
    private final Map<String, Integer> backgroundReads = new ConcurrentHashMap<>();

    /** @param status SYNCED / PENDING / FAILED / UNSUPPORTED, or UNKNOWN when never read from the tracker */
    public record Item(String key, Map<String, Object> wanted, Map<String, Object> applied, String status,
                       String trackerReply, Instant syncedAt) {}

    /** @param reading the tracker is being asked for its settings right now: ask again in a moment */
    public record Panel(String imei, boolean online, boolean reading, List<Item> settings) {}

    public Panel panel(UUID orgId, String imei) {
        Map<TrackerSetting, Row> rows = rows(orgId, imei);
        List<Item> items = new ArrayList<>();
        for (TrackerSetting s : TrackerSetting.values()) {
            Row r = rows.get(s);
            items.add(r == null
                    ? new Item(s.name(), null, null, "UNKNOWN", null, null)
                    : new Item(s.name(), r.wanted(), r.applied(), r.syncStatus(), r.trackerReply(), r.syncedAt()));
        }
        return new Panel(imei, commands.isOnline(imei), reading.contains(imei), items);
    }

    private Map<TrackerSetting, Row> rows(UUID orgId, String imei) {
        Map<TrackerSetting, Row> out = new EnumMap<>(TrackerSetting.class);
        for (Row r : repo.listForDevice(orgId, imei)) {
            try {
                out.put(TrackerSetting.valueOf(r.key()), r);
            } catch (IllegalArgumentException ignored) {
                // a setting this version no longer knows
            }
        }
        return out;
    }

    /** Starts reading every setting from the tracker in the background. @return false when it is not connected */
    public boolean startReading(UUID orgId, String imei) {
        if (!commands.isOnline(imei)) return false;
        if (!reading.add(imei)) return true;
        Thread.ofVirtual().name("tracker-read-" + imei).start(() -> {
            try {
                readAll(orgId, imei);
            } finally {
                reading.remove(imei);
            }
        });
        return true;
    }

    /** Asks the tracker for each setting in turn. A PENDING change is left alone: it is about to be written. */
    void readAll(UUID orgId, String imei) {
        ReentrantLock lock = lockFor(imei);
        lock.lock();
        try {
            Map<TrackerSetting, Row> rows = rows(orgId, imei);
            for (TrackerSetting s : TrackerSetting.values()) {
                Row row = rows.get(s);
                if (row != null && TrackerSettingsRepository.PENDING.equals(row.syncStatus())) continue;
                if (!commands.isOnline(imei)) return;
                String reply = ask(orgId, imei, s.query());
                if (reply == null) continue;
                Map<String, Object> value = s.parse(reply);
                if (value == null) {
                    repo.saveUnsupported(orgId, imei, s.name(), reply);
                } else {
                    // Read on request: whatever the tracker says is the truth now, and nothing is waiting.
                    repo.saveApplied(orgId, imei, s.name(), value, TrackerSettingsRepository.SYNCED, reply);
                }
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * Stores the wanted value and tries to write it at once.
     * @return the setting as it stands after at most {@value #SAVE_WAIT_SECONDS} seconds
     */
    public Item save(UUID orgId, String imei, String key, Map<String, Object> input) {
        TrackerSetting setting = TrackerSetting.of(key);
        if (input == null) throw new IllegalArgumentException("A value is required");
        Row before = rows(orgId, imei).get(setting);
        Map<String, Object> wanted = setting.normalize(input, before == null ? null : before.applied());
        repo.saveWanted(orgId, imei, setting.name(), wanted);

        if (commands.isOnline(imei)) {
            CompletableFuture<Void> push = new CompletableFuture<>();
            Thread.ofVirtual().name("tracker-write-" + imei).start(() -> {
                try {
                    push(orgId, imei, setting, wanted);
                } finally {
                    push.complete(null);
                }
            });
            try {
                push.get(SAVE_WAIT_SECONDS, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (ExecutionException | TimeoutException e) {
                // Still on its way; the caller sees PENDING and the panel shows the outcome when it refreshes.
            }
        }
        Row after = rows(orgId, imei).get(setting);
        return new Item(setting.name(), after.wanted(), after.applied(), after.syncStatus(), after.trackerReply(), after.syncedAt());
    }

    /** Writes a wanted value and reads it back. Leaves the row PENDING when the tracker cannot be reached. */
    void push(UUID orgId, String imei, TrackerSetting setting, Map<String, Object> wanted) {
        ReentrantLock lock = lockFor(imei);
        lock.lock();
        try {
            String lastReply = null;
            for (String command : setting.commands(wanted)) {
                lastReply = ask(orgId, imei, command);
                if (lastReply == null) return;
            }
            String reply = ask(orgId, imei, setting.query());
            if (reply == null) return;
            Map<String, Object> applied = setting.parse(reply);
            if (applied == null) {
                repo.saveUnsupported(orgId, imei, setting.name(), reply);
                return;
            }
            boolean ok = setting.matches(wanted, applied);
            repo.saveApplied(orgId, imei, setting.name(), applied,
                    ok ? TrackerSettingsRepository.SYNCED : TrackerSettingsRepository.FAILED,
                    ok ? reply : "Sent: " + String.join(" ", setting.commands(wanted)) + " | Answer: " + lastReply + " | Now: " + reply);
            if (ok) log.info("Tracker setting {} written to imei={}: {}", setting, imei, reply);
            else log.warn("Tracker imei={} did not take {}: wanted={} reports={} lastReply={}", imei, setting, wanted, applied, lastReply);
        } finally {
            lock.unlock();
        }
    }

    /** @return the tracker's answer, or null when it is not connected or did not answer in time */
    private String ask(UUID orgId, String imei, String command) {
        try {
            return commands.sendRaw(orgId, imei, command).get(REPLY_WAIT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (ExecutionException | TimeoutException e) {
            log.info("No answer from imei={} to {}: {}", imei, command, e.getMessage());
            return null;
        }
    }

    private ReentrantLock lockFor(String imei) {
        return locks.computeIfAbsent(imei, k -> new ReentrantLock());
    }

    @Scheduled(fixedRate = 60_000, initialDelay = 90_000)
    public void sweep() {
        try {
            for (Row r : repo.listPending()) {
                if (r.wanted() == null || !commands.isOnline(r.imei())) continue;
                TrackerSetting setting;
                try {
                    setting = TrackerSetting.valueOf(r.key());
                } catch (IllegalArgumentException e) {
                    continue;
                }
                push(r.orgId(), r.imei(), setting, r.wanted());
            }
            for (TrackerSettingsRepository.Unread u : repo.listOnlineUnread(2)) {
                // A tracker that never answers is not asked for ever.
                if (backgroundReads.merge(u.imei(), 1, Integer::sum) > MAX_BACKGROUND_READS) continue;
                startReading(u.orgId(), u.imei());
            }
        } catch (Exception e) {
            log.warn("Tracker-settings sweep failed: {}", e.getMessage());
        }
    }
}
