package com.webinnovation.motolink.netty;

import com.webinnovation.motolink.domain.Device;
import com.webinnovation.motolink.protocol.LocationData;
import com.webinnovation.motolink.protocol.PacketDecoder;
import com.webinnovation.motolink.protocol.PacketEncoder;
import com.webinnovation.motolink.protocol.PacketType;
import com.webinnovation.motolink.service.DeviceService;
import com.webinnovation.motolink.service.LocationService;
import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandler.Sharable;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Receives full GT06 frames from Gt06FrameDecoder, validates CRC, ACKs immediately
 * on the event loop, then offloads persistence to the ingest virtual-thread executor.
 *
 * Layout per CLAUDE.md §6.1:
 *   [Start:2] [Length:1or2] [Proto:1] [Content:N] [Serial:2] [CRC:2] [0x0D 0x0A]
 *
 * CRC covers Length..Serial inclusive (§6.6). Content slice for decoders excludes
 * everything after [Proto].
 */
@Component
@Sharable
@Slf4j
public class Gt06Handler extends SimpleChannelInboundHandler<ByteBuf> {

    private final PacketDecoder packetDecoder;
    private final PacketEncoder packetEncoder;
    private final DeviceService deviceService;
    private final LocationService locationService;
    private final com.webinnovation.motolink.service.AlarmService alarmService;
    private final com.webinnovation.motolink.service.DeviceCommandService deviceCommandService;
    private final AsyncTaskExecutor ingestExecutor;

    public Gt06Handler(PacketDecoder packetDecoder,
                       PacketEncoder packetEncoder,
                       DeviceService deviceService,
                       LocationService locationService,
                       com.webinnovation.motolink.service.AlarmService alarmService,
                       com.webinnovation.motolink.service.DeviceCommandService deviceCommandService,
                       @Qualifier("ingestExecutor") AsyncTaskExecutor ingestExecutor) {
        this.packetDecoder = packetDecoder;
        this.packetEncoder = packetEncoder;
        this.deviceService = deviceService;
        this.locationService = locationService;
        this.alarmService = alarmService;
        this.deviceCommandService = deviceCommandService;
        this.ingestExecutor = ingestExecutor;
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf frame) {
        int frameStart = frame.readerIndex();
        int frameLen = frame.readableBytes();

        int b0 = frame.getUnsignedByte(frameStart);
        int b1 = frame.getUnsignedByte(frameStart + 1);
        boolean extended = (b0 == 0x79 && b1 == 0x79);
        int lenFieldSize = extended ? 2 : 1;

        int payloadLen = extended
                ? frame.getUnsignedShort(frameStart + 2)
                : frame.getUnsignedByte(frameStart + 2);

        // Layout offsets (relative to frameStart):
        //   [0..1] start, [2..2+lenFieldSize-1] length,
        //   [headerOff] proto, then content, serial, crc, stop
        int protoOff = frameStart + 2 + lenFieldSize;
        int crcCoverStart = frameStart + 2;          // length byte(s) start
        int crcCoverLen = lenFieldSize + payloadLen - 2;  // up to & including serial, exclude crc(2)
        int crcOff = frameStart + frameLen - 4;      // 2 (CRC) + 2 (stop)
        int serialOff = crcOff - 2;
        int contentStart = protoOff + 1;
        int contentLen = serialOff - contentStart;

        int proto = frame.getUnsignedByte(protoOff);
        int serial = frame.getUnsignedShort(serialOff);
        int frameCrc = frame.getUnsignedShort(crcOff);
        int computedCrc = ChecksumUtil.crcItu(frame, crcCoverStart, crcCoverLen);

        if (frameCrc != computedCrc) {
            log.warn("CRC mismatch: proto=0x{} got=0x{} expected=0x{} — dropping",
                    Integer.toHexString(proto),
                    Integer.toHexString(frameCrc),
                    Integer.toHexString(computedCrc));
            return;
        }

        // Slice the content (between proto and serial) for the decoder
        ByteBuf content = frame.retainedSlice(contentStart, Math.max(0, contentLen));
        try {
            dispatch(ctx, proto, serial, content);
        } finally {
            content.release();
        }
    }

