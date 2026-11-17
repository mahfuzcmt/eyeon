package com.webinnovation.eyeon.ws;

import com.webinnovation.eyeon.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

/**
 * Clients only listen. A SEND used to be authorized like a SUBSCRIBE, and the broker relays a
 * SEND to /user/{id}/queue/... into that user's private queue: one member could put a forged
 * location or alarm on another member's screen.
 */
class StompAuthChannelInterceptorTest {

    private final StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(mock(JwtService.class));
    private final MessageChannel channel = mock(MessageChannel.class);
    private final StompPrincipal me = new StompPrincipal(UUID.randomUUID(), UUID.randomUUID(), "ORG_USER");

    private Message<byte[]> frame(StompCommand command, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setUser(me);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void a_client_send_is_refused_whatever_the_destination() {
        UUID victim = UUID.randomUUID();
        for (String destination : new String[] {
                "/user/" + victim + "/queue/locations",
                "/user/queue/alarms",
                "/queue/locations-user" + victim,
                "/topic/org/" + UUID.randomUUID() + "/locations",
                "/app/anything"}) {
            assertThrows(MessagingException.class,
                    () -> interceptor.preSend(frame(StompCommand.SEND, destination), channel), destination);
        }
    }

    @Test
    void subscribing_is_unchanged() {
        Message<byte[]> own = frame(StompCommand.SUBSCRIBE, "/user/queue/locations");
        assertSame(own, interceptor.preSend(own, channel));

        assertThrows(MessagingException.class, () -> interceptor.preSend(
                frame(StompCommand.SUBSCRIBE, "/topic/org/" + UUID.randomUUID() + "/locations"), channel));
        assertThrows(MessagingException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/queue/locations"), channel));
    }
}
