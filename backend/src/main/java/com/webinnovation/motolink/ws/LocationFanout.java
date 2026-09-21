package com.webinnovation.motolink.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.webinnovation.motolink.config.RedisConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Bridges Redis pub/sub to Spring's STOMP broker (CLAUDE.md §9, §11).
 *
 * Producer side:  LocationService publishes JSON on Redis "location-events".
 * Consumer side:  This listener routes each message to /topic/org/{orgId}/locations
 *                 so only subscribers in that tenant receive it.
 *
 * The subscription auth in StompAuthChannelInterceptor enforces that browser
 * clients can only subscribe to their own org's topic, so fan-in by orgId is
 * the entire isolation boundary.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LocationFanout implements MessageListener {

    private final SimpMessagingTemplate broker;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            JsonNode node = objectMapper.readTree(body);
            String orgId = node.path("orgId").asText(null);
            if (orgId == null || orgId.isBlank()) {
                log.warn("location-event missing orgId; dropping");
                return;
            }
            JsonNode payload = stripInternalFields(node);
            String topic = "/topic/org/" + orgId + "/locations";
            broker.convertAndSend(topic, payload);
        } catch (Exception e) {
            log.warn("Failed to fan out location event: {}", e.getMessage());
        }
    }

    /** Drop server-internal fields before sending to clients. */
    private JsonNode stripInternalFields(JsonNode node) {
        if (node instanceof ObjectNode obj) {
            ObjectNode copy = obj.deepCopy();
            copy.remove("orgId");
            return copy;
        }
        return node;
    }

    @Configuration
    @RequiredArgsConstructor
    static class FanoutContainer {
        private final RedisConnectionFactory connectionFactory;
        private final LocationFanout listener;

        @Bean
        RedisMessageListenerContainer locationFanoutContainer() {
            RedisMessageListenerContainer c = new RedisMessageListenerContainer();
            c.setConnectionFactory(connectionFactory);
            c.addMessageListener(listener, new PatternTopic(RedisConfig.LOCATION_EVENTS_CHANNEL));
            return c;
        }
    }
}