    private void dispatch(ChannelHandlerContext ctx, int proto, int serial, ByteBuf content) {
        switch (proto) {
            case PacketType.LOGIN -> handleLogin(ctx, serial, content);

            // Location packets (GT06 and Jimi IoT share 0x22)
            case PacketType.LOCATION_V18, PacketType.LOCATION_V3,
                 PacketType.LOCATION_V4, PacketType.LOCATION_4G ->
                    handleLocation(ctx, proto, serial, content);

            // Heartbeat: GT06 uses 0x13, Jimi EG02/EG03 uses 0x23
            case PacketType.HEARTBEAT -> handleHeartbeat(ctx, serial, content);
            case PacketType.JIMI_HEARTBEAT -> handleJimiHeartbeat(ctx, serial, content);

            // Alarms: GT06 uses 0x16, Jimi uses 0x26/0x27/0x19
            case PacketType.ALARM -> handleAlarm(ctx, serial, content);
            case PacketType.JIMI_ALARM -> handleJimiAlarm(ctx, serial, content);
            case PacketType.JIMI_ALARM_HVT001 -> handleJimiAlarmHvt001(ctx, serial, content);
            case PacketType.JIMI_LBS_ALARM -> handleJimiLbsAlarm(ctx, serial, content);

            // Jimi IoT specific packets
            case PacketType.JIMI_LBS_EXTENSION -> handleJimiLbsExtension(ctx, serial, content);
            case PacketType.JIMI_WIFI -> handleJimiWifi(ctx, serial, content);
            case PacketType.JIMI_TIME_CALIBRATION -> handleJimiTimeCalibration(ctx, serial, content);
            case PacketType.JIMI_INFO_TRANSMISSION -> handleJimiInfoTransmission(ctx, serial, content);

            case PacketType.COMMAND_REPLY -> handleCommandReply(ctx, content);
            default -> {
                log.debug("Unhandled protocol 0x{}, ACKing serial {}",
                        Integer.toHexString(proto), serial);
                ctx.writeAndFlush(packetEncoder.buildAck(proto, serial));
            }
        }
    }

    private void handleLogin(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        if (content.readableBytes() < 8) {
            log.warn("Login content too short ({} bytes)", content.readableBytes());
            return;
        }
        String imei = packetDecoder.decodeLoginImei(content);
        log.info("Login from IMEI={} channel={}", imei, ctx.channel().id());

        // ACK first — devices disconnect after 5s without a response
        ctx.writeAndFlush(packetEncoder.buildLoginAck(serial));

        // Lookup off the event loop
        ingestExecutor.execute(() -> {
            Optional<Device> deviceOpt = deviceService.findByImei(imei);
            Device d;
            if (deviceOpt.isEmpty()) {
                // Auto-register new devices on first connection
                log.info("New device IMEI {} — auto-registering", imei);
                try {
                    d = deviceService.autoRegister(imei);
                } catch (Exception e) {
                    log.error("Auto-registration failed for IMEI {}: {}", imei, e.getMessage());
                    ctx.channel().attr(ChannelKeys.IMEI_KEY).set(imei);
                    ctx.channel().attr(ChannelKeys.REGISTERED_KEY).set(false);
                    return;
                }
            } else {
                d = deviceOpt.get();
            }
            ctx.channel().attr(ChannelKeys.IMEI_KEY).set(imei);
            ctx.channel().attr(ChannelKeys.ORG_ID_KEY).set(d.orgId());
            ctx.channel().attr(ChannelKeys.REGISTERED_KEY).set(true);
            deviceCommandService.registerChannel(imei, ctx.channel());
            deviceService.markOnline(imei);
        });
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        if (imei != null) {
            deviceCommandService.unregisterChannel(imei, ctx.channel());
        }
    }

    private void handleLocation(ChannelHandlerContext ctx, int proto, int serial, ByteBuf content) {
        // ACK immediately
        ctx.writeAndFlush(packetEncoder.buildAck(proto, serial));

        Boolean registered = ctx.channel().attr(ChannelKeys.REGISTERED_KEY).get();
        if (registered == null || !registered) {
            log.debug("Dropping location packet from unregistered channel id={}",
                    ctx.channel().id());
            return;
        }

        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        UUID orgId = ctx.channel().attr(ChannelKeys.ORG_ID_KEY).get();
        if (imei == null || orgId == null) {
            log.debug("Dropping location packet — missing imei/orgId on channel attrs");
            return;
        }

        // Snapshot the bytes before crossing threads — content slice is event-loop-bound
        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                LocationData loc = packetDecoder.decodeLocation(detached, proto);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                log.info("Location: imei={} lat={} lng={} speed={} course={} acc={} valid={} ts={}",
                        imei, loc.getLatitude(), loc.getLongitude(), loc.getSpeed(),
                        loc.getCourse(), loc.getAccOn(), loc.isValid(), loc.getTimestamp());
                locationService.saveAndBroadcast(loc);
            } catch (Exception e) {
                log.error("Location decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        });
    }

    private void handleAlarm(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        // ACK first — alarm packets follow the standard ACK protocol
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.ALARM, serial));

