package com.webinnovation.eyeon.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

/**
 * Counters in Redis that slow down password and reset-code guessing.
 *
 * <p>Every method fails open: when Redis cannot be reached the sign-in or reset goes ahead and a
 * warning is logged, as {@link AlarmSmsService} does for its cooldown. Locking every parent out of
 * the app because the cache is down would be the worse failure.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthThrottle {

    static final int MAX_FAILURES_PER_EMAIL = 5;
    static final int MAX_FAILURES_PER_IP = 20;
    static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    static final Duration RESET_LOCK = Duration.ofMinutes(15);
    static final int MAX_RESET_SMS_PER_DAY = 5;
    static final Duration RESET_SMS_WINDOW = Duration.ofDays(1);

    private final StringRedisTemplate redis;

    /** @return true when this email or this address has used up its failed sign-ins for the window */
    public boolean loginBlocked(String email, String ip) {
        try {
            return count(emailKey(email)) >= MAX_FAILURES_PER_EMAIL
                    || (ip != null && count(ipKey(ip)) >= MAX_FAILURES_PER_IP);
        } catch (Exception e) {
            log.warn("Login attempt check failed ({}), allowing the sign-in", e.getMessage());
            return false;
        }
    }

    public void loginFailed(String email, String ip) {
        try {
            bump(emailKey(email), LOGIN_WINDOW);
            if (ip != null) bump(ipKey(ip), LOGIN_WINDOW);
        } catch (Exception e) {
            log.warn("Could not count a failed sign-in ({})", e.getMessage());
        }
    }

    /** A correct password clears the email's count; the address keeps its own. */
    public void loginSucceeded(String email) {
        try {
            redis.delete(emailKey(email));
        } catch (Exception e) {
            log.warn("Could not clear the failed sign-in count ({})", e.getMessage());
        }
    }

    /** Called when a reset code has used up its wrong attempts: no new code and no attempt for a while. */
    public void lockReset(UUID userId) {
        try {
            redis.opsForValue().set(resetLockKey(userId), "1", RESET_LOCK);
        } catch (Exception e) {
            log.warn("Could not lock password reset for user {} ({})", userId, e.getMessage());
        }
    }

    public boolean resetLocked(UUID userId) {
        try {
            return Boolean.TRUE.equals(redis.hasKey(resetLockKey(userId)));
        } catch (Exception e) {
            log.warn("Password reset lock check failed ({}), allowing the attempt", e.getMessage());
            return false;
        }
    }

    /** Counts one reset SMS for this number. @return false when today's allowance is used up */
    public boolean allowResetSms(String phone) {
        try {
            return bump("auth:reset-sms:" + phone.replaceAll("[^0-9]", ""), RESET_SMS_WINDOW) <= MAX_RESET_SMS_PER_DAY;
        } catch (Exception e) {
            log.warn("Reset SMS cap check failed ({}), sending anyway", e.getMessage());
            return true;
        }
    }

    private long count(String key) {
        String v = redis.opsForValue().get(key);
        if (v == null) return 0;
        try {
            return Long.parseLong(v);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** Adds one; the window starts with the first count and is not extended by later ones. */
    private long bump(String key, Duration window) {
        Long n = redis.opsForValue().increment(key);
        if (n != null && n == 1L) redis.expire(key, window);
        return n == null ? 0 : n;
    }

    private static String emailKey(String email) {
        return "auth:fail:email:" + (email == null ? "" : email.trim().toLowerCase(Locale.ROOT));
    }

    private static String ipKey(String ip) {
        return "auth:fail:ip:" + ip;
    }

    private static String resetLockKey(UUID userId) {
        return "auth:reset-lock:" + userId;
    }
}
