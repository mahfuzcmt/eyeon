package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.exception.NotFoundException;
import com.webinnovation.eyeon.netty.WatchCommands;
import com.webinnovation.eyeon.repository.DeviceRepository;
import com.webinnovation.eyeon.repository.WatchSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WatchTimeServiceTest {

    private static final UUID ORG = UUID.randomUUID();
    private static final String IMEI = "1378748302";

    private DeviceRepository devices;
    private WatchSettingsRepository repo;
    private WatchCommands commands;
    private WatchTimeService service;

    @BeforeEach
    void setUp() {
        devices = mock(DeviceRepository.class);
        repo = mock(WatchSettingsRepository.class);
        commands = mock(WatchCommands.class);
        service = new WatchTimeService(devices, repo, commands);
        device(IMEI, "WATCH");
    }

    private void device(String imei, String protocol) {
        Device d = mock(Device.class);
        when(d.protocol()).thenReturn(protocol);
        when(devices.findByOrgAndImei(ORG, imei)).thenReturn(Optional.of(d));
    }

    @Test
    void connectedWatchGetsLzAndItsAnswerMarksTheSettingSynced() {
        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "LZ,0,6")).thenReturn(CompletableFuture.completedFuture("LZ"));
        when(commands.send(IMEI, "ZONE,6")).thenReturn(CompletableFuture.completedFuture("ZONE"));

        service.save(ORG, IMEI, 0, 6);

        verify(repo).saveWanted(ORG, IMEI, 0, 6);
        verify(commands).send(IMEI, "ZONE,6");
        verify(repo).markSynced(IMEI, 0, 6);
    }

    @Test
    void watchThatIsNotConnectedKeepsTheSettingPendingForLater() {
        when(commands.connected(IMEI)).thenReturn(false);
        when(repo.find(IMEI)).thenReturn(Optional.of(new WatchSettingsRepository.Row(IMEI, 0, 6, "PENDING", null)));

        WatchTimeService.View view = service.save(ORG, IMEI, 0, 6);

        verify(repo).saveWanted(ORG, IMEI, 0, 6);
        verify(commands, never()).send(anyString(), anyString());
        verify(repo, never()).markSynced(anyString(), anyInt(), anyInt());
        assertThat(view.status()).isEqualTo("PENDING");
        assertThat(view.online()).isFalse();
    }

    @Test
    void anUnansweredCommandStaysPendingAndTheSweepSendsItAgain() {
        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "LZ,0,6")).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("gone")));
        service.save(ORG, IMEI, 0, 6);
        verify(repo, never()).markSynced(anyString(), anyInt(), anyInt());

        when(repo.listPending()).thenReturn(List.of(new WatchSettingsRepository.Row(IMEI, 0, 6, "PENDING", null)));
        when(commands.send(IMEI, "LZ,0,6")).thenReturn(CompletableFuture.completedFuture("LZ"));
        when(commands.send(IMEI, "ZONE,6")).thenReturn(CompletableFuture.completedFuture("ZONE"));
        service.deliverPending();
        verify(repo).markSynced(IMEI, 0, 6);
    }

    @Test
    void zonesWestOfUtcAreSentWithTheirSign() {
        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "LZ,4,-5")).thenReturn(CompletableFuture.completedFuture("LZ"));
        when(commands.send(IMEI, "ZONE,-5")).thenReturn(CompletableFuture.completedFuture("ZONE"));
        service.save(ORG, IMEI, 4, -5);
        verify(repo).markSynced(IMEI, 4, -5);
    }

    @Test
    void valuesTheWatchDoesNotKnowAreRefused() {
        assertThatThrownBy(() -> service.save(ORG, IMEI, 2, 6)).isInstanceOf(IllegalArgumentException.class);   // no language 2
        assertThatThrownBy(() -> service.save(ORG, IMEI, 0, 15)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.save(ORG, IMEI, 0, -13)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.save(ORG, IMEI, null, 6)).isInstanceOf(IllegalArgumentException.class);
        verify(repo, never()).saveWanted(ORG, IMEI, 0, 15);
    }

    @Test
    void onlyAWatchHasThisSetting() {
        device("868322070079370", "GT06");
        assertThatThrownBy(() -> service.save(ORG, "868322070079370", 0, 6)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.get(ORG, "000")).isInstanceOf(NotFoundException.class);
    }

    @Test
    void aWatchNeverSetGetsBangladeshTimeAndOneAlreadySetIsLeftAsChosen() {
        when(repo.find(IMEI)).thenReturn(Optional.empty());
        service.onWatchConnected(ORG, IMEI);
        verify(repo).saveWanted(ORG, IMEI, WatchTimeService.DEFAULT_LANGUAGE, 6);

        org.mockito.Mockito.reset(repo);
        when(repo.find(IMEI)).thenReturn(Optional.of(new WatchSettingsRepository.Row(IMEI, 4, 3, "SYNCED", null)));
        service.onWatchConnected(ORG, IMEI);
        verify(repo, never()).saveWanted(org.mockito.ArgumentMatchers.any(), anyString(), anyInt(), anyInt());
    }

    @Test
    void aRestartedWatchIsSentWhatItWasSetToAgain() {
        when(repo.find(IMEI)).thenReturn(Optional.of(new WatchSettingsRepository.Row(IMEI, 0, 6, "SYNCED", null)));
        service.onWatchPowerOn(ORG, IMEI);
        verify(repo).markPending(IMEI);
    }

    @Test
    void aWatchThatAnswersOnlyTheLanguageCommandStaysPendingAndIsAskedAgain() {
        when(commands.connected(IMEI)).thenReturn(true);
        when(commands.send(IMEI, "LZ,0,6")).thenReturn(CompletableFuture.completedFuture("LZ"));
        when(commands.send(IMEI, "ZONE,6")).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("no answer")));

        service.save(ORG, IMEI, 0, 6);

        verify(repo, never()).markSynced(anyString(), anyInt(), anyInt());
    }
}
