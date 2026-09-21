package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.ScheduledCommandDtos.ScheduleRequest;
import com.webinnovation.motolink.dto.ScheduledCommandDtos.ScheduledCommandView;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AuditService;
import com.webinnovation.motolink.service.ScheduledCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/scheduled-commands")
@RequiredArgsConstructor
public class ScheduledCommandController {

    private final ScheduledCommandService service;
    private final AuditService audit;

    @GetMapping
    public List<ScheduledCommandView> list(
            @RequestParam(name = "limit", defaultValue = "100") int limit,
            @RequestParam(name = "offset", defaultValue = "0") int offset) {
        UUID orgId = TenantContext.requireOrgId();
        return service.list(orgId, limit, offset).stream().map(ScheduledCommandView::of).toList();
    }

    @PostMapping
    public ResponseEntity<Map<String, UUID>> create(@RequestBody ScheduleRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        UUID userId = TenantContext.currentUserId();
        UUID id = service.schedule(orgId, userId, req);
        audit.record("SCHEDULED_COMMAND_CREATE", "scheduled_command", id.toString(),
                Map.of("imei", req.deviceImei(), "type", req.commandType(), "kind", req.scheduleKind()));
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        UUID orgId = TenantContext.requireOrgId();
        if (!service.cancel(orgId, id)) {
            throw new NotFoundException("Scheduled command not found or not pending: " + id);
        }
        audit.record("SCHEDULED_COMMAND_CANCEL", "scheduled_command", id.toString(), null);
        return ResponseEntity.noContent().build();
    }
}
