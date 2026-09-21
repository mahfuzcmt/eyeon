package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.util.PasswordResetSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Transactional SMS via SSL Wireless (CLAUDE.md §12.2). When no API token is
 * configured (local dev, CI) messages are logged instead of sent so flows
 * that depend on SMS — password reset codes, critical alarm texts — still work
 * end to end without a provider account.
 */
@Service
@Slf4j
public class SmsService {

    private final RestClient restClient;
    private final String apiToken;
    private final String senderId;

    public SmsService(RestClient.Builder builder,
                      @Value("${eyeon.sms.url:https://smsplus.sslwireless.com/api/v3/send-sms}") String url,
                      @Value("${eyeon.sms.api-token:}") String apiToken,
                      @Value("${eyeon.sms.sender-id:EYEON}") String senderId) {
        this.restClient = builder.clone().baseUrl(url)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "application/json")
                .build();
        this.apiToken = apiToken == null ? "" : apiToken.trim();
        this.senderId = senderId;
    }

    /** True when a provider is configured, i.e. sendRaw() really delivers. */
    public boolean isConfigured() {
        return !apiToken.isBlank();
    }

    /** Returns true if the message was handed to the provider (or logged in stub mode). */
    public boolean sendRaw(String recipientMsisdn, String message) {
        String msisdn = PasswordResetSupport.normalizeBdMsisdn(recipientMsisdn);
        if (msisdn == null) return false;
        if (!isConfigured()) {
            log.info("[SMS-STUB] to={} msg={}", msisdn, message);
            return true;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("api_token", apiToken);
        body.put("sid", senderId);
        body.put("msisdn", msisdn);
        body.put("sms", message);
        body.put("csms_id", UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        try {
            String resp = restClient.post().body(body).retrieve().body(String.class);
            log.info("SMS sent to …{} ({} chars): {}", msisdn.substring(Math.max(0, msisdn.length() - 4)),
                    message.length(), resp == null ? "" : resp.substring(0, Math.min(120, resp.length())));
            return true;
        } catch (Exception e) {
            log.warn("SMS send failed to …{}: {}", msisdn.substring(Math.max(0, msisdn.length() - 4)), e.getMessage());
            return false;
        }
    }
}
