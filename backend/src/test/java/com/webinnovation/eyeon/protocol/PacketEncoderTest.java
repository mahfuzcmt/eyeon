package com.webinnovation.eyeon.protocol;

import com.webinnovation.eyeon.netty.ChecksumUtil;
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

    /**
     * A tracker frames the packet by Length and reads the command by CmdLen. Both were wrong
     * until 2026-10-02 (Length three short, CmdLen two long) and a Jimi PL601 never answered.
     * Reference frame from the Concox GT06 document (it has no language field, hence 0x15 there):
     *   78 78 15 80 0F 00 01 A9 58 "DYD,000000#" 00 A0 DC F1 0D 0A
     */
    @Test
    void server_command_length_fields_follow_the_protocol() {
        ByteBuf f = encoder.buildServerCommand(0x0001A958, "DYD,000000#", 0x00A0);
        try {
            int total = f.readableBytes();
            assertThat(f.getUnsignedShort(0)).isEqualTo(0x7878);
            // Length = everything after the length byte up to and including the CRC
            assertThat(f.getUnsignedByte(2)).isEqualTo((short) (total - 2 - 1 - 2));
            assertThat(f.getUnsignedByte(2)).isEqualTo((short) 0x17);   // 0x15 + 2-byte language
            assertThat(f.getUnsignedByte(3)).isEqualTo((short) 0x80);
            assertThat(f.getUnsignedByte(4)).isEqualTo((short) 0x0F);   // server flag (4) + 11 characters
            assertThat(f.getInt(5)).isEqualTo(0x0001A958);
            assertThat(f.toString(9, 11, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("DYD,000000#");
            assertThat(f.getUnsignedShort(20)).isEqualTo(0x0002);       // language: English
            assertThat(f.getUnsignedShort(22)).isEqualTo(0x00A0);       // serial
            assertThat(f.getUnsignedShort(24)).isEqualTo(ChecksumUtil.crcItu(f, 2, total - 6));
            assertThat(f.getUnsignedShort(26)).isEqualTo(0x0D0A);
        } finally {
            f.release();
        }
    }
}
