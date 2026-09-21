package com.webinnovation.motolink.netty;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChecksumUtilTest {

    @Test
    void byte_array_and_byte_buf_overloads_agree() {
        byte[] data = {0x05, 0x01, 0x00, 0x01, 0x00, 0x05, 0x10, 0x20, 0x30};
        ByteBuf buf = Unpooled.wrappedBuffer(data);
        try {
            assertThat(ChecksumUtil.crcItu(data, 0, data.length))
                    .isEqualTo(ChecksumUtil.crcItu(buf, 0, data.length));
        } finally {
            buf.release();
        }
    }

    /** Empty input: crc starts at 0xFFFF, complement is 0x0000. */
    @Test
    void empty_input_yields_zero() {
        assertThat(ChecksumUtil.crcItu(new byte[0], 0, 0)).isEqualTo(0x0000);
    }

    /** A single-byte change must always change the CRC (catches identity bugs). */
    @Test
    void single_byte_change_changes_crc() {
        int a = ChecksumUtil.crcItu(new byte[]{0x05, 0x01, 0x00, 0x01}, 0, 4);
        int b = ChecksumUtil.crcItu(new byte[]{0x05, 0x01, 0x00, 0x02}, 0, 4);
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void offset_and_length_only_cover_specified_window() {
        byte[] data = {(byte) 0xAA, 0x05, 0x01, 0x00, 0x02, (byte) 0xBB, (byte) 0xCC};
        int full = ChecksumUtil.crcItu(new byte[]{0x05, 0x01, 0x00, 0x02}, 0, 4);
        int windowed = ChecksumUtil.crcItu(data, 1, 4);
        assertThat(windowed).isEqualTo(full);
    }
}
