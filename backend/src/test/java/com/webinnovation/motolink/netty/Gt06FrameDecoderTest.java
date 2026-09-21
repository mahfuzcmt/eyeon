package com.webinnovation.motolink.netty;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.embedded.EmbeddedChannel;
import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;

import static org.assertj.core.api.Assertions.assertThat;

class Gt06FrameDecoderTest {

    /** Build a 0x78 0x78 frame around an arbitrary payload (proto + content + serial). */
    private static byte[] buildStandardFrame(int proto, byte[] content, int serial) {
        int payloadLen = 1 + content.length + 2 + 2;  // proto + content + serial + crc
        ByteBuffer bb = ByteBuffer.allocate(2 + 1 + payloadLen + 2);
        bb.put((byte) 0x78).put((byte) 0x78);
        bb.put((byte) payloadLen);
        bb.put((byte) proto);
        bb.put(content);
        bb.putShort((short) serial);

        // CRC over [length..serial]
        int crcStart = 2;
        int crcLen = 1 + 1 + content.length + 2;
        int crc = ChecksumUtil.crcItu(bb.array(), crcStart, crcLen);
        bb.putShort((short) crc);
        bb.put((byte) 0x0D).put((byte) 0x0A);
        return bb.array();
    }

    private static byte[] buildExtendedFrame(int proto, byte[] content, int serial) {
        int payloadLen = 1 + content.length + 2 + 2;  // proto + content + serial + crc
        ByteBuffer bb = ByteBuffer.allocate(2 + 2 + payloadLen + 2);
        bb.put((byte) 0x79).put((byte) 0x79);
        bb.putShort((short) payloadLen);
        bb.put((byte) proto);
        bb.put(content);
        bb.putShort((short) serial);

        int crcStart = 2;
        int crcLen = 2 + 1 + content.length + 2;
        int crc = ChecksumUtil.crcItu(bb.array(), crcStart, crcLen);
        bb.putShort((short) crc);
        bb.put((byte) 0x0D).put((byte) 0x0A);
        return bb.array();
    }

    @Test
    void decodes_single_standard_frame() {
        byte[] frame = buildStandardFrame(0x01, new byte[]{0x08, 0x64, 0x29, 0x00, 0x61, 0x23, 0x45, 0x67}, 1);
        EmbeddedChannel ch = new EmbeddedChannel(new Gt06FrameDecoder());
        ch.writeInbound(Unpooled.wrappedBuffer(frame));

        ByteBuf out = ch.readInbound();
        try {
            assertThat(out).isNotNull();
            assertThat(out.readableBytes()).isEqualTo(frame.length);
        } finally {
            out.release();
        }
        assertThat(ch.<Object>readInbound()).isNull();
    }

    @Test
    void decodes_extended_0x79_frame() {
        byte[] frame = buildExtendedFrame(0x94, new byte[]{0x01, 0x02, 0x03, 0x04, 0x05}, 7);
        EmbeddedChannel ch = new EmbeddedChannel(new Gt06FrameDecoder());
        ch.writeInbound(Unpooled.wrappedBuffer(frame));

        ByteBuf out = ch.readInbound();
        try {
            assertThat(out).isNotNull();
            assertThat(out.readableBytes()).isEqualTo(frame.length);
            // First two bytes must be 0x79 0x79
            assertThat(out.getUnsignedByte(0)).isEqualTo((short) 0x79);
            assertThat(out.getUnsignedByte(1)).isEqualTo((short) 0x79);
        } finally {
            out.release();
        }
    }

    @Test
    void splits_two_back_to_back_frames() {
        byte[] f1 = buildStandardFrame(0x13, new byte[]{0x40, 0x04, 0x04, 0x00, 0x01}, 2);
        byte[] f2 = buildStandardFrame(0x13, new byte[]{0x40, 0x04, 0x04, 0x00, 0x01}, 3);
        byte[] combined = new byte[f1.length + f2.length];
        System.arraycopy(f1, 0, combined, 0, f1.length);
        System.arraycopy(f2, 0, combined, f1.length, f2.length);

        EmbeddedChannel ch = new EmbeddedChannel(new Gt06FrameDecoder());
        ch.writeInbound(Unpooled.wrappedBuffer(combined));

        ByteBuf out1 = ch.readInbound();
        ByteBuf out2 = ch.readInbound();
        try {
            assertThat(out1).isNotNull();
            assertThat(out2).isNotNull();
            assertThat(out1.readableBytes()).isEqualTo(f1.length);
            assertThat(out2.readableBytes()).isEqualTo(f2.length);
        } finally {
            if (out1 != null) out1.release();
            if (out2 != null) out2.release();
        }
    }

    @Test
    void waits_for_complete_frame_when_split_across_reads() {
        byte[] frame = buildStandardFrame(0x01, new byte[]{0x08, 0x64, 0x29, 0x00, 0x61, 0x23, 0x45, 0x67}, 1);
        EmbeddedChannel ch = new EmbeddedChannel(new Gt06FrameDecoder());

        // Write first half
        ch.writeInbound(Unpooled.wrappedBuffer(frame, 0, 5));
        assertThat(ch.<Object>readInbound()).isNull();

        // Write the rest
        ch.writeInbound(Unpooled.wrappedBuffer(frame, 5, frame.length - 5));
        ByteBuf out = ch.readInbound();
        try {
            assertThat(out).isNotNull();
            assertThat(out.readableBytes()).isEqualTo(frame.length);
        } finally {
            out.release();
        }
    }

    @Test
    void resyncs_past_garbage_bytes() {
        byte[] frame = buildStandardFrame(0x13, new byte[]{0x40, 0x04, 0x04, 0x00, 0x01}, 9);
        byte[] garbage = {0x00, (byte) 0xFF, 0x42};
        byte[] combined = new byte[garbage.length + frame.length];
        System.arraycopy(garbage, 0, combined, 0, garbage.length);
        System.arraycopy(frame, 0, combined, garbage.length, frame.length);

        EmbeddedChannel ch = new EmbeddedChannel(new Gt06FrameDecoder());
        ch.writeInbound(Unpooled.wrappedBuffer(combined));

        ByteBuf out = ch.readInbound();
        try {
            assertThat(out).isNotNull();
            assertThat(out.readableBytes()).isEqualTo(frame.length);
        } finally {
            out.release();
        }
    }
}
