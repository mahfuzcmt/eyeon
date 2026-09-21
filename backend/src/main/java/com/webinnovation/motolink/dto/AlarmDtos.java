package com.webinnovation.motolink.dto;

import com.webinnovation.motolink.domain.Alarm;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AlarmDtos {

    private AlarmDtos() {}

    public record AlarmView(
            UUID id,
            String deviceImei,
            String type,
            String severity,
            Instant ts,
            Double latitude,
            Double longitude,
            boolean acknowledged,
            UUID acknowledgedBy,
            Instant acknowledgedAt,
            String processResult,
            String processNotes,
            Map<String, Object> metadata
    ) {
        public static AlarmView of(Alarm a) {
            return new AlarmView(
                    a.id(), a.deviceImei(), a.type(), a.severity(), a.ts(),
                    a.latitude(), a.longitude(),
                    a.acknowledged(), a.acknowledgedBy(), a.acknowledgedAt(),
                    a.processResult(), a.processNotes(),
                    a.metadata()
            );
        }
    }

    /** Optional body for POST /alarms/{id}/acknowledge. */
    public record AcknowledgeRequest(String result, String notes) {}

    /** Alarm Overview row: one vehicle, counts per alarm type (ADL Statistics → Alarm Overview). */
    public record AlarmOverviewRow(
            String imei,
            String name,
            String vehiclePlate,
            Map<String, Integer> counts,
            int total
    ) {}

    public record AlarmOverview(List<String> types, List<AlarmOverviewRow> rows) {}
}
