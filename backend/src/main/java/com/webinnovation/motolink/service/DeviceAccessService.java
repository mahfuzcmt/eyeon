package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.User;
import com.webinnovation.motolink.repository.UserDeviceRepository;
import com.webinnovation.motolink.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Resolves which device IMEIs the current user may see. Mirrors the rule in
 * {@code DeviceController}: admins and users flagged {@code see_all_devices} see
 * the whole org; everyone else only the rows in {@code user_devices}.
 */
@Service
@RequiredArgsConstructor
public class DeviceAccessService {

    private final UserRepository userRepo;
    private final UserDeviceRepository userDeviceRepo;

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
        return userRepo.findById(userId)
                .map(u -> visibleImeis(userId, u.role()))
                .orElse(new HashSet<>());
    }

    public static boolean canSee(Set<String> visible, String imei) {
        return visible == null || (imei != null && visible.contains(imei));
    }
}
