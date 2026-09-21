package com.webinnovation.eyeon.ws;

import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.repository.UserDeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Who in an organization may receive live data about which child. Live locations and alarms
 * are delivered to each user's own queue ({@code /user/queue/...}), filtered here on the
 * server: a parent in a school receives only their own children's updates.
 *
 * <p>Until 2026-09-21 they were broadcast to {@code /topic/org/{orgId}/...}, so every parent's
 * browser or phone received every child's live position and relied on the UI to hide it
 * (CLAUDE.md section 18 pitfall 9, at user level rather than org level).
 *
 * <p>Cached per organization for {@link #TTL_MS}; {@link #invalidate(UUID)} is called when an
 * admin changes a user's assignments, role or active flag, so access changes apply at once.
 */
@Component
@RequiredArgsConstructor
public class LiveAudience {

    static final long TTL_MS = 30_000;

    /** @param userName the STOMP principal name (user id); @param visible null = every child */
    public record Viewer(String userName, Set<String> visible) {
        public boolean canSee(String imei) {
            return visible == null || (imei != null && visible.contains(imei));
        }
    }

    private record Entry(long expiresAt, List<Viewer> viewers) {}

    private final UserRepository userRepo;
    private final UserDeviceRepository userDeviceRepo;
    private final Map<UUID, Entry> cache = new ConcurrentHashMap<>();

    public List<Viewer> forOrg(UUID orgId) {
        long now = System.currentTimeMillis();
        Entry e = cache.get(orgId);
        if (e != null && e.expiresAt() > now) return e.viewers();
        List<Viewer> viewers = load(orgId);
        cache.put(orgId, new Entry(now + TTL_MS, viewers));
        return viewers;
    }

    public void invalidate(UUID orgId) {
        if (orgId != null) cache.remove(orgId);
    }

    private List<Viewer> load(UUID orgId) {
        Map<UUID, Set<String>> assigned = new HashMap<>();
        for (UserDeviceRepository.Assignment a : userDeviceRepo.listForOrg(orgId)) {
            assigned.computeIfAbsent(a.userId(), k -> new HashSet<>()).add(a.deviceImei());
        }
        List<Viewer> out = new ArrayList<>();
        for (User u : userRepo.listByOrg(orgId)) {
            if (!u.isActive()) continue;
            boolean seesAll = "SUPER_ADMIN".equals(u.role()) || "ORG_ADMIN".equals(u.role()) || u.seeAllDevices();
            out.add(new Viewer(u.id().toString(), seesAll ? null : Set.copyOf(assigned.getOrDefault(u.id(), Set.of()))));
        }
        return List.copyOf(out);
    }
}
