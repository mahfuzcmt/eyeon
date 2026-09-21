package com.webinnovation.motolink.config;

import com.webinnovation.motolink.netty.Gt06FrameDecoder;
import com.webinnovation.motolink.netty.Gt06Handler;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.timeout.IdleStateHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class NettyServerConfig {

    /**
     * Pipeline factory. A new Gt06FrameDecoder is created per channel (stateful);
     * Gt06Handler is sharable singleton resolved from Spring context.
     */
    @Bean
    public ChannelInitializer<SocketChannel> pipelineInitializer(
            ObjectProvider<Gt06Handler> handlerProvider) {
        return new ChannelInitializer<>() {
            @Override
            protected void initChannel(SocketChannel ch) {
                ch.pipeline()
                        // Drop idle connections after 10 minutes (heartbeat is ~3 min).
                        .addLast("idle", new IdleStateHandler(600, 0, 0, TimeUnit.SECONDS))
                        .addLast("frame", new Gt06FrameDecoder())
                        .addLast("handler", handlerProvider.getObject());
            }
        };
    }
}
