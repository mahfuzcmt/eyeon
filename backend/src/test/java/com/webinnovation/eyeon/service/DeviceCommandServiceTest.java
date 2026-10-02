package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.netty.ChannelKeys;
import com.webinnovation.eyeon.protocol.PacketEncoder;
import io.netty.buffer.ByteBuf;
import io.netty.channel.embedded.EmbeddedChannel;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The exact command text sent to a PL601 for the carer-facing actions (command list V1.4). */
class DeviceCommandServiceTest {

    private static final String IMEI = "868322070079370";
    private final UUID orgId = UUID.randomUUID();
    private final DeviceCommandService service = new DeviceCommandService(new PacketEncoder());

    private EmbeddedChannel connect() {
        EmbeddedChannel channel = new EmbeddedChannel();
        channel.attr(ChannelKeys.ORG_ID_KEY).set(orgId);
        service.registerChannel(IMEI, channel);
        return channel;
    }

    private static String commandText(ByteBuf frame) {
        int cmdLen = frame.getUnsignedByte(4);
        String text = frame.toString(9, cmdLen - 4, StandardCharsets.US_ASCII);
        frame.release();
        return text;
    }

    @Test
    void live_tracking_asks_for_ten_second_reports_for_the_given_time() {
        EmbeddedChannel channel = connect();

        service.liveTracking(orgId, IMEI, 300);

        assertEquals("LT,ON,10,300,1,1,1#", commandText(channel.readOutbound()));
    }

    @Test
    void find_device_rings_for_the_given_time() {
        EmbeddedChannel channel = connect();

        service.findDevice(orgId, IMEI, 20);

        assertEquals("FD,ON,20#", commandText(channel.readOutbound()));
    }

    @Test
    void the_reply_completes_the_matching_command() throws Exception {
        EmbeddedChannel channel = connect();
        CompletableFuture<String> reply = service.liveTracking(orgId, IMEI, 30);
        ByteBuf frame = channel.readOutbound();
        int flag = frame.getInt(5);
        frame.release();

        service.completeReply(flag, "setting OK.LT:ON,10,30,1,1,1");

        assertEquals("setting OK.LT:ON,10,30,1,1,1", reply.get());
    }

    @Test
    void a_tracker_of_another_organization_cannot_be_commanded() {
        connect();

        CompletableFuture<String> reply = service.findDevice(UUID.randomUUID(), IMEI, 20);

        assertTrue(reply.isCompletedExceptionally());
    }
}
