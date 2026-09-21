package com.webinnovation.motolink.ws;

import lombok.Getter;

import java.security.Principal;
import java.util.UUID;

/**
 * Auth principal attached to a STOMP session after a successful CONNECT.
 * Carries the user's org so SUBSCRIBE handlers can authorize topics.
 */
@Getter
public class StompPrincipal implements Principal {

    private final UUID userId;
    private final UUID orgId;
    private final String role;

    public StompPrincipal(UUID userId, UUID orgId, String role) {
        this.userId = userId;
        this.orgId = orgId;
        this.role = role;
    }

    @Override
    public String getName() {
        return userId.toString();
    }
}
