package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.AlarmRule;
import com.webinnovation.eyeon.dto.AlarmRuleDtos.AlarmRuleRequest;
import com.webinnovation.eyeon.exception.DomainException;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.repository.AlarmRuleRepository;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.LocationRepository;
import com.webinnovation.eyeon.repository.TrackerSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A rule may only name children its author can see. Until 2026-11-17 the IMEIs were stored as
 * sent, so a parent could have a rule report on another family's child.
 */
class AlarmRuleAccessTest {

    private static final String MINE = "864290061234567";
    private static final String NOT_MINE = "864290069999999";

    private final UUID orgId = UUID.randomUUID();
    private final UUID owner = UUID.randomUUID();
    private final UUID ruleId = UUID.randomUUID();
    private AlarmRuleRepository repo;
    private AlarmRuleService service;

    @BeforeEach
    void setUp() {
        repo = mock(AlarmRuleRepository.class);
        DeviceAccessService access = mock(DeviceAccessService.class);
        doThrow(new NotFoundException("device", NOT_MINE)).when(access).requireVisible(NOT_MINE);
        service = new AlarmRuleService(repo, mock(AlarmService.class), mock(DeviceRepository.class),
                mock(LocationRepository.class), access, mock(TrackerSettingsRepository.class));
        when(repo.insert(any(), any(), any(), any(), any(), any(), any(), anyInt(), any(), anyBoolean(), anyBoolean()))
                .thenReturn(ruleId);
        when(repo.findByOwnerAndId(owner, ruleId)).thenReturn(Optional.of(new AlarmRule(ruleId, orgId, owner, "Speed",
                "SPEED_OVER", 60.0, null, null, 300, "WARNING", true, false, Instant.now(), Instant.now())));
        when(repo.update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(true);
    }

    private static AlarmRuleRequest speed(Double threshold, Integer cooldown, List<String> imeis) {
        return new AlarmRuleRequest("Speed", "SPEED_OVER", threshold, null, null, cooldown, null, null, false, imeis);
    }

    @Test
    void creating_a_rule_for_a_child_the_caller_cannot_see_is_refused_and_nothing_is_stored() {
        assertThrows(NotFoundException.class, () -> service.create(orgId, owner, speed(60.0, null, List.of(MINE, NOT_MINE))));
        verify(repo, never()).insert(any(), any(), any(), any(), any(), any(), any(), anyInt(), any(), anyBoolean(),
                anyBoolean());
        verify(repo, never()).assignDevice(any(), anyString());
    }

    @Test
    void updating_a_rule_cannot_add_such_a_child_either() {
        AlarmRuleRequest patch = new AlarmRuleRequest(null, null, null, null, null, null, null, null, null,
                List.of(NOT_MINE));

        assertThrows(NotFoundException.class, () -> service.update(owner, ruleId, patch));
        verify(repo, never()).unassignAllDevices(any());
        verify(repo, never()).assignDevice(any(), anyString());
    }

    @Test
    void visible_children_are_assigned() {
        service.create(orgId, owner, speed(60.0, null, List.of(MINE)));
        verify(repo).assignDevice(ruleId, MINE);
    }

    @Test
    void a_negative_cooldown_is_refused_and_a_tiny_one_is_raised_to_the_minimum() {
        assertThrows(DomainException.class, () -> service.create(orgId, owner, speed(60.0, -1, List.of(MINE))));

        service.create(orgId, owner, speed(60.0, 0, List.of(MINE)));
        verify(repo).insert(any(), any(), any(), any(), any(), any(), any(),
                eq(AlarmRuleService.MIN_COOLDOWN_SECONDS), any(), anyBoolean(), anyBoolean());
    }

    @Test
    void an_update_cannot_set_a_threshold_the_rule_type_does_not_allow() {
        AlarmRuleRequest zero = new AlarmRuleRequest(null, null, 0.0, null, null, null, null, null, null, null);
        AlarmRuleRequest negativeCooldown = new AlarmRuleRequest(null, null, null, null, null, -5, null, null, null, null);

        assertThrows(DomainException.class, () -> service.update(owner, ruleId, zero));
        assertThrows(DomainException.class, () -> service.update(owner, ruleId, negativeCooldown));
        verify(repo, never()).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