        Boolean registered = ctx.channel().attr(ChannelKeys.REGISTERED_KEY).get();
        if (registered == null || !registered) {
            log.debug("Dropping alarm packet from unregistered channel id={}", ctx.channel().id());
            return;
        }
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        UUID orgId = ctx.channel().attr(ChannelKeys.ORG_ID_KEY).get();
        if (imei == null || orgId == null) return;

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                LocationData loc = packetDecoder.decodeAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                // Persist as a location row + run geofence/trip evaluation
                locationService.saveAndBroadcast(loc);

                // Then translate the alarm code into a domain alarm (GT06 Protocol V3.0 codes)
                com.webinnovation.motolink.domain.enums.AlarmType type =
                        switch (loc.getAlarmCode()) {
                            case 0x01 -> com.webinnovation.motolink.domain.enums.AlarmType.SOS;
                            case 0x02 -> com.webinnovation.motolink.domain.enums.AlarmType.POWER_CUT;
                            case 0x03 -> com.webinnovation.motolink.domain.enums.AlarmType.SHOCK;
                            case 0x06 -> com.webinnovation.motolink.domain.enums.AlarmType.OVERSPEED;
                            case 0x09 -> com.webinnovation.motolink.domain.enums.AlarmType.GEOFENCE_EXIT;
                            case 0x0E -> com.webinnovation.motolink.domain.enums.AlarmType.EXTERNAL_LOW_VOLTAGE;
                            case 0x13 -> com.webinnovation.motolink.domain.enums.AlarmType.REMOVE;
                            case 0x14 -> com.webinnovation.motolink.domain.enums.AlarmType.DOOR;
                            case 0x19 -> com.webinnovation.motolink.domain.enums.AlarmType.LOW_BATTERY;
                            case 0xF0 -> com.webinnovation.motolink.domain.enums.AlarmType.URGENT_ACCELERATION;
                            case 0xF1 -> com.webinnovation.motolink.domain.enums.AlarmType.URGENT_DECELERATION;
                            case 0xF2 -> com.webinnovation.motolink.domain.enums.AlarmType.COLLISION;
                            case 0xFE -> com.webinnovation.motolink.domain.enums.AlarmType.ACC_ON;
                            case 0xFF -> com.webinnovation.motolink.domain.enums.AlarmType.ACC_OFF;
                            default -> null;
                        };
                if (type == null) return;

