package com.webinnovation.motolink.domain;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/** Per-user alarm notification preferences. Sets hold {@link com.webinnovation.motolink.domain.enums.AlarmType} names. */
public record NotificationSettings(
        UUID userId,
        UUID orgId,
        Set<String> popupTypes,
        Set<String> soundTypes,
        Set<String> pushTypes,
        Instant updatedAt
) {}
