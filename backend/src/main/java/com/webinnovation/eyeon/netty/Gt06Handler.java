package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.protocol.PacketDecoder;
import com.webinnovation.eyeon.protocol.PacketEncoder;
import com.webinnovation.eyeon.protocol.PacketType;
import com.webinnovation.eyeon.service.DeviceService;
import com.webinnovation.eyeon.service.LocationService;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufUtil;
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
    private final com.webinnovation.eyeon.service.AlarmService alarmService;
    private final com.webinnovation.eyeon.service.DeviceCommandService deviceCommandService;
    private final com.webinnovation.eyeon.service.NetworkLocationService networkLocationService;
    private final AsyncTaskExecutor ingestExecutor;

    public Gt06Handler(PacketDecoder packetDecoder,
                       PacketEncoder packetEncoder,
                       DeviceService deviceService,
                       LocationService locationService,
                       com.webinnovation.eyeon.service.AlarmService alarmService,
                       com.webinnovation.eyeon.service.DeviceCommandService deviceCommandService,
                       com.webinnovation.eyeon.service.NetworkLocationService networkLocationService,
                       @Qualifier("ingestExecutor") AsyncTaskExecutor ingestExecutor) {
        this.packetDecoder = packetDecoder;
        this.packetEncoder = packetEncoder;
        this.deviceService = deviceService;
        this.locationService = locationService;
        this.alarmService = alarmService;
        this.deviceCommandService = deviceCommandService;
        this.networkLocationService = networkLocationService;
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

            // Heartbeat: GT06 uses 0x13, Jimi EG02/EG03 uses 0x23, battery-powered personal
            // trackers use 0x36 (the same status block followed by extension modules)
            case PacketType.HEARTBEAT -> handleHeartbeat(ctx, serial, content);
            case PacketType.JIMI_HEARTBEAT, PacketType.JIMI_HEARTBEAT_EXT ->
                    handleJimiHeartbeat(ctx, proto, serial, content);

            // Alarms: GT06 uses 0x16, Jimi uses 0x26/0x27/0x19
            case PacketType.ALARM -> handleAlarm(ctx, serial, content);
            case PacketType.JIMI_ALARM -> handleJimiAlarm(ctx, serial, content);
            case PacketType.JIMI_ALARM_HVT001 -> handleJimiAlarmHvt001(ctx, serial, content);
            case PacketType.JIMI_LBS_ALARM -> handleJimiLbsAlarm(ctx, serial, content);

            // Jimi IoT specific packets
            case PacketType.JIMI_SCAN_ALARM_4G -> handleScanAlarm(ctx, proto, serial, content);
            case PacketType.JIMI_GPS_ALARM_4G -> handleGpsAlarm4G(ctx, serial, content);
            case PacketType.JIMI_LBS_ALARM_4G -> handleLbsAlarm4G(ctx, serial, content);
            case PacketType.JIMI_LBS_EXTENSION, PacketType.JIMI_WIFI,
                 PacketType.JIMI_LBS_4G, PacketType.JIMI_WIFI_4G -> handleNetworkScan(ctx, proto, serial, content);
            case PacketType.JIMI_TIME_CALIBRATION -> handleJimiTimeCalibration(ctx, serial, content);
            case PacketType.JIMI_INFO_TRANSMISSION -> handleJimiInfoTransmission(ctx, serial, content);

            case PacketType.COMMAND_REPLY -> handleCommandReply(content);
            case PacketType.COMMAND_REPLY_JIMI -> handleJimiCommandReply(content);
            default -> {
                ctx.writeAndFlush(packetEncoder.buildAck(proto, serial));
                noteUnstored(ctx, proto, content);
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

        // Packets that arrive while the lookup below is running wait in this gate instead of
        // being dropped (a tracker may send its SOS milliseconds after logging in).
        LoginGate fresh = new LoginGate();
        LoginGate existing = ctx.channel().attr(ChannelKeys.LOGIN_GATE_KEY).setIfAbsent(fresh);
        LoginGate gate = existing != null ? existing : fresh;

        // Lookup off the event loop. The gate is resolved exactly once, in `finally`, so even an
        // unexpected failure (database briefly unreachable) never leaves packets queued forever.
        ingestExecutor.execute(() -> {
            LoginGate.Session session = null;
            try {
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
                session = new LoginGate.Session(imei, d.orgId());
                deviceCommandService.registerChannel(imei, ctx.channel());
                deviceService.markOnline(imei);
            } catch (Exception e) {
                log.error("Login lookup failed for IMEI {}: {}", imei, e.getMessage(), e);
            } finally {
                int n = gate.resolve(session, ingestExecutor);
                if (n > 0) {
                    if (session != null) {
                        log.info("Released {} packets from IMEI {} that arrived during login", n, imei);
                    } else {
                        log.warn("Discarded {} packets from IMEI {} whose login could not be completed", n, imei);
                    }
                }
            }
        });
    }

    /**
     * A packet that is acknowledged but not stored still proves the tracker is connected, so it
     * refreshes last-seen; otherwise a tracker whose packets we do not understand yet is shown
     * OFFLINE five minutes after login while it is talking to us. The payload is logged because
     * an unknown type from a new tracker model is how its location packets get identified.
     */
    private void noteUnstored(ChannelHandlerContext ctx, int proto, ByteBuf content) {
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }
        String hex = ByteBufUtil.hexDump(content, content.readerIndex(), Math.min(content.readableBytes(), 256));
        gate.submit(session -> {
            log.info("Packet 0x{} from imei={} acknowledged but not stored, content={}",
                    Integer.toHexString(proto), session.imei(), hex);
            try {
                deviceService.markOnline(session.imei());
            } catch (Exception e) {
                log.warn("Presence refresh failed for imei={}: {}", session.imei(), e.getMessage());
            }
        }, ingestExecutor);
    }

    /** The connection's login gate; null when no login packet has been seen on this channel. */
    private static LoginGate gateOf(ChannelHandlerContext ctx) {
        return ctx.channel().attr(ChannelKeys.LOGIN_GATE_KEY).get();
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

        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        // Snapshot the bytes before crossing threads — content slice is event-loop-bound
        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
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
        }, ingestExecutor);
    }

    private void handleAlarm(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        // ACK first — alarm packets follow the standard ACK protocol
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.ALARM, serial));

        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                LocationData loc = packetDecoder.decodeAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                // Persist as a location row + run geofence/trip evaluation
                locationService.saveAndBroadcast(loc);

                // Then translate the alarm code into a domain alarm (GT06 Protocol V3.0 codes)
                com.webinnovation.eyeon.domain.enums.AlarmType type =
                        switch (loc.getAlarmCode()) {
                            case 0x01 -> com.webinnovation.eyeon.domain.enums.AlarmType.SOS;
                            case 0x02 -> com.webinnovation.eyeon.domain.enums.AlarmType.POWER_CUT;
                            case 0x03 -> com.webinnovation.eyeon.domain.enums.AlarmType.SHOCK;
                            case 0x06 -> com.webinnovation.eyeon.domain.enums.AlarmType.OVERSPEED;
                            case 0x09 -> com.webinnovation.eyeon.domain.enums.AlarmType.GEOFENCE_EXIT;
                            case 0x0E -> com.webinnovation.eyeon.domain.enums.AlarmType.EXTERNAL_LOW_VOLTAGE;
                            case 0x13 -> com.webinnovation.eyeon.domain.enums.AlarmType.REMOVE;
                            case 0x14 -> com.webinnovation.eyeon.domain.enums.AlarmType.DOOR;
                            case 0x19 -> com.webinnovation.eyeon.domain.enums.AlarmType.LOW_BATTERY;
                            case 0xF0 -> com.webinnovation.eyeon.domain.enums.AlarmType.URGENT_ACCELERATION;
                            case 0xF1 -> com.webinnovation.eyeon.domain.enums.AlarmType.URGENT_DECELERATION;
                            case 0xF2 -> com.webinnovation.eyeon.domain.enums.AlarmType.COLLISION;
                            case 0xFE -> com.webinnovation.eyeon.domain.enums.AlarmType.ACC_ON;
                            case 0xFF -> com.webinnovation.eyeon.domain.enums.AlarmType.ACC_OFF;
                            default -> null;
                        };
                if (type == null) return;

                com.webinnovation.eyeon.domain.enums.AlarmSeverity sev =
                        switch (type) {
                            case SOS, POWER_CUT, COLLISION, REMOVE ->
                                com.webinnovation.eyeon.domain.enums.AlarmSeverity.CRITICAL;
                            case SHOCK, OVERSPEED, URGENT_ACCELERATION, URGENT_DECELERATION,
                                 GEOFENCE_EXIT, EXTERNAL_LOW_VOLTAGE, LOW_BATTERY ->
                                com.webinnovation.eyeon.domain.enums.AlarmSeverity.WARNING;
                            default -> com.webinnovation.eyeon.domain.enums.AlarmSeverity.INFO;
                        };

                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode()));
            } catch (Exception e) {
                log.error("Alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /** GT06 reply to a 0x80 command: [cmd-len:1][server-flag:4][text: cmd-len - 4][language:2]. */
    private void handleCommandReply(ByteBuf content) {
        if (content.readableBytes() < 5) return;
        int len = content.readUnsignedByte() - 4;
        int serverFlag = content.readInt();
        len = Math.max(0, Math.min(len, content.readableBytes()));
        String reply = content.readCharSequence(len, java.nio.charset.StandardCharsets.US_ASCII).toString();
        deviceCommandService.completeReply(serverFlag, reply);
    }

    /** Jimi reply (0x21, extended frame): [server-flag:4][encoding:1, 1 = ASCII, 2 = UTF-16BE][text]. */
    private void handleJimiCommandReply(ByteBuf content) {
        if (content.readableBytes() < 5) return;
        int serverFlag = content.readInt();
        java.nio.charset.Charset charset = content.readUnsignedByte() == 2
                ? java.nio.charset.StandardCharsets.UTF_16BE : java.nio.charset.StandardCharsets.US_ASCII;
        String reply = content.readCharSequence(content.readableBytes(), charset).toString();
        deviceCommandService.completeReply(serverFlag, reply);
    }

    private void handleHeartbeat(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.HEARTBEAT, serial));
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        // Snapshot the status block off the event loop. Older firmware sends a
        // bare heartbeat (no status); decoder returns null in that case.
        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                PacketDecoder.HeartbeatStatus status = packetDecoder.decodeHeartbeat(detached);
                if (status != null) {
                    deviceService.applyHeartbeatStatus(imei, status.gsmSignal(),
                            PacketDecoder.batteryPercentOfLevel(status.voltageLevel()), null);
                } else {
                    deviceService.markOnline(imei);
                }
            } catch (Exception e) {
                log.warn("Heartbeat status decode failed for imei={}: {}", imei, e.getMessage());
                deviceService.markOnline(imei);
            }
        }, ingestExecutor);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Jimi IoT Protocol V3.2 Handlers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Jimi heartbeat: 0x23 (EG02/EG03) or 0x36 (battery-powered personal trackers). Both start
     * with the GT06 status block; 0x36 appends extension modules, which are ignored here.
     * The ACK must echo the protocol number the tracker used.
     */
    private void handleJimiHeartbeat(ChannelHandlerContext ctx, int proto, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(proto, serial));
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                PacketDecoder.HeartbeatStatus status = packetDecoder.decodeHeartbeat(detached, proto == PacketType.JIMI_HEARTBEAT_EXT);
                if (status != null) {
                    deviceService.applyHeartbeatStatus(imei, status.gsmSignal(), status.batteryPercent(), status.batteryMv());
                } else {
                    deviceService.markOnline(imei);
                }
            } catch (Exception e) {
                log.warn("Jimi heartbeat decode failed for imei={}: {}", imei, e.getMessage());
                deviceService.markOnline(imei);
            }
        }, ingestExecutor);
    }

    /**
     * Jimi alarm packet (0x26). Similar to GT06 alarm but with Jimi-specific alarm codes.
     */
    private void handleJimiAlarm(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_ALARM, serial));

        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                LocationData loc = packetDecoder.decodeJimiAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                locationService.saveAndBroadcast(loc);

                // Map Jimi alarm codes to domain alarm types
                com.webinnovation.eyeon.domain.enums.AlarmType type = mapJimiAlarmCode(loc.getAlarmCode());
                if (type == null) return;

                com.webinnovation.eyeon.domain.enums.AlarmSeverity sev = getAlarmSeverity(type);
                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode(), "protocol", "jimi"));
            } catch (Exception e) {
                log.error("Jimi alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /**
     * Jimi HVT001 alarm packet (0x27). Specialized video tracker alarm.
     */
    private void handleJimiAlarmHvt001(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_ALARM_HVT001, serial));

        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                // HVT001 uses the same alarm format as standard Jimi alarm
                LocationData loc = packetDecoder.decodeJimiAlarm(detached);
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                locationService.saveAndBroadcast(loc);

                com.webinnovation.eyeon.domain.enums.AlarmType type = mapJimiAlarmCode(loc.getAlarmCode());
                if (type == null) return;

                com.webinnovation.eyeon.domain.enums.AlarmSeverity sev = getAlarmSeverity(type);
                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode(), "protocol", "jimi-hvt001"));
            } catch (Exception e) {
                log.error("Jimi HVT001 alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /**
     * Jimi LBS alarm packet (0x19). Cell tower only positioning with alarm.
     */
    private void handleJimiLbsAlarm(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_LBS_ALARM, serial));

        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
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

                com.webinnovation.eyeon.domain.enums.AlarmType type = mapJimiAlarmCode(loc.getAlarmCode());
                if (type == null) return;

                com.webinnovation.eyeon.domain.enums.AlarmSeverity sev = getAlarmSeverity(type);
                alarmService.raise(orgId, imei, type, sev,
                        loc.getTimestamp(), loc.getLatitude(), loc.getLongitude(),
                        java.util.Map.of("source", "device", "alarmCode", loc.getAlarmCode(), "protocol", "jimi-lbs"));
            } catch (Exception e) {
                log.error("Jimi LBS alarm decode failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /**
     * Jimi network scan: cell towers (0xA1 on 4G, 0x28 on 2G/3G) or cell towers + Wi-Fi access
     * points (0xA2 / 0x2C). A personal tracker sends these instead of location packets while it
     * has no GPS fix (indoors). NetworkLocationService turns the scan into a position.
     */
    private void handleNetworkScan(ChannelHandlerContext ctx, int proto, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(proto, serial));
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            try {
                boolean wifi = proto == PacketType.JIMI_WIFI_4G || proto == PacketType.JIMI_WIFI;
                boolean lte = proto == PacketType.JIMI_WIFI_4G || proto == PacketType.JIMI_LBS_4G;
                var scan = packetDecoder.decodeNetworkScan(io.netty.buffer.Unpooled.wrappedBuffer(raw), wifi, lte);
                networkLocationService.onScan(imei, session.orgId(), proto, scan, raw);
            } catch (Exception e) {
                log.error("Network scan decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /**
     * Jimi 0xA9: an alarm raised without a GPS fix. Indoors this is how a personal tracker
     * reports SOS and low battery, so it must never be dropped. The scan is resolved to a
     * position like any other; if that fails the alarm is placed at the last known position.
     */
    private void handleScanAlarm(ChannelHandlerContext ctx, int proto, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(proto, serial));
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                PacketDecoder.ScanAlarm alarm = packetDecoder.decodeScanAlarm(io.netty.buffer.Unpooled.wrappedBuffer(raw));
                Optional<LocationData> where = networkLocationService.onScan(imei, orgId, proto, alarm.scan(), raw, true);

                if (gpsBlindAreaEvent(imei, alarm.alarmCode())) return;
                com.webinnovation.eyeon.domain.enums.AlarmType type = jimiAlarmType(alarm.alarmCode());
                if (type == null) {
                    log.warn("Scan alarm from imei={} with unknown code 0x{}: not raised, content={}", imei,
                            Integer.toHexString(alarm.alarmCode()), ByteBufUtil.hexDump(raw));
                    return;
                }

                double lat = 0, lng = 0;
                if (where.isPresent()) {
                    lat = where.get().getLatitude();
                    lng = where.get().getLongitude();
                } else {
                    Device d = deviceService.findByImei(imei).orElse(null);
                    if (d != null && d.lastLatitude() != null && d.lastLongitude() != null) {
                        lat = d.lastLatitude();
                        lng = d.lastLongitude();
                    }
                }
                alarmService.raise(orgId, imei, type, getAlarmSeverity(type), alarm.scan().ts(), lat, lng,
                        java.util.Map.of("source", "device", "alarmCode", alarm.alarmCode(),
                                "protocol", "jimi-scan", "positionResolved", where.isPresent()));
            } catch (Exception e) {
                log.error("Scan alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /**
     * The GT06 alarm codes the Jimi 4G alarm packets (0xA3, 0xA5, 0xA9) use. 0x0A / 0x0B are not
     * alarms (see {@link #gpsBlindAreaEvent}); unknown codes return null and are logged.
     */
    static com.webinnovation.eyeon.domain.enums.AlarmType jimiAlarmType(int code) {
        return switch (code) {
            case 0x01 -> com.webinnovation.eyeon.domain.enums.AlarmType.SOS;
            case 0x02 -> com.webinnovation.eyeon.domain.enums.AlarmType.POWER_CUT;
            case 0x03 -> com.webinnovation.eyeon.domain.enums.AlarmType.SHOCK;
            case 0x06 -> com.webinnovation.eyeon.domain.enums.AlarmType.OVERSPEED;
            case 0x13 -> com.webinnovation.eyeon.domain.enums.AlarmType.REMOVE;
            case 0x19 -> com.webinnovation.eyeon.domain.enums.AlarmType.LOW_BATTERY;
            default -> null;
        };
    }

    /**
     * Codes 0x0A / 0x0B are the tracker saying it lost / regained GPS ("enter / leave GPS blind
     * area"): seen on production when the wearer boarded and left the metro, and on going indoors.
     * Not alarms for a parent, but they tell the network-position code that the person may be
     * travelling without GPS. @return true when the code was one of these
     */
    private boolean gpsBlindAreaEvent(String imei, int code) {
        if (code == 0x0A) {
            networkLocationService.gpsLost(imei);
            log.info("Tracker imei={} lost GPS (blind-area code 0x0A)", imei);
            return true;
        }
        if (code == 0x0B) {
            networkLocationService.gpsBack(imei);
            log.info("Tracker imei={} has GPS again (blind-area code 0x0B)", imei);
            return true;
        }
        return false;
    }

    /**
     * Jimi 0xA3: an alarm with a GPS position (4G). The production PL601 sends SOS this way when it
     * has a fix; until 2026-10-04 these were acknowledged and dropped, so SOS presses on 2026-10-03
     * at 11:21 and 20:29 Dhaka time never raised an alarm. Test: Gt06HandlerJimiAlarmTest.
     */
    private void handleGpsAlarm4G(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_GPS_ALARM_4G, serial));
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }
        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);
        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                PacketDecoder.Alarm4G a = packetDecoder.decodeGpsAlarm4G(io.netty.buffer.Unpooled.wrappedBuffer(raw));
                LocationData loc = a.location();
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setRawPayload(raw);
                locationService.saveAndBroadcast(loc);
                if (gpsBlindAreaEvent(imei, a.alarmCode())) return;
                com.webinnovation.eyeon.domain.enums.AlarmType type = jimiAlarmType(a.alarmCode());
                if (type == null) {
                    log.warn("GPS alarm from imei={} with unknown code 0x{}: not raised, content={}", imei,
                            Integer.toHexString(a.alarmCode()), ByteBufUtil.hexDump(raw));
                    return;
                }
                double lat = loc.getLatitude(), lng = loc.getLongitude();
                if (!loc.isValid()) {
                    Device d = deviceService.findByImei(imei).orElse(null);
                    if (d != null && d.lastLatitude() != null && d.lastLongitude() != null) {
                        lat = d.lastLatitude();
                        lng = d.lastLongitude();
                    }
                }
                alarmService.raise(orgId, imei, type, getAlarmSeverity(type), loc.getTimestamp(), lat, lng,
                        java.util.Map.of("source", "device", "alarmCode", a.alarmCode(), "protocol", "jimi-gps-4g",
                                "positionResolved", loc.isValid()));
            } catch (Exception e) {
                log.error("GPS alarm decode/persist failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
    }

    /** Jimi 0xA5: an alarm with only the serving cell and no date; raised at the last known position. */
    private void handleLbsAlarm4G(ChannelHandlerContext ctx, int serial, ByteBuf content) {
        ctx.writeAndFlush(packetEncoder.buildAck(PacketType.JIMI_LBS_ALARM_4G, serial));
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }
        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);
        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                int code = packetDecoder.decodeLbsAlarm4GCode(io.netty.buffer.Unpooled.wrappedBuffer(raw));
                deviceService.markOnline(imei);
                if (gpsBlindAreaEvent(imei, code)) return;
                com.webinnovation.eyeon.domain.enums.AlarmType type = jimiAlarmType(code);
                if (type == null) {
                    log.warn("Cell alarm from imei={} with unknown code 0x{}: not raised, content={}", imei,
                            Integer.toHexString(code), ByteBufUtil.hexDump(raw));
                    return;
                }
                double lat = 0, lng = 0;
                Device d = deviceService.findByImei(imei).orElse(null);
                if (d != null && d.lastLatitude() != null && d.lastLongitude() != null) {
                    lat = d.lastLatitude();
                    lng = d.lastLongitude();
                }
                alarmService.raise(orgId, imei, type, getAlarmSeverity(type), java.time.Instant.now(), lat, lng,
                        java.util.Map.of("source", "device", "alarmCode", code, "protocol", "jimi-lbs-4g",
                                "positionResolved", false));
            } catch (Exception e) {
                log.error("Cell alarm handling failed for imei={}: {}", imei, e.getMessage(), e);
            }
        }, ingestExecutor);
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
        LoginGate gate = gateOf(ctx);
        if (gate == null) {
            log.debug("Dropping packet on channel id={} that never logged in", ctx.channel().id());
            return;
        }

        byte[] raw = new byte[content.readableBytes()];
        content.getBytes(content.readerIndex(), raw);

        gate.submit(session -> {
            String imei = session.imei();
            UUID orgId = session.orgId();
            try {
                io.netty.buffer.ByteBuf detached = io.netty.buffer.Unpooled.wrappedBuffer(raw);
                String info = packetDecoder.decodeJimiInfoTransmission(detached);
                log.info("Jimi device info for imei={}: {}", imei, info);
            } catch (Exception e) {
                log.warn("Jimi info transmission decode failed for imei={}: {}", imei, e.getMessage());
            }
        }, ingestExecutor);
    }

    /**
     * Map Jimi IoT alarm codes to domain alarm types.
     * Jimi Protocol V3.2 alarm codes differ from GT06.
     */
    private com.webinnovation.eyeon.domain.enums.AlarmType mapJimiAlarmCode(int alarmCode) {
        return switch (alarmCode) {
            case 0x01 -> com.webinnovation.eyeon.domain.enums.AlarmType.SOS;
            case 0x02 -> com.webinnovation.eyeon.domain.enums.AlarmType.POWER_CUT;
            case 0x03 -> com.webinnovation.eyeon.domain.enums.AlarmType.SHOCK;         // Vibration
            case 0x04 -> com.webinnovation.eyeon.domain.enums.AlarmType.GEOFENCE_ENTER;
            case 0x05 -> com.webinnovation.eyeon.domain.enums.AlarmType.GEOFENCE_EXIT;
            case 0x06 -> com.webinnovation.eyeon.domain.enums.AlarmType.OVERSPEED;
            case 0x09 -> com.webinnovation.eyeon.domain.enums.AlarmType.LOW_BATTERY;
            case 0x0A -> com.webinnovation.eyeon.domain.enums.AlarmType.EXTERNAL_LOW_VOLTAGE;
            case 0x0B -> com.webinnovation.eyeon.domain.enums.AlarmType.REMOVE;        // GPS antenna cut
            case 0x0D -> com.webinnovation.eyeon.domain.enums.AlarmType.ACC_ON;
            case 0x0E -> com.webinnovation.eyeon.domain.enums.AlarmType.ACC_OFF;
            case 0x0F -> com.webinnovation.eyeon.domain.enums.AlarmType.DOOR;
            case 0x10 -> com.webinnovation.eyeon.domain.enums.AlarmType.DOOR;          // Door 1
            case 0x11 -> com.webinnovation.eyeon.domain.enums.AlarmType.DOOR;          // Door 2
            case 0x29 -> com.webinnovation.eyeon.domain.enums.AlarmType.URGENT_ACCELERATION;
            case 0x30 -> com.webinnovation.eyeon.domain.enums.AlarmType.URGENT_DECELERATION;
            case 0x2A -> com.webinnovation.eyeon.domain.enums.AlarmType.COLLISION;     // Sharp turn
            case 0x2B -> com.webinnovation.eyeon.domain.enums.AlarmType.COLLISION;     // Collision
            default -> null;
        };
    }

    /**
     * Get alarm severity based on alarm type.
     */
    private com.webinnovation.eyeon.domain.enums.AlarmSeverity getAlarmSeverity(
            com.webinnovation.eyeon.domain.enums.AlarmType type) {
        return switch (type) {
            case SOS, POWER_CUT, COLLISION, REMOVE ->
                com.webinnovation.eyeon.domain.enums.AlarmSeverity.CRITICAL;
            case SHOCK, OVERSPEED, URGENT_ACCELERATION, URGENT_DECELERATION,
                 GEOFENCE_EXIT, EXTERNAL_LOW_VOLTAGE, LOW_BATTERY ->
                com.webinnovation.eyeon.domain.enums.AlarmSeverity.WARNING;
            default -> com.webinnovation.eyeon.domain.enums.AlarmSeverity.INFO;
        };
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        log.warn("Channel exception (id={}): {}", ctx.channel().id(), cause.getMessage());
        ctx.close();
    }
}
