package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.ShareLocationLink;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

public final class ShareLocationDtos {

    private ShareLocationDtos() {}

    /**
     * Request to create a new share link.
     */
    public record CreateShareLinkRequest(
            @NotBlank String deviceImei,
            String label,
            @Min(1) @Max(168) int expiresInHours,  // 1 hour to 7 days
            boolean showHistory,
            boolean allowRealtime
    ) {
        public CreateShareLinkRequest {
            if (expiresInHours <= 0) expiresInHours = 24; // Default 24 hours
        }
    }

    /**
     * Response after creating a share link.
     */
    public record ShareLinkView(
            UUID id,
            String deviceImei,
            String token,
            String shareUrl,
            String label,
            Instant expiresAt,
            boolean isActive,
            boolean showHistory,
            boolean allowRealtime,
            Instant createdAt,
            Instant lastAccessedAt,
            int accessCount
    ) {
        public static ShareLinkView of(ShareLocationLink link, String baseUrl) {
            String shareUrl = baseUrl + "/share/" + link.token();
            return new ShareLinkView(
                    link.id(),
                    link.deviceImei(),
                    link.token(),
                    shareUrl,
                    link.label(),
                    link.expiresAt(),
                    link.isActive(),
                    link.showHistory(),
                    link.allowRealtime(),
                    link.createdAt(),
                    link.lastAccessedAt(),
                    link.accessCount()
            );
        }
    }

    /**
     * Public view of shared location (no auth required).
     * Minimal info to protect privacy.
     */
    public record SharedLocationView(
            String vehicleName,
            String vehiclePlate,
            String vehicleType,
            double latitude,
            double longitude,
            int speed,
            int course,
            Instant lastUpdate,
            boolean isOnline,
            boolean showHistory,
            boolean allowRealtime
    ) {}

    /**
     * Historical point for shared route view.
     */
    public record SharedHistoryPoint(
            Instant ts,
            double latitude,
            double longitude,
            int speed
    ) {}
}
