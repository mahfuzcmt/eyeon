package com.webinnovation.motolink.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;

    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("ts", Instant.now().toString());
        body.put("db", probe(this::pingDb));
        body.put("redis", probe(this::pingRedis));
        return body;
    }

    private String probe(Runnable r) {
        try {
            r.run();
            return "UP";
        } catch (Exception e) {
            log.warn("Health probe failed: {}", e.getMessage());
            return "DOWN";
        }
    }

    private void pingDb() {
        jdbc.queryForObject("SELECT 1", Integer.class);
    }

    private void pingRedis() {
        redis.getConnectionFactory().getConnection().ping();
    }
}
