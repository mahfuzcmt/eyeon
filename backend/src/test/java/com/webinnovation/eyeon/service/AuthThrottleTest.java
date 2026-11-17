package com.webinnovation.eyeon.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Five failed sign-ins per email and twenty per address in fifteen minutes; open when Redis is down. */
class AuthThrottleTest {

    @SuppressWarnings("unchecked")
    private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final AuthThrottle throttle = new AuthThrottle(redis);

    AuthThrottleTest() {
        when(redis.opsForValue()).thenReturn(values);
    }

    @Test
    void an_email_is_blocked_at_five_failures_whatever_its_case() {
        when(values.get("auth:fail:email:parent@x.test")).thenReturn("4");
        assertFalse(throttle.loginBlocked("Parent@X.test ", "203.0.113.7"));

        when(values.get("auth:fail:email:parent@x.test")).thenReturn("5");
        assertTrue(throttle.loginBlocked("Parent@X.test ", "203.0.113.7"));
    }

    @Test
    void an_address_is_blocked_at_twenty_failures_across_emails() {
        when(values.get("auth:fail:ip:203.0.113.7")).thenReturn("19");
        assertFalse(throttle.loginBlocked("a@x.test", "203.0.113.7"));

        when(values.get("auth:fail:ip:203.0.113.7")).thenReturn("20");
        assertTrue(throttle.loginBlocked("b@x.test", "203.0.113.7"));
    }

    @Test
    void the_window_starts_with_the_first_failure() {
        when(values.increment("auth:fail:email:a@x.test")).thenReturn(1L);
        when(values.increment("auth:fail:ip:203.0.113.7")).thenReturn(7L);

        throttle.loginFailed("a@x.test", "203.0.113.7");
        verify(redis).expire("auth:fail:email:a@x.test", AuthThrottle.LOGIN_WINDOW);
        verify(redis, org.mockito.Mockito.never()).expire("auth:fail:ip:203.0.113.7", AuthThrottle.LOGIN_WINDOW);
    }

    @Test
    void the_sixth_reset_sms_to_a_phone_in_a_day_is_refused() {
        when(values.increment("auth:reset-sms:8801712345678")).thenReturn(5L, 6L);
        assertTrue(throttle.allowResetSms("+880 1712-345678"));
        assertFalse(throttle.allowResetSms("+880 1712-345678"));
    }

    @Test
    void everything_is_allowed_when_redis_is_unreachable() {
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("down"));
        when(redis.hasKey(anyString())).thenThrow(new RedisConnectionFailureException("down"));

        assertFalse(throttle.loginBlocked("a@x.test", "203.0.113.7"));
        throttle.loginFailed("a@x.test", "203.0.113.7");
        assertFalse(throttle.resetLocked(UUID.randomUUID()));
        throttle.lockReset(UUID.randomUUID());
        assertTrue(throttle.allowResetSms("+8801712345678"));
    }
}
