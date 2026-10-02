package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.repository.TrackerSettingsRepository;
import com.webinnovation.eyeon.repository.TrackerSettingsRepository.Row;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Writing a setting means: send it, ask again, and believe only the second answer. */
class TrackerSettingsServiceTest {

    private static final String IMEI = "868322070079370";
    private final UUID orgId = UUID.randomUUID();

    private TrackerSettingsRepository repo;
    private DeviceCommandService commands;
    private TrackerSettingsService service;

    @BeforeEach
    void setUp() {
        repo = mock(TrackerSettingsRepository.class);
        commands = mock(DeviceCommandService.class);
        when(commands.isOnline(IMEI)).thenReturn(true);
        when(repo.listForDevice(orgId, IMEI)).thenReturn(List.of());
        service = new TrackerSettingsService(repo, commands);
    }

    private void answers(String command, String reply) {
        when(commands.sendRaw(orgId, IMEI, command)).thenReturn(CompletableFuture.completedFuture(reply));
    }

    @Test
    void sos_numbers_are_cleared_added_and_then_read_back() {
        answers("SOS,D,1,2,3,4#", "delete successfully.SOS Number:1:; 2:; 3:; 4:");
        answers("SOS,A,01712345678#", "setting OK.SOS Number:1:01712345678; 2:; 3:; 4:");
        answers("SOS#", "SOS Number:1:01712345678; 2:; 3:; 4:");
        Map<String, Object> wanted = TrackerSetting.map("numbers", List.of("01712345678"));

        service.push(orgId, IMEI, TrackerSetting.SOS_NUMBERS, wanted);

        InOrder order = inOrder(commands);
        order.verify(commands).sendRaw(orgId, IMEI, "SOS,D,1,2,3,4#");
        order.verify(commands).sendRaw(orgId, IMEI, "SOS,A,01712345678#");
        order.verify(commands).sendRaw(orgId, IMEI, "SOS#");
        verify(repo).saveApplied(orgId, IMEI, "SOS_NUMBERS", wanted, "SYNCED", "SOS Number:1:01712345678; 2:; 3:; 4:");
    }

    @Test
    void a_tracker_that_reports_something_else_afterwards_has_not_taken_the_setting() {
        answers("FLY,ON,23:00-06:00,2#", "setting OK.");
        answers("FLY#", "FLY:ON,00:00-07:00,2");
        Map<String, Object> wanted = TrackerSetting.map("enabled", true, "from", "23:00", "to", "06:00", "mode", 2);

        service.push(orgId, IMEI, TrackerSetting.NIGHT_REST, wanted);

        verify(repo).saveApplied(eq(orgId), eq(IMEI), eq("NIGHT_REST"),
                eq(TrackerSetting.map("enabled", true, "from", "00:00", "to", "07:00", "mode", 2)),
                eq("FAILED"), contains("FLY:ON,00:00-07:00,2"));
    }

    @Test
    void no_answer_leaves_the_change_waiting() {
        when(commands.sendRaw(eq(orgId), eq(IMEI), anyString()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("Device offline")));

        service.push(orgId, IMEI, TrackerSetting.POWER_OFF_LOCK, TrackerSetting.map("enabled", true));

        verify(repo, never()).saveApplied(any(), anyString(), anyString(), any(), anyString(), any());
        verify(repo, never()).saveUnsupported(any(), anyString(), anyString(), any());
    }

    @Test
    void saving_for_a_tracker_that_is_not_connected_stores_it_as_pending_and_sends_nothing() {
        when(commands.isOnline(IMEI)).thenReturn(false);
        Map<String, Object> wanted = TrackerSetting.map("enabled", true);
        when(repo.listForDevice(orgId, IMEI)).thenReturn(List.of())
                .thenReturn(List.of(new Row(IMEI, "POWER_OFF_LOCK", orgId, wanted, null, "PENDING", null, null)));

        TrackerSettingsService.Item item = service.save(orgId, IMEI, "power_off_lock", Map.of("enabled", true));

        verify(repo).saveWanted(orgId, IMEI, "POWER_OFF_LOCK", wanted);
        verify(commands, never()).sendRaw(any(), anyString(), anyString());
        assertEquals("PENDING", item.status());
    }

    @Test
    void reading_stores_what_the_tracker_says_and_skips_a_change_that_is_waiting() {
        when(commands.sendRaw(eq(orgId), eq(IMEI), anyString()))
                .thenReturn(CompletableFuture.completedFuture("Invalid command"));
        answers("FLY#", "FLY:ON,00:00-07:00,2");
        when(repo.listForDevice(orgId, IMEI)).thenReturn(List.of(
                new Row(IMEI, "HEARTBEAT", orgId, TrackerSetting.map("minutes", 5), null, "PENDING", null, null)));

        service.readAll(orgId, IMEI);

        verify(repo).saveApplied(orgId, IMEI, "NIGHT_REST",
                TrackerSetting.map("enabled", true, "from", "00:00", "to", "07:00", "mode", 2), "SYNCED", "FLY:ON,00:00-07:00,2");
        verify(repo).saveUnsupported(orgId, IMEI, "SOS_NUMBERS", "Invalid command");
        verify(commands, never()).sendRaw(orgId, IMEI, "HBT#");
    }

    @Test
    void the_panel_lists_every_setting_even_before_anything_was_read() {
        TrackerSettingsService.Panel panel = service.panel(orgId, IMEI);

        assertEquals(TrackerSetting.values().length, panel.settings().size());
        assertEquals("UNKNOWN", panel.settings().get(0).status());
        assertFalse(panel.reading());
    }
}
