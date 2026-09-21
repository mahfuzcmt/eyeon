package com.webinnovation.motolink.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    public static final String LOCATION_EVENTS_CHANNEL = "location-events";
    public static final String BATCH_LOCATION_EVENTS_CHANNEL = "batch-location-events";
    public static final String ALARM_EVENTS_CHANNEL = "alarm-events";

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory cf) {
        StringRedisTemplate template = new StringRedisTemplate(cf);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        return template;
    }

    @Bean
    public ObjectMapper redisObjectMapper(ObjectMapper base) {
        return base.copy();
    }
}
