package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.netty.WatchCommands;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.WatchSosRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WatchSosServiceTest {

    private static final UUID ORG = UUID.randomUUID();
    private static final String IMEI = "1378748302";

    private DeviceRepository devices;
    private WatchSosRepository repo;
    private WatchCommands commands;
    private WatchSosService service;

    @BeforeEach
    void setUp() {
        devices = mock(DeviceRepository.class);
        repo = mock(WatchSosRepository.class);
        commands = mock(WatchCommands.class);
        service = new WatchSosService(devices, repo, commands);
        device(IMEI, "WATCH");
    }

    private void device(String imei, String protocol) {
        Device d = mock(Device.class);
        when(d.protocol()).thenReturn(protocol);
        when(devices.findByOrgAndImei(ORG, imei)).thenReturn(Optional.of(d));
    }

    @Test
    void numbersAreCleanedAndAlwaysSentInThreePlaces() {
        List<String> cleaned = WatchSosService.clean(Arrays.asList(" 01712-345 678 ", "", null, "+880 1812 345678"));
        assertThat(cleaned).containsExactly("01712345678", "+8801812345678");
        assertThat(WatchSosService.command(cleaned)).isEqualTo("SOS,01712345678,+8801812345678,");
        assertThat(WatchSosService.command(List.of())).isEqualTo("SOS,,,");
    }

    @Test
    void badInputIsRefused() {
        assertThatThrownBy(() -> WatchSosService.clean(List.of("abc"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WatchSosService.clean(List.of("12"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WatchSosService.clean(List.of("017,12345678"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WatchSosService.clean(List.of("01712345678", "01712-345678")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WatchSosService.clean(List.of("0171111111", "0171111112", "0171111113", "0171111114")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void connectedWatchGetsTheCommandAndItsAnswerMarksTheNumbersSynced() {
        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "SOS,01712345678,,")).thenReturn(CompletableFuture.completedFuture("SOS"));

        service.save(ORG, IMEI, List.of("01712345678"));

        verify(repo).saveWanted(ORG, IMEI, List.of("01712345678"));
        verify(repo).markSynced(IMEI, List.of("01712345678"));
    }

    @Test
    void offlineWatchKeepsTheNumbersPendingAndTheSweepDeliversThem() {
        when(commands.connected(IMEI)).thenReturn(false);
        service.save(ORG, IMEI, List.of("01712345678"));
        verify(commands, never()).send(anyString(), anyString());
        verify(repo, never()).markSynced(anyString(), anyList());

        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "SOS,01712345678,,")).thenReturn(CompletableFuture.completedFuture("SOS"));
        when(repo.listPending()).thenReturn(List.of(new WatchSosRepository.Row(IMEI, List.of("01712345678"), "PENDING", null)));
        service.deliverPending();
        verify(repo).markSynced(IMEI, List.of("01712345678"));
    }

    @Test
    void aWatchThatNeverAnswersStaysPending() {
        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "SOS,01712345678,,")).thenReturn(new CompletableFuture<>());
        // REPLY_WAIT is 8 s; a failed future stands in for the timeout
        CompletableFuture<String> failed = new CompletableFuture<>();
        failed.completeExceptionally(new java.util.concurrent.TimeoutException());
        when(commands.send(IMEI, "SOS,01712345678,,")).thenReturn(failed);

        service.save(ORG, IMEI, List.of("01712345678"));

        verify(repo, never()).markSynced(anyString(), anyList());
    }

    @Test
    void aTrackerThatIsNotAWatchIsRefused() {
        device("357445100712345", "GT06");
        assertThatThrownBy(() -> service.save(ORG, "357445100712345", List.of("01712345678")))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repo, never()).saveWanted(any(), anyString(), anyList());
    }

    @Test
    void powerOnResendsOnlyWhenNumbersWereSet() {
        when(repo.find(IMEI)).thenReturn(Optional.empty());
        service.onWatchPowerOn(IMEI);
        verify(repo, never()).markPending(IMEI);

        when(repo.find(IMEI)).thenReturn(Optional.of(new WatchSosRepository.Row(IMEI, List.of("01712345678"), "SYNCED", null)));
        service.onWatchPowerOn(IMEI);
        verify(repo).markPending(IMEI);
    }
}
