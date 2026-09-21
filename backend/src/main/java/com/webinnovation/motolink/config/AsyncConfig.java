package com.webinnovation.motolink.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.core.task.support.TaskExecutorAdapter;

import java.util.concurrent.Executors;

@Configuration
public class AsyncConfig {

    /**
     * Virtual-thread executor for off-loading work from the Netty event loop.
     * Hot-path DB writes and side-effects should run here so the event loop stays free
     * to send ACKs synchronously (CLAUDE.md §3.2 rule 6, §6.4).
     */
    @Bean(name = "ingestExecutor")
    public AsyncTaskExecutor ingestExecutor() {
        return new TaskExecutorAdapter(Executors.newVirtualThreadPerTaskExecutor());
    }
}
