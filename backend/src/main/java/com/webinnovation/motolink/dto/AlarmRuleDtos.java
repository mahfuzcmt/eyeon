package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.AlarmRule;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public final class AlarmRuleDtos {

    private AlarmRuleDtos() {}

    public record AlarmRuleView(
            UUID id,
            String name,
            String ruleType,
            Double threshold,
            LocalTime windowStart,
            LocalTime windowEnd,
            int cooldownSeconds,
            String severity,
            boolean active,
            boolean appliesToAll,
            List<String> assignedImeis,
            Instant createdAt
    ) {
        public static AlarmRuleView of(AlarmRule r, List<String> imeis) {
            return new AlarmRuleView(
                    r.id(), r.name(), r.ruleType(), r.threshold(),
                    r.windowStart(), r.windowEnd(), r.cooldownSeconds(),
                    r.severity(), r.active(), r.appliesToAll(),
                    imeis, r.createdAt()
            );
        }
    }

    public record AlarmRuleRequest(
            String name,
            String ruleType,
            Double threshold,
            LocalTime windowStart,
            LocalTime windowEnd,
            Integer cooldownSeconds,
            String severity,
            Boolean active,
            Boolean appliesToAll,
            List<String> assignedImeis
    ) {}
}
