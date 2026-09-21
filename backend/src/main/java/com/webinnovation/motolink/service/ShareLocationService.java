package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.domain.ShareLocationLink;
import com.webinnovation.motolink.dto.ShareLocationDtos.*;
import com.webinnovation.motolink.exception.ForbiddenException;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.LocationRepository;
import com.webinnovation.motolink.repository.ShareLocationLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShareLocationService {

    private final ShareLocationLinkRepository linkRepo;
    private final DeviceRepository deviceRepo;
    private final LocationRepository locationRepo;

    @Value("${motolink.share.base-url:}")
    private String shareBaseUrl;

    @Value("${motolink.share.max-links-per-device:5}")
    private int maxLinksPerDevice;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Create a new share link for a device.
     */
    @Transactional
    public ShareLinkView createLink(UUID orgId, UUID userId, CreateShareLinkRequest req) {
        // Verify device belongs to org
        Device device = deviceRepo.findByImei(req.deviceImei())
                .orElseThrow(() -> new NotFoundException("Device not found: " + req.deviceImei()));

        if (!device.orgId().equals(orgId)) {
            throw new ForbiddenException("Device does not belong to your organization");
        }

        // Check link limit per device
        int activeCount = linkRepo.countActiveByDevice(orgId, req.deviceImei());
        if (activeCount >= maxLinksPerDevice) {
            throw new ForbiddenException("Maximum " + maxLinksPerDevice + " active share links per device");
        }

        // Generate secure token
        String token = generateToken();

        // Calculate expiration
        Instant expiresAt = Instant.now().plus(req.expiresInHours(), ChronoUnit.HOURS);

        ShareLocationLink link = linkRepo.create(
                orgId,
                req.deviceImei(),
                token,
                req.label(),
                expiresAt,
                req.showHistory(),
                req.allowRealtime(),
                userId
        );

        log.info("Created share link {} for device {} by user {}", link.id(), req.deviceImei(), userId);

        return ShareLinkView.of(link, getBaseUrl());
    }

    /**
     * List all active share links for a device.
     */
    public List<ShareLinkView> listByDevice(UUID orgId, String deviceImei) {
        return linkRepo.listByDevice(orgId, deviceImei).stream()
                .map(link -> ShareLinkView.of(link, getBaseUrl()))
                .toList();
    }

    /**
     * Revoke (deactivate) a share link.
     */
    @Transactional
    public void revokeLink(UUID orgId, UUID linkId) {
        boolean success = linkRepo.deactivate(orgId, linkId);
        if (!success) {
            throw new NotFoundException("Share link not found");
        }
        log.info("Revoked share link {} in org {}", linkId, orgId);
    }

    /**
     * Get shared location data by token (public, no auth).
     */
    @Transactional
    public SharedLocationView getSharedLocation(String token, String ipAddress, String userAgent) {
        ShareLocationLink link = linkRepo.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Share link not found or expired"));

        if (!link.isValid()) {
            throw new NotFoundException("Share link has expired");
        }

        // Record access
        linkRepo.recordAccess(link.id(), ipAddress, userAgent);

        // Get device info
        Device device = deviceRepo.findByImei(link.deviceImei())
                .orElseThrow(() -> new NotFoundException("Device not found"));

        // Determine online status (seen in last 10 minutes)
        boolean isOnline = device.lastSeenAt() != null &&
                device.lastSeenAt().isAfter(Instant.now().minus(10, ChronoUnit.MINUTES));

        return new SharedLocationView(
                device.name(),
                device.vehiclePlate(),
                device.vehicleType(),
                device.lastLatitude() != null ? device.lastLatitude() : 0,
                device.lastLongitude() != null ? device.lastLongitude() : 0,
                device.lastSpeed() != null ? device.lastSpeed() : 0,
                device.lastCourse() != null ? device.lastCourse() : 0,
                device.lastSeenAt(),
                isOnline,
                link.showHistory(),
                link.allowRealtime()
        );
    }

    /**
     * Get route history for a shared link (if enabled).
     */
    public List<SharedHistoryPoint> getSharedHistory(String token) {
        ShareLocationLink link = linkRepo.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Share link not found or expired"));

        if (!link.isValid()) {
            throw new NotFoundException("Share link has expired");
        }

        if (!link.showHistory()) {
            throw new ForbiddenException("Route history is not enabled for this share link");
        }

        // Get last 24 hours of locations
        Instant since = Instant.now().minus(24, ChronoUnit.HOURS);

        return locationRepo.findHistory(link.orgId(), link.deviceImei(), since, Instant.now(), 500).stream()
                .map(loc -> new SharedHistoryPoint(
                        loc.ts(),
                        loc.latitude(),
                        loc.longitude(),
                        loc.speed()
                ))
                .toList();
    }

    /**
     * Validate a share token (for WebSocket auth).
     */
    public ShareLocationLink validateToken(String token) {
        ShareLocationLink link = linkRepo.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Invalid share token"));

        if (!link.isValid()) {
            throw new ForbiddenException("Share link has expired");
        }

        if (!link.allowRealtime()) {
            throw new ForbiddenException("Real-time updates not enabled for this share link");
        }

        return link;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String getBaseUrl() {
        if (shareBaseUrl != null && !shareBaseUrl.isBlank()) {
            return shareBaseUrl.replaceAll("/+$", "");
        }
        // Fallback: the public dashboard domain. Override per environment with
        // MOTOLINK_SHARE_BASE_URL (→ motolink.share.base-url).
        return "https://eyeongps.com";
    }
}
