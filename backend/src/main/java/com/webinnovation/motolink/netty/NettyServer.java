package com.webinnovation.motolink.netty;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NettyServer {

    @Value("${motolink.netty.tcp-port:5023}")
    private int port;

    @Value("${motolink.netty.boss-threads:1}")
    private int bossThreads;

    @Value("${motolink.netty.worker-threads:0}")
    private int workerThreads;

    private final ChannelInitializer<SocketChannel> pipelineInitializer;

    private EventLoopGroup bossGroup;
    private EventLoopGroup workerGroup;
    private Channel serverChannel;

    @PostConstruct
    public void start() throws InterruptedException {
        bossGroup = new NioEventLoopGroup(bossThreads);
        workerGroup = workerThreads > 0 ? new NioEventLoopGroup(workerThreads) : new NioEventLoopGroup();

        ServerBootstrap b = new ServerBootstrap()
                .group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .option(ChannelOption.SO_BACKLOG, 1024)
                .childOption(ChannelOption.SO_KEEPALIVE, true)
                .childOption(ChannelOption.TCP_NODELAY, true)
                .childHandler(pipelineInitializer);

        serverChannel = b.bind(port).sync().channel();
        log.info("Netty GT06 server listening on tcp/{}", port);
    }

    @PreDestroy
    public void stop() {
        log.info("Shutting down Netty GT06 server...");
        try {
            if (serverChannel != null) {
                serverChannel.close().sync();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            if (workerGroup != null) workerGroup.shutdownGracefully();
            if (bossGroup != null) bossGroup.shutdownGracefully();
        }
        log.info("Netty GT06 server stopped");
    }
}
