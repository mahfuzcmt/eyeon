package com.webinnovation.eyeon.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import static org.assertj.core.api.Assertions.assertThat;

class UnauthenticatedEntryPointTest {

    @Test
    void aRequestWithoutAUsableTokenIsAnswered401SoTheAppsRenewIt() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        new UnauthenticatedEntryPoint().commence(new MockHttpServletRequest("GET", "/geofences"), response,
                new InsufficientAuthenticationException("Full authentication is required"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getContentAsString()).contains("\"code\":\"UNAUTHENTICATED\"");
    }
}
