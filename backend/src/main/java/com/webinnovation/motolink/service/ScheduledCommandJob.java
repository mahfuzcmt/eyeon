package com.webinnovation.motolink.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Wakes every 30 seconds, claims any due scheduled commands, and dispatches them.
 * Single dispatcher per instance; the repo's SKIP LOCKED claim makes this safe
 * to run on multiple replicas later.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledCommandJob {

    private final ScheduledCommandService service;

    @Scheduled(fixedDelay = 30_000, initialDelay = 15_000)
    public void runDue() {
        try {
            service.tick();
        } catch (Exception e) {
            log.error("Scheduled-command tick failed: {}", e.getMessage(), e);
        }
    }
}
