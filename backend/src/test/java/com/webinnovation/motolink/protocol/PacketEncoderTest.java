package com.webinnovation.motolink.protocol;

import com.webinnovation.motolink.netty.ChecksumUtil;
import io.netty.buffer.ByteBuf;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PacketEncoderTest {

    private final PacketEncoder encoder = new PacketEncoder();

    @Test
    void login_ack_has_correct_layout_and_valid_crc() {
        ByteBuf ack = encoder.buildLoginAck(0x0001);
        try {
            assertThat(ack.readableBytes()).isEqualTo(10);
            assertThat(ack.getUnsignedByte(0)).isEqualTo((short) 0x78);
            assertThat(ack.getUnsignedByte(1)).isEqualTo((short) 0x78);
            assertThat(ack.getUnsignedByte(2)).isEqualTo((short) 0x05);  // length
            assertThat(ack.getUnsignedByte(3)).isEqualTo((short) 0x01);  // proto = login
            assertThat(ack.getUnsignedShort(4)).isEqualTo(0x0001);       // serial
            assertThat(ack.getUnsignedByte(8)).isEqualTo((short) 0x0D);  // stop
            assertThat(ack.getUnsignedByte(9)).isEqualTo((short) 0x0A);

            int frameCrc = ack.getUnsignedShort(6);
            int expected = ChecksumUtil.crcItu(ack, 2, 4);  // length+proto+serial
            assertThat(frameCrc).isEqualTo(expected);
        } finally {
            ack.release();
        }
    }

    @Test
    void heartbeat_ack_uses_proto_0x13() {
        ByteBuf ack = encoder.buildAck(PacketType.HEARTBEAT, 0x00FE);
        try {
            assertThat(ack.getUnsignedByte(3)).isEqualTo((short) 0x13);
            assertThat(ack.getUnsignedShort(4)).isEqualTo(0x00FE);
        } finally {
            ack.release();
        }
    }
}
