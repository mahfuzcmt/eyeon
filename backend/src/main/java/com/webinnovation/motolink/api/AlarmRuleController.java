package com.webinnovation.motolink.api;

import com.webinnovation.motolink.dto.AlarmRuleDtos.AlarmRuleRequest;
import com.webinnovation.motolink.dto.AlarmRuleDtos.AlarmRuleView;
import com.webinnovation.motolink.security.TenantContext;
import com.webinnovation.motolink.service.AlarmRuleService;
import com.webinnovation.motolink.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/alarm-rules")
@RequiredArgsConstructor
public class AlarmRuleController {

    private final AlarmRuleService service;
    private final AuditService audit;

    /** Rules are per user (V18): every endpoint is scoped to the caller. */
    private static UUID owner() {
        return TenantContext.requireUserId();
    }

    @GetMapping
    public List<AlarmRuleView> list() {
        return service.listForOwner(owner()).stream()
                .map(r -> AlarmRuleView.of(r,
                        r.appliesToAll() ? List.of() : service.listAssignedImeis(r.id())))
                .toList();
    }

    @GetMapping("/{id}")
    public AlarmRuleView get(@PathVariable UUID id) {
        var r = service.getOrThrow(owner(), id);
        return AlarmRuleView.of(r, r.appliesToAll() ? List.of() : service.listAssignedImeis(id));
    }

    @PostMapping
    public ResponseEntity<Map<String, UUID>> create(@RequestBody AlarmRuleRequest req) {
        UUID orgId = TenantContext.requireOrgId();
        UUID id = service.create(orgId, owner(), req);
        audit.record("ALARM_RULE_CREATE", "alarm_rule", id.toString(),
                Map.of("name", req.name(), "type", req.ruleType()));
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<AlarmRuleView> update(@PathVariable UUID id,
                                                @RequestBody AlarmRuleRequest req) {
        UUID owner = owner();
        service.update(owner, id, req);
        audit.record("ALARM_RULE_UPDATE", "alarm_rule", id.toString(), null);
        var r = service.getOrThrow(owner, id);
        return ResponseEntity.ok(AlarmRuleView.of(r,
                r.appliesToAll() ? List.of() : service.listAssignedImeis(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(owner(), id);
        audit.record("ALARM_RULE_DELETE", "alarm_rule", id.toString(), null);
        return ResponseEntity.noContent().build();
    }
}
