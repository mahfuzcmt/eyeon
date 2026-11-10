package com.webinnovation.eyeon.config;

import com.webinnovation.eyeon.netty.Gt06Handler;
import com.webinnovation.eyeon.netty.TrackerPipeline;
import com.webinnovation.eyeon.netty.WatchTarget;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.socket.SocketChannel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class NettyServerConfig {

    /**
     * Pipeline factory, see {@link TrackerPipeline}. Gt06Handler is a sharable singleton.
     *
     * @param watchForward "host:port" of the smart-watch server; watches that connect to the
     *                     tracker port are passed through to it. Blank = off.
     */
    @Bean
    public ChannelInitializer<SocketChannel> pipelineInitializer(
            ObjectProvider<Gt06Handler> handlerProvider,
            @Value("${eyeon.netty.watch-forward:}") String watchForward,
            // Drop idle connections after 10 minutes (heartbeat is ~3 min).
            @Value("${eyeon.netty.idle-read-seconds:600}") int idleReadSeconds) {
        WatchTarget watchTarget = WatchTarget.parse(watchForward);
        log.info("Tracker port: smart-watch relay {}", watchTarget == null ? "off" : "to " + watchTarget);
        return new ChannelInitializer<>() {
            @Override
            protected void initChannel(SocketChannel ch) {
                TrackerPipeline.configure(ch.pipeline(), handlerProvider.getObject(), watchTarget, idleReadSeconds);
            }
        };
    }
}
