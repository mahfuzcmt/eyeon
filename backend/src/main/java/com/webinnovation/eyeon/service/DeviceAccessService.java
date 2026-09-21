package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.exception.ForbiddenException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.UserDeviceRepository;
import com.webinnovation.eyeon.repository.UserRepository;
import com.webinnovation.eyeon.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Resolves which trackers (children) a user may see. Admins and users flagged
 * {@code see_all_devices} see the whole organization; everyone else - a parent in a school -
 * only the children assigned to them in {@code user_devices}.
 *
 * <p><b>Every endpoint that takes an IMEI must call {@link #requireVisible(String)}</b>, not just
 * check that the tracker belongs to the organization. Until 2026-09-21 several did only the org
 * check, so a parent in a school could read any other child's location history by IMEI.
 */
@Service
@RequiredArgsConstructor
public class DeviceAccessService {

    private final UserRepository userRepo;
    private final UserDeviceRepository userDeviceRepo;
    private final DeviceRepository deviceRepo;

    /** @return {@code null} when unrestricted, otherwise the (possibly empty) set of visible IMEIs. */
    public Set<String> visibleImeis(UUID userId, String role) {
        if (userId == null) return null;
        if ("SUPER_ADMIN".equals(role) || "ORG_ADMIN".equals(role)) return null;
        boolean seeAll = userRepo.findById(userId).map(User::seeAllDevices).orElse(false);
        if (seeAll) return null;
        return new HashSet<>(userDeviceRepo.getDeviceImeis(userId));
    }

    /** Same as {@link #visibleImeis(UUID, String)} but reads the role from the user row (background jobs). */
    public Set<String> visibleImeis(UUID userId) {
        if (userId == null) return null;
        // Not Optional.map(...): for an admin visibleImeis(...) returns null ("everyone"), which
        // map() turns into an empty Optional, so orElse() used to hand admins an EMPTY set - their
        // "all children" alarm rules never fired and their place alerts were dropped (fixed 2026-09-21).
        java.util.Optional<User> user = userRepo.findById(userId);
        if (user.isEmpty()) return new HashSet<>();
        return visibleImeis(userId, user.get().role());
    }

    /** Visible IMEIs for the user of the current request; null = the whole organization. */
    public Set<String> visibleForCurrentUser() {
        return visibleImeis(TenantContext.currentUserId(), TenantContext.currentRole());
    }

    public boolean currentUserSeesAll() {
        return visibleForCurrentUser() == null;
    }

    /**
     * The tracker must belong to the caller's organization AND be one the caller may see.
     * Answers 404 either way, so an IMEI of another family's child is indistinguishable from
     * one that does not exist.
     */
    public void requireVisible(String imei) {
        UUID orgId = TenantContext.requireOrgId();
        if (imei == null || deviceRepo.findByOrgAndImei(orgId, imei).isEmpty()
                || !canSee(visibleForCurrentUser(), imei)) {
            throw new NotFoundException("device", imei);
        }
    }

    /** For organization-wide reports and exports: only users who can see every child. */
    public void requireSeesAll() {
        TenantContext.requireOrgId();
        if (!currentUserSeesAll()) {
            throw new ForbiddenException("Only school or family administrators can use organization-wide reports");
        }
    }

    public static boolean canSee(Set<String> visible, String imei) {
        return visible == null || (imei != null && visible.contains(imei));
    }
}
