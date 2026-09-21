package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.ShareLocationDtos.*;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.ShareLocationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for managing share location links.
 * Requires authentication.
 */
@RestController
@RequestMapping("/share-links")
@RequiredArgsConstructor
public class ShareLocationController {

    private final ShareLocationService shareService;

    /**
     * Create a new share link for a device.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShareLinkView create(@Valid @RequestBody CreateShareLinkRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        return shareService.createLink(orgId, userId, req);
    }

    /**
     * List all active share links for a device.
     */
    @GetMapping("/device/{imei}")
    public List<ShareLinkView> listByDevice(@PathVariable String imei) {
        UUID orgId = TenantContext.requireOrgId();
        return shareService.listByDevice(orgId, imei);
    }

    /**
     * Revoke (deactivate) a share link.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        shareService.revokeLink(orgId, id);
    }
}

/**
 * Public endpoints for accessing shared locations.
 * No authentication required.
 */
@RestController
@RequestMapping("/public/share")
@RequiredArgsConstructor
class PublicShareController {

    private final ShareLocationService shareService;

    /**
     * Get current location for a shared link.
     */
    @GetMapping("/{token}")
    public SharedLocationView getLocation(
            @PathVariable String token,
            HttpServletRequest request
    ) {
        String ipAddress = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        return shareService.getSharedLocation(token, ipAddress, userAgent);
    }

    /**
     * Get route history for a shared link (if enabled).
     */
    @GetMapping("/{token}/history")
    public List<SharedHistoryPoint> getHistory(@PathVariable String token) {
        return shareService.getSharedHistory(token);
    }

    /**
     * Validate a share token (for WebSocket connection).
     */
    @GetMapping("/{token}/validate")
    public void validate(@PathVariable String token) {
        // Just validates - throws if invalid
        shareService.validateToken(token);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
