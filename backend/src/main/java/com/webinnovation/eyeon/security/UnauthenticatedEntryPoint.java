package com.webinnovation.eyeon.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * A request without a usable access token (none, expired, malformed) is answered 401, which is
 * what tells the apps to exchange their refresh token and try again.
 *
 * <p>Until 2026-11-17 no entry point was configured and Spring Security answered 403. The apps
 * renew only on 401, so once the hourly token had run out every screen showed "Request failed
 * with status code 403" until something else happened to renew it (the app's live socket
 * reconnecting, about 30 s after coming to the foreground). 403 now only means "signed in, but
 * not allowed".
 */
@Component
public class UnauthenticatedEntryPoint implements AuthenticationEntryPoint {

    static final String BODY =
            "{\"error\":{\"code\":\"UNAUTHENTICATED\",\"message\":\"Sign in again or renew the access token\"}}";

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(BODY);
    }
}
