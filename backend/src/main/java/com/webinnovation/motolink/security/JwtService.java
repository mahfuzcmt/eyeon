package com.webinnovation.motolink.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
@Slf4j
public class JwtService {

    private final String secret;
    private final Duration accessTtl;
    private final Duration refreshTtl;
    private SecretKey key;

    public JwtService(
            @Value("${motolink.jwt.secret}") String secret,
            @Value("${motolink.jwt.access-ttl-minutes}") long accessTtlMinutes,
            @Value("${motolink.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.secret = secret;
        this.accessTtl = Duration.ofMinutes(accessTtlMinutes);
        this.refreshTtl = Duration.ofDays(refreshTtlDays);
    }

    @PostConstruct
    void init() {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "motolink.jwt.secret must be at least 32 bytes; got " + bytes.length);
        }
        this.key = Keys.hmacShaKeyFor(bytes);
    }

    public String issueAccessToken(UUID userId, UUID orgId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("org", orgId.toString())
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key)
                .compact();
    }

    public Duration refreshTtl() {
        return refreshTtl;
    }

    public Claims parse(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (JwtException e) {
            log.debug("JWT verification failed: {}", e.getMessage());
            throw e;
        }
    }
}
