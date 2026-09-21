package com.webinnovation.motolink.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.motolink.repository.AuditLogRepository;
import com.webinnovation.motolink.security.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;

/**
 * Records audit events. Captures actor (org/user from TenantContext) and
 * request fingerprint (IP, User-Agent) when invoked from a request thread.
 * Out-of-request callers (e.g. background jobs) pass null for actor fields.
 *
 * Failures are swallowed and logged — audit must never break the operation
 * being audited.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository repo;
    private final ObjectMapper json;

    public void record(String action, String resourceType, String resourceId, Map<String, ?> metadata) {
        try {
            UUID orgId = TenantContext.currentOrgId();
            UUID userId = TenantContext.currentUserId();
            HttpServletRequest req = currentRequest();
            String ip = req == null ? null : clientIp(req);
            String ua = req == null ? null : req.getHeader("User-Agent");
            String md = metadata == null || metadata.isEmpty() ? null : json.writeValueAsString(metadata);
            repo.insert(orgId, userId, action, resourceType, resourceId, md, ip, ua);
        } catch (JsonProcessingException e) {
            log.warn("audit metadata serialization failed action={}", action, e);
        } catch (Exception e) {
            log.warn("audit insert failed action={} resourceType={} resourceId={}",
                    action, resourceType, resourceId, e);
        }
    }

    public void recordFor(UUID orgId, UUID userId, String action, String resourceType,
                          String resourceId, Map<String, ?> metadata) {
        try {
            HttpServletRequest req = currentRequest();
            String ip = req == null ? null : clientIp(req);
            String ua = req == null ? null : req.getHeader("User-Agent");
            String md = metadata == null || metadata.isEmpty() ? null : json.writeValueAsString(metadata);
            repo.insert(orgId, userId, action, resourceType, resourceId, md, ip, ua);
        } catch (Exception e) {
            log.warn("audit insert failed action={}", action, e);
        }
    }

    private static HttpServletRequest currentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            return sra.getRequest();
        }
        return null;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String real = req.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) return real.trim();
        return req.getRemoteAddr();
    }
}
