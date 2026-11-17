package com.webinnovation.eyeon.security;

import com.webinnovation.eyeon.exception.ForbiddenException;

import java.util.UUID;

/**
 * ThreadLocal carrier for the current request's authenticated org_id.
 * Set by JwtFilter, cleared in finally block. Multi-tenant filter layer
 * (CLAUDE.md §11.1).
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> ORG_ID = new ThreadLocal<>();
    private static final ThreadLocal<UUID> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID orgId, UUID userId, String role) {
        ORG_ID.set(orgId);
        USER_ID.set(userId);
        ROLE.set(role);
    }

    public static UUID currentOrgId() {
        return ORG_ID.get();
    }

    public static UUID currentUserId() {
        return USER_ID.get();
    }

    public static String currentRole() {
        return ROLE.get();
    }

    public static UUID requireOrgId() {
        UUID id = ORG_ID.get();
        if (id == null) {
            throw new IllegalStateException("No tenant in context — request not authenticated");
        }
        return id;
    }

    /** The authenticated user; per-user resources (groups, rules) refuse anonymous callers. */
    public static UUID requireUserId() {
        UUID id = currentUserId();
        if (id == null) {
            throw new IllegalStateException("No user in context — request not authenticated");
        }
        return id;
    }

    /**
     * Organization administrators only (ORG_ADMIN or SUPER_ADMIN). A parent (ORG_USER) gets 403,
     * also one flagged "see all devices": that flag widens what they can read, not what they manage.
     */
    public static void requireAdmin() {
        String role = currentRole();
        if (!"ORG_ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new ForbiddenException("Admin role required");
        }
    }

    public static void clear() {
        ORG_ID.remove();
        USER_ID.remove();
        ROLE.remove();
    }
}
