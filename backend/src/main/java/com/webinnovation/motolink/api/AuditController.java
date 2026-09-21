package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.AuditDtos.AuditLogView;
import com.webinnovation.motolink.exception.ForbiddenException;
import com.webinnovation.motolink.repository.AuditLogRepository;
import com.webinnovation.motolink.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/audit-log")
@RequiredArgsConstructor
public class AuditController {

    private static final String ROLE_ADMIN = "ORG_ADMIN";
    private static final String ROLE_SUPER = "SUPER_ADMIN";

    private final AuditLogRepository repo;

    @GetMapping
    public List<AuditLogView> list(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String resourceType,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        String role = TenantContext.currentRole();
        if (role == null || (!ROLE_ADMIN.equals(role) && !ROLE_SUPER.equals(role))) {
            throw new ForbiddenException("Admin role required");
        }
        UUID orgId = TenantContext.requireOrgId();

        return repo.findByOrg(orgId, parseInstant(from), parseInstant(to),
                        action, userId, resourceType, limit, offset)
                .stream().map(AuditLogView::of).toList();
    }

    private static Instant parseInstant(String s) {
        if (s == null || s.isBlank()) return null;
        return Instant.parse(s);
    }
}
