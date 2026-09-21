package com.webinnovation.motolink.protocol;

import com.webinnovation.motolink.netty.ChecksumUtil;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import org.springframework.stereotype.Component;

/**
 * Builds 0x78 0x78 ACK frames for the device.
 *
 * Layout: [0x78 0x78] [Length=5] [Proto] [Serial:2] [CRC:2] [0x0D 0x0A]
 * CRC covers Length..Serial inclusive (CLAUDE.md §6.6).
 */
@Component
public class PacketEncoder {

    public ByteBuf buildAck(int protocolNumber, int serial) {
        // Length = proto(1) + serial(2) + crc(2) = 5
        ByteBuf buf = Unpooled.buffer(10);
        buf.writeByte(0x78);
        buf.writeByte(0x78);
        buf.writeByte(0x05);
        buf.writeByte(protocolNumber);
        buf.writeShort(serial);

        int crc = ChecksumUtil.crcItu(buf, 2, buf.writerIndex() - 2);
        buf.writeShort(crc);
        buf.writeByte(0x0D);
        buf.writeByte(0x0A);
        return buf;
    }

    public ByteBuf buildLoginAck(int serial) {
        return buildAck(PacketType.LOGIN, serial);
    }

    /**
     * Build a server command (0x80) frame.
     * Layout: [0x78 0x78][Length][0x80][CmdLen][ServerFlag:4][Cmd:N][Lang:2][Serial:2][CRC:2][0x0D 0x0A]
     *
     * @param serverFlag opaque 32-bit identifier echoed back in the 0x15 reply
     * @param command    ASCII command string, e.g. "DYD,123456#"
     * @param serial     16-bit serial echoed in the device reply
     */
    public ByteBuf buildServerCommand(int serverFlag, String command, int serial) {
        byte[] cmd = command.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        int cmdLenField = 4 + cmd.length + 2;          // serverFlag + cmd + lang
        int payloadLen = 1 + cmdLenField + 2;          // CmdLen byte + body + serial(2)

        ByteBuf buf = Unpooled.buffer(2 + 1 + payloadLen + 2 + 2);
        buf.writeByte(0x78);
        buf.writeByte(0x78);
        buf.writeByte(payloadLen);
        buf.writeByte(PacketType.SERVER_COMMAND);
        buf.writeByte(cmdLenField);
        buf.writeInt(serverFlag);
        buf.writeBytes(cmd);
        buf.writeShort(0x0002);  // language: 2 = English
        buf.writeShort(serial);

        int crc = ChecksumUtil.crcItu(buf, 2, buf.writerIndex() - 2);
        buf.writeShort(crc);
        buf.writeByte(0x0D);
        buf.writeByte(0x0A);
        return buf;
    }

    /**
     * Build a Jimi time calibration response (0x8A).
     * Layout: [0x78 0x78][Length=0x0B][0x8A][YY][MM][DD][HH][mm][ss][Serial:2][CRC:2][0x0D 0x0A]
     *
     * Sends current UTC time to the device for clock synchronization.
     */
    public ByteBuf buildTimeCalibrationResponse(int serial) {
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC);

        // Length = proto(1) + datetime(6) + serial(2) + crc(2) = 11 (0x0B)
        ByteBuf buf = Unpooled.buffer(15);
        buf.writeByte(0x78);
        buf.writeByte(0x78);
        buf.writeByte(0x0B);
        buf.writeByte(PacketType.JIMI_TIME_CALIBRATION);

        // DateTime: YY MM DD HH mm ss (all 1 byte, YY is year minus 2000)
        buf.writeByte(now.getYear() - 2000);
        buf.writeByte(now.getMonthValue());
        buf.writeByte(now.getDayOfMonth());
        buf.writeByte(now.getHour());
        buf.writeByte(now.getMinute());
        buf.writeByte(now.getSecond());

        buf.writeShort(serial);

        int crc = ChecksumUtil.crcItu(buf, 2, buf.writerIndex() - 2);
        buf.writeShort(crc);
        buf.writeByte(0x0D);
        buf.writeByte(0x0A);
        return buf;
    }
}