                com.webinnovation.motolink.domain.enums.AlarmSeverity sev =
                        switch (type) {
                            case SOS, POWER_CUT, COLLISION, REMOVE ->
                                com.webinnovation.motolink.domain.enums.AlarmSeverity.CRITICAL;
                            case SHOCK, OVERSPEED, URGENT_ACCELERATION, URGENT_DECELERATION,
                                 GEOFENCE_EXIT, EXTERNAL_LOW_VOLTAGE, LOW_BATTERY ->
                                com.webinnovation.motolink.domain.enums.AlarmSeverity.WARNING;
                            default -> com.webinnovation.motolink.domain.enums.AlarmSeverity.INFO;
                        };

                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode()));
            } catch (Exception e) {
                log.error("Alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        });
    }

    private void handleCommandReply(ChannelHandlerContext ctx, ByteBuf content) {
        // 0x15 reply layout: [server-flag:4][len:1][content...]
        if (content.readableBytes() < 5) return;
        byte[] flagBytes = new byte[4];
        content.readBytes(flagBytes);
        int serverFlag = ((flagBytes[0] & 0xFF) << 24)
                | ((flagBytes[1] & 0xFF) << 16)
                | ((flagBytes[2] & 0xFF) << 8)
                | (flagBytes[3] & 0xFF);
        int len = content.readUnsignedByte();
        len = Math.min(len, content.readableBytes());
        byte[] reply = new byte[len];
        content.readBytes(reply);
        deviceCommandService.completeReply(serverFlag, new String(reply, java.nio.charset.StandardCharsets.US_ASCII));
    }

    private void handleHeartbeat(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.HEARTBEAT, serial));
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        if (imei == null) return;

        // Snapshot the status block off the event loop. Older firmware sends a
        // bare heartbeat (no status); decoder returns null in that case.
        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                PacketDecoder.HeartbeatStatus status = packetDecoder.decodeHeartbeat(detached);
                if (status != null) {
                    deviceService.applyHeartbeatStatus(imei, status.gsmSignal());
                } else {
                    deviceService.markOnline(imei);
                }
            } catch (Exception e) {
                log.warn("Heartbeat status decode failed for imei={}: {}", imei, e.getMessage());
                deviceService.markOnline(imei);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Jimi IoT Protocol V3.2 Handlers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Jimi EG02/EG03 heartbeat (0x23). Same structure as GT06 heartbeat but
     * different protocol number.
     */
    private void handleJimiHeartbeat(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_HEARTBEAT, serial));
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        if (imei == null) return;

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                PacketDecoder.HeartbeatStatus status = packetDecoder.decodeHeartbeat(detached);
                if (status != null) {
                    deviceService.applyHeartbeatStatus(imei, status.gsmSignal());
                } else {
                    deviceService.markOnline(imei);
                }
            } catch (Exception e) {
                log.warn("Jimi heartbeat decode failed for imei={}: {}", imei, e.getMessage());
                deviceService.markOnline(imei);
            }
        });
    }

    /**
     * Jimi alarm packet (0x26). Similar to GT06 alarm but with Jimi-specific alarm codes.
     */
    private void handleJimiAlarm(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_ALARM, serial));

        Boolean registered = ctx.channel().attr(ChannelKeys.REGISTERED_KEY).get();
        if (registered == null || !registered) {
            log.debug("Dropping Jimi alarm from unregistered channel id={}", ctx.channel().id());
            return;
        }
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        UUID orgId = ctx.channel().attr(ChannelKeys.ORG_ID_KEY).get();
        if (imei == null || orgId == null) return;

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                LocationData loc = packetDecoder.decodeJimiAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                locationService.saveAndBroadcast(loc);

                // Map Jimi alarm codes to domain alarm types
                com.webinnovation.motolink.domain.enums.AlarmType type = mapJimiAlarmCode(loc.getAlarmCode());
                if (type == null) return;

                com.webinnovation.motolink.domain.enums.AlarmSeverity sev = getAlarmSeverity(type);
                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode(), "protocol", "jimi"));
            } catch (Exception e) {
                log.error("Jimi alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        });
    }

    /**
     * Jimi HVT001 alarm packet (0x27). Specialized video tracker alarm.
     */
    private void handleJimiAlarmHvt001(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_ALARM_HVT001, serial));

        Boolean registered = ctx.channel().attr(ChannelKeys.REGISTERED_KEY).get();
        if (registered == null || !registered) {
            log.debug("Dropping Jimi HVT001 alarm from unregistered channel id={}", ctx.channel().id());
            return;
        }
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        UUID orgId = ctx.channel().attr(ChannelKeys.ORG_ID_KEY).get();
        if (imei == null || orgId == null) return;

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                // HVT001 uses the same alarm format as standard Jimi alarm
                LocationData loc = packetDecoder.decodeJimiAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                locationService.saveAndBroadcast(loc);

                com.webinnovation.motolink.domain.enums.AlarmType type = mapJimiAlarmCode(loc.getAlarmCode());
                if (type == null) return;

                com.webinnovation.motolink.domain.enums.AlarmSeverity sev = getAlarmSeverity(type);
                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode(), "protocol", "jimi-hvt001"));
            } catch (Exception e) {
                log.error("Jimi HVT001 alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        });
    }

    /**
     * Jimi LBS alarm packet (0x19). Cell tower only positioning with alarm.
     */
    private void handleJimiLbsAlarm(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_LBS_ALARM, serial));

        Boolean registered = ctx.channel().attr(ChannelKeys.REGISTERED_KEY).get();
        if (registered == null || !registered) return;
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        UUID orgId = ctx.channel().attr(ChannelKeys.ORG_ID_KEY).get();
        if (imei == null || orgId == null) return;

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                LocationData loc = packetDecoder.decodeJimiLbsAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                // LBS-only alarm has no GPS coordinates, only cell tower info
                // Save with valid=false to indicate approximate position
                loc.setValid(false);
                locationService.saveAndBroadcast(loc);

                com.webinnovation.motolink.domain.enums.AlarmType type = mapJimiAlarmCode(loc.getAlarmCode());
                if (type == null) return;

                com.webinnovation.motolink.domain.enums.AlarmSeverity sev = getAlarmSeverity(type);
                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode(), "protocol", "jimi-lbs"));
            } catch (Exception e) {
                log.error("Jimi LBS alarm decode failed for imei={}: {}", imei, e.getMessage(), e);
            }
        });
    }

    /**
     * Jimi LBS extension (0x28). Extended cell tower information.
     * ACK and log only — no location data to persist.
     */
    private void handleJimiLbsExtension(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_LBS_EXTENSION, serial));
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        log.debug("Jimi LBS extension received for imei={}, {} bytes", imei, content.readableBytes());
    }

    /**
     * Jimi WiFi positioning (0x2C). Contains nearby WiFi AP info for positioning.
     * ACK and log only for now — could be used for indoor positioning in future.
     */
    private void handleJimiWifi(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_WIFI, serial));
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        log.debug("Jimi WiFi positioning received for imei={}, {} bytes", imei, content.readableBytes());
    }

    /**
     * Jimi time calibration request (0x8A). Device requests current server time.
     */
    private void handleJimiTimeCalibration(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        // Build time calibration response with current UTC time
        ctx.writeAndFlush(packetEncoder.buildTimeCalibrationResponse(serial));
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();
        log.debug("Jimi time calibration request from imei={}", imei);
    }

    /**
     * Jimi info transmission (0x94). Device uploads firmware version and other info.
     * ACK and log the info.
     */
    private void handleJimiInfoTransmission(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_INFO_TRANSMISSION, serial));
        String imei = ctx.channel().attr(ChannelKeys.IMEI_KEY).get();

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        ingestExecutor.execute(() -> {
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                String info = packetDecoder.decodeJimiInfoTransmission(detached);
                log.info("Jimi device info for imei={}: {}", imei, info);
            } catch (Exception e) {
                log.warn("Jimi info transmission decode failed for imei={}: {}", imei, e.getMessage());
            }
        });
    }

    /**
     * Map Jimi IoT alarm codes to domain alarm types.
     * Jimi Protocol V3.2 alarm codes differ from GT06.
     */
    private com.webinnovation.motolink.domain.enums.AlarmType mapJimiAlarmCode(int alarmCode) {
        return switch (alarmCode) {
            case 0x01 -> com.webinnovation.motolink.domain.enums.AlarmType.SOS;
            case 0x02 -> com.webinnovation.motolink.domain.enums.AlarmType.POWER_CUT;
            case 0x03 -> com.webinnovation.motolink.domain.enums.AlarmType.SHOCK;         // Vibration
            case 0x04 -> com.webinnovation.motolink.domain.enums.AlarmType.GEOFENCE_ENTER;
            case 0x05 -> com.webinnovation.motolink.domain.enums.AlarmType.GEOFENCE_EXIT;
            case 0x06 -> com.webinnovation.motolink.domain.enums.AlarmType.OVERSPEED;
            case 0x09 -> com.webinnovation.motolink.domain.enums.AlarmType.LOW_BATTERY;
            case 0x0A -> com.webinnovation.motolink.domain.enums.AlarmType.EXTERNAL_LOW_VOLTAGE;
            case 0x0B -> com.webinnovation.motolink.domain.enums.AlarmType.REMOVE;        // GPS antenna cut
            case 0x0D -> com.webinnovation.motolink.domain.enums.AlarmType.ACC_ON;
            case 0x0E -> com.webinnovation.motolink.domain.enums.AlarmType.ACC_OFF;
            case 0x0F -> com.webinnovation.motolink.domain.enums.AlarmType.DOOR;
            case 0x10 -> com.webinnovation.motolink.domain.enums.AlarmType.DOOR;          // Door 1
            case 0x11 -> com.webinnovation.motolink.domain.enums.AlarmType.DOOR;          // Door 2
            case 0x29 -> com.webinnovation.motolink.domain.enums.AlarmType.URGENT_ACCELERATION;
            case 0x30 -> com.webinnovation.motolink.domain.enums.AlarmType.URGENT_DECELERATION;
            case 0x2A -> com.webinnovation.motolink.domain.enums.AlarmType.COLLISION;     // Sharp turn
            case 0x2B -> com.webinnovation.motolink.domain.enums.AlarmType.COLLISION;     // Collision
            default -> null;
        };
    }

    /**
     * Get alarm severity based on alarm type.
     */
    private com.webinnovation.motolink.domain.enums.AlarmSeverity getAlarmSeverity(
            com.webinnovation.motolink.domain.enums.AlarmType type) {
        return switch (type) {
            case SOS, POWER_CUT, COLLISION, REMOVE ->
                com.webinnovation.motolink.domain.enums.AlarmSeverity.CRITICAL;
            case SHOCK, OVERSPEED, URGENT_ACCELERATION, URGENT_DECELERATION,
                 GEOFENCE_EXIT, GEOFENCE_ENTER, EXTERNAL_LOW_VOLTAGE, LOW_BATTERY ->
                com.webinnovation.motolink.domain.enums.AlarmSeverity.WARNING;
            default -> com.webinnovation.motolink.domain.enums.AlarmSeverity.INFO;
        };
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        log.warn("Channel exception (id={}): {}", ctx.channel().id(), cause.getMessage());
        ctx.close();
    }
}
