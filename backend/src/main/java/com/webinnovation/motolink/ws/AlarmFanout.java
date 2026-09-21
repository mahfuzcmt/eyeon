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
 * Mirrors {@link LocationFanout} for alarm events. Reads from the Redis
 * {@code alarm-events} channel and forwards to {@code /topic/org/{orgId}/alarms}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlarmFanout implements MessageListener {

    private final SimpMessagingTemplate broker;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            JsonNode node = objectMapper.readTree(body);
            String orgId = node.path("orgId").asText(null);
            if (orgId == null || orgId.isBlank()) {
                log.warn("alarm-event missing orgId; dropping");
                return;
            }
            JsonNode payload = stripInternalFields(node);
            broker.convertAndSend("/topic/org/" + orgId + "/alarms", payload);
        } catch (Exception e) {
            log.warn("Failed to fan out alarm event: {}", e.getMessage());
        }
    }

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
        private final AlarmFanout listener;

        @Bean
        RedisMessageListenerContainer alarmFanoutContainer() {
            RedisMessageListenerContainer c = new RedisMessageListenerContainer();
            c.setConnectionFactory(connectionFactory);
            c.addMessageListener(listener, new PatternTopic(RedisConfig.ALARM_EVENTS_CHANNEL));
            return c;
        }
    }
}
