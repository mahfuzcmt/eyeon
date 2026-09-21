package com.webinnovation.eyeon.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.webinnovation.eyeon.config.RedisConfig;
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
 * Bridges Redis batch location pub/sub to Spring's STOMP broker.
 *
 * <p>Producer side: LocationBufferService publishes batch JSON on Redis "batch-location-events"
 * every 3 seconds.
 *
 * <p>Consumer side: this listener sends each user the part of the batch they may see, on
 * /user/queue/locations/batch (see {@link LiveAudience}).
 * so only subscribers in that tenant receive it.
 *
 * <p>The batch message format from Redis:
 * <pre>
 * {
 *   "orgId": "uuid",
 *   "locations": [
 *     { "imei": "...", "ts": "...", "latitude": ..., ... },
 *     ...
 *   ]
 * }
 * </pre>
 *
 * <p>The message sent to WebSocket clients strips the orgId field and sends just the locations array.
 *
 * @see com.webinnovation.eyeon.service.LocationBufferService
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BatchLocationFanout implements MessageListener {

    private final SimpMessagingTemplate broker;
    private final ObjectMapper objectMapper;
    private final LiveAudience audience;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            JsonNode node = objectMapper.readTree(body);
            String orgId = node.path("orgId").asText(null);
            if (orgId == null || orgId.isBlank()) {
                log.warn("batch-location-event missing orgId; dropping");
                return;
            }

            JsonNode locationsNode = node.path("locations");
            if (!locationsNode.isArray() || locationsNode.isEmpty()) {
                log.debug("batch-location-event has empty locations array for orgId={}", orgId);
                return;
            }

            // Strip orgId from each location before sending to clients
            ArrayNode payload = objectMapper.createArrayNode();
            for (JsonNode loc : locationsNode) {
                if (loc instanceof ObjectNode locObj) {
                    ObjectNode copy = locObj.deepCopy();
                    copy.remove("orgId");
                    payload.add(copy);
                } else {
                    payload.add(loc);
                }
            }

            // Each user gets only the children they may see, on their own queue.
            int users = 0;
            for (LiveAudience.Viewer v : audience.forOrg(java.util.UUID.fromString(orgId))) {
                ArrayNode mine = objectMapper.createArrayNode();
                for (JsonNode loc : payload) {
                    if (v.canSee(loc.path("imei").asText(null))) mine.add(loc);
                }
                if (mine.isEmpty()) continue;
                broker.convertAndSendToUser(v.userName(), "/queue/locations/batch", mine);
                users++;
            }
            log.debug("Fanned out batch of {} locations for org {} to {} users", payload.size(), orgId, users);
        } catch (Exception e) {
            log.warn("Failed to fan out batch location event: {}", e.getMessage());
        }
    }

    @Configuration
    @RequiredArgsConstructor
    static class BatchFanoutContainer {
        private final RedisConnectionFactory connectionFactory;
        private final BatchLocationFanout listener;

        @Bean
        RedisMessageListenerContainer batchLocationFanoutContainer() {
            RedisMessageListenerContainer c = new RedisMessageListenerContainer();
            c.setConnectionFactory(connectionFactory);
            c.addMessageListener(listener, new PatternTopic(RedisConfig.BATCH_LOCATION_EVENTS_CHANNEL));
            return c;
        }
    }
}
