package com.webinnovation.eyeon.ws;

import com.webinnovation.eyeon.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Authenticates STOMP CONNECT frames and authorizes per-org topic subscriptions.
 *
 * CONNECT: read JWT from "Authorization: Bearer ..." native header, set principal.
 * SUBSCRIBE / SEND to /topic/org/{orgId}/...: the {orgId} segment must match
 * the authenticated user's org (CLAUDE.md §9.3).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern ORG_TOPIC = Pattern.compile("^/topic/org/([^/]+)(?:/.*)?$");
    private static final Pattern USER_QUEUE = Pattern.compile("^/user/.*$");

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand cmd = accessor.getCommand();

        if (cmd == StompCommand.CONNECT) {
            authenticate(accessor);
        } else if (cmd == StompCommand.SUBSCRIBE || cmd == StompCommand.SEND) {
            authorizeDestination(accessor);
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authHeader = firstHeader(accessor, "Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new MessagingException("CONNECT requires Authorization: Bearer <jwt>");
        }
        String token = authHeader.substring(7);

        try {
            Claims claims = jwtService.parse(token);
            UUID userId = UUID.fromString(claims.getSubject());
            UUID orgId = UUID.fromString(claims.get("org", String.class));
            String role = claims.get("role", String.class);
            StompPrincipal principal = new StompPrincipal(userId, orgId, role);
            accessor.setUser(principal);
            log.debug("WS CONNECT user={} org={}", userId, orgId);
        } catch (JwtException | IllegalArgumentException e) {
            throw new MessagingException("Invalid JWT on CONNECT: " + e.getMessage());
        }
    }

    private void authorizeDestination(StompHeaderAccessor accessor) {
        String dest = accessor.getDestination();
        if (dest == null) return;

        Object user = accessor.getUser();
        if (!(user instanceof StompPrincipal principal)) {
            throw new MessagingException("Not authenticated");
        }

        // Organization-wide topics are closed: they carried every child's data to every member.
        // Live data is now delivered per user on /user/queue/... (see LiveAudience).
        if (ORG_TOPIC.matcher(dest).matches()) {
            throw new MessagingException("Organization-wide topics are not available; subscribe to /user/queue/... instead");
        }
        if (USER_QUEUE.matcher(dest).matches()) {
            return;  // Spring routes /user/** by Principal.getName(), no org check needed
        }
        throw new MessagingException("Subscription destination not allowed: " + dest);
    }

    private static String firstHeader(StompHeaderAccessor accessor, String name) {
        var nativeHeaders = accessor.toNativeHeaderMap();
        var values = nativeHeaders.get(name);
        return (values == null || values.isEmpty()) ? null : values.get(0);
    }
}
