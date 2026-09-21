package com.webinnovation.motolink.netty;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.ByteToMessageDecoder;
import io.netty.handler.codec.CorruptedFrameException;

import java.util.List;

/**
 * Splits the GT06 TCP byte stream into complete frames.
 *
 * Two start markers — both terminate with 0x0D 0x0A (CLAUDE.md §6.1):
 *   0x78 0x78 → 1-byte length field
 *   0x79 0x79 → 2-byte length field
 *
 * Length value covers everything after the length field up to (but not including)
 * the trailing 0x0D 0x0A, i.e. ProtocolNumber + Content + Serial + CRC.
 *
 * Output: a single sliced ByteBuf containing one full frame from the start bytes
 * through 0x0D 0x0A inclusive. Downstream handlers parse it as one unit.
 */
public class Gt06FrameDecoder extends ByteToMessageDecoder {

    private static final int MIN_FRAME_LEN_STD = 2 + 1 + 1 + 2 + 2 + 2;  // start+len+proto+serial+crc+stop
    private static final int MIN_FRAME_LEN_EXT = 2 + 2 + 1 + 2 + 2 + 2;
    private static final int MAX_FRAME_LEN = 65535;

    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        // Need at least the start bytes to decide variant
        while (in.readableBytes() >= 4) {
            int readerIndex = in.readerIndex();
            int b0 = in.getUnsignedByte(readerIndex);
            int b1 = in.getUnsignedByte(readerIndex + 1);

            boolean standard = (b0 == 0x78 && b1 == 0x78);
            boolean extended = (b0 == 0x79 && b1 == 0x79);

            if (!standard && !extended) {
                // Resync: drop one byte and try again
                in.skipBytes(1);
                continue;
            }

            int lenFieldSize = standard ? 1 : 2;
            int headerSize = 2 + lenFieldSize;

            if (in.readableBytes() < headerSize) {
                return;  // wait for more bytes
            }

            int payloadLen;
            if (standard) {
                payloadLen = in.getUnsignedByte(readerIndex + 2);
            } else {
                payloadLen = in.getUnsignedShort(readerIndex + 2);
            }

            // payloadLen counts proto + content + serial + crc — does NOT include 0x0D 0x0A
            int totalFrameLen = headerSize + payloadLen + 2;  // + stop bytes
            int minFrame = standard ? MIN_FRAME_LEN_STD : MIN_FRAME_LEN_EXT;

            if (payloadLen < (1 + 2 + 2) || totalFrameLen > MAX_FRAME_LEN) {
                // payloadLen must cover at least proto(1) + serial(2) + crc(2) = 5
                in.skipBytes(1);
                continue;
            }

            if (in.readableBytes() < totalFrameLen) {
                return;  // incomplete — wait for more
            }

            // Verify trailer
            int stop1 = in.getUnsignedByte(readerIndex + totalFrameLen - 2);
            int stop2 = in.getUnsignedByte(readerIndex + totalFrameLen - 1);
            if (stop1 != 0x0D || stop2 != 0x0A) {
                // Misframed — drop one byte and resync
                in.skipBytes(1);
                continue;
            }

            // Frame OK — slice and emit
            ByteBuf frame = in.readRetainedSlice(totalFrameLen);
            out.add(frame);

            if (totalFrameLen < minFrame) {
                throw new CorruptedFrameException("Frame shorter than minimum: " + totalFrameLen);
            }
        }
    }
}
