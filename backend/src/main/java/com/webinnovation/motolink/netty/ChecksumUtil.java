package com.webinnovation.motolink.netty;

import io.netty.buffer.ByteBuf;

/**
 * CRC-ITU (CRC-16-CCITT) for GT06 protocol.
 * Uses reflected polynomial 0x8408, init 0xFFFF, XOR-out 0xFFFF.
 * Computed over [Length] [ProtocolNumber] [Content] [Serial] (CLAUDE.md §6.6).
 */
public final class ChecksumUtil {

    private static final int[] TABLE = new int[256];

    static {
        // Generate CRC-CCITT table (reflected polynomial 0x8408)
        for (int i = 0; i < 256; i++) {
            int crc = i;
            for (int j = 0; j < 8; j++) {
                crc = (crc & 1) != 0 ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
            }
            TABLE[i] = crc;
        }
    }

    private ChecksumUtil() {}

    public static int crcItu(ByteBuf buf, int offset, int length) {
        int crc = 0xFFFF;
        for (int i = 0; i < length; i++) {
            crc = (crc >>> 8) ^ TABLE[(crc ^ buf.getByte(offset + i)) & 0xFF];
        }
        return crc ^ 0xFFFF;
    }

    public static int crcItu(byte[] data, int offset, int length) {
        int crc = 0xFFFF;
        for (int i = 0; i < length; i++) {
            crc = (crc >>> 8) ^ TABLE[(crc ^ data[offset + i]) & 0xFF];
        }
        return crc ^ 0xFFFF;
    }
}
