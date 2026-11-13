package com.webinnovation.eyeon.netty;

import com.webinnovation.eyeon.domain.Device;
import com.webinnovation.eyeon.domain.enums.AlarmSeverity;
import com.webinnovation.eyeon.domain.enums.AlarmType;
import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.protocol.PacketType;
import com.webinnovation.eyeon.protocol.WatchFrame;
import com.webinnovation.eyeon.protocol.WatchReport;
import com.webinnovation.eyeon.service.AlarmService;
import com.webinnovation.eyeon.service.DeviceService;
import com.webinnovation.eyeon.service.LocationService;
import com.webinnovation.eyeon.service.NetworkLocationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Makes a smart watch a device in EyeOn. {@link WatchRelay} still passes the connection to the
 * watch server, which answers the watch; this class reads a copy of what the watch sends and
 * feeds it into the path trackers use, so the watch is in the device list and on the map:
 *
 * <ul>
 *   <li>first frame - the watch id is resolved to a device, auto-registered like a new tracker
 *       when unknown ({@link DeviceService#findByWatchId});</li>
 *   <li>{@code LK} heartbeat - presence and battery;</li>
 *   <li>{@code UD*} report - with a GPS fix a location; without one the cells and Wi-Fi it
 *       heard go to {@link NetworkLocationService}, as a tracker's indoor scans do;</li>
 *   <li>{@code AL*} - the same, plus an SOS / low-battery alarm;</li>
 *   <li>anything else - presence only.</li>
 * </ul>
 *
 * Nothing here writes to the watch, and a failure here never disturbs the relay.
 */
@Component
@Slf4j
public class WatchIngest {

    /** Frames waiting for the database; a watch sends a handful per minute. */
    static final int MAX_QUEUED = 256;
    /** After a failed device lookup (database briefly away) the next frames wait this long. */
    static final Duration LOOKUP_RETRY = Duration.ofSeconds(10);
    /** A live report cannot be from the future: beyond this the watch's clock is not UTC or not set. */
    static final Duration CLOCK_AHEAD_TOLERANCE = Duration.ofMinutes(5);
    private static final Pattern WATCH_ID = Pattern.compile("\\d{10}");

    private final DeviceService deviceService;
    private final LocationService locationService;
    private final AlarmService alarmService;
    private final NetworkLocationService networkLocationService;
    private final AsyncTaskExecutor ingestExecutor;

    public WatchIngest(DeviceService deviceService,
                       LocationService locationService,
                       AlarmService alarmService,
                       NetworkLocationService networkLocationService,
                       @Qualifier("ingestExecutor") AsyncTaskExecutor ingestExecutor) {
        this.deviceService = deviceService;
        this.locationService = locationService;
        this.alarmService = alarmService;
        this.networkLocationService = networkLocationService;
        this.ingestExecutor = ingestExecutor;
    }

    /** One per watch connection. */
    public Connection open(String remote) {
        return new Connection(remote);
    }

    public final class Connection {

        private final String remote;
        private final WatchFrame.Reader reader = new WatchFrame.Reader();

        /** Frames are handled one at a time, in arrival order, off the event loop. */
        private final ArrayDeque<WatchFrame> queue = new ArrayDeque<>();
        private boolean draining;
        private int dropped;

        // Touched only by the draining task.
        private String watchId;
        private LoginGate.Session session;
        private Instant retryLookupAt = Instant.MIN;

        private Connection(String remote) {
            this.remote = remote;
        }

        /** Called on the event loop with a copy of the bytes the watch sent. */
        public void onBytes(byte[] data) {
            for (WatchFrame frame : reader.feed(data)) {
                synchronized (queue) {
                    if (queue.size() >= MAX_QUEUED) {
                        if (dropped++ == 0) {
                            log.warn("Watch {} sends faster than it is stored; dropping frames", remote);
                        }
                        continue;
                    }
                    queue.add(frame);
                    if (draining) continue;
                    draining = true;
                }
                ingestExecutor.execute(this::drain);
            }
        }

        private void drain() {
            while (true) {
                WatchFrame frame;
                synchronized (queue) {
                    frame = queue.poll();
                    if (frame == null) {
                        draining = false;
                        return;
                    }
                }
                try {
                    handle(frame);
                } catch (Exception e) {
                    log.error("Watch frame {} from id={} failed: {}", frame.command(), frame.deviceId(), e.getMessage(), e);
                }
            }
        }

        private void handle(WatchFrame frame) {
            if (session == null && !identify(frame.deviceId())) {
                return;
            }
            if (!frame.deviceId().equals(watchId)) {
                log.warn("Watch connection {} logged in as id={} now sends id={}; frame ignored",
                        remote, watchId, frame.deviceId());
                return;
            }
            String imei = session.imei();
            String command = frame.command();
            if (command.equals("LK")) {
                heartbeat(imei, frame.args());
            } else if (command.equals("UD") || command.equals("UD2") || command.startsWith("UD_")) {
                report(frame, false);
            } else if (command.equals("AL") || command.startsWith("AL_")) {
                report(frame, true);
            } else {
                deviceService.markOnline(imei);
            }
        }

        /** Resolves the watch id to a device once per connection; false while that is not possible. */
        private boolean identify(String id) {
            if (!WATCH_ID.matcher(id).matches()) {
                log.debug("Ignoring watch frame with id '{}' from {}: not a 10-digit watch id", id, remote);
                return false;
            }
            Instant now = Instant.now();
            if (now.isBefore(retryLookupAt)) {
                return false;
            }
            try {
                Device device = deviceService.findByWatchId(id).orElse(null);
                if (device == null) {
                    log.info("New watch id={} from {} - auto-registering", id, remote);
                    device = deviceService.autoRegister(id);
                }
                watchId = id;
                session = new LoginGate.Session(device.imei(), device.orgId());
                deviceService.markOnline(device.imei());
                log.info("Watch id={} from {} is device imei={} org={}", id, remote, device.imei(), device.orgId());
                return true;
            } catch (Exception e) {
                retryLookupAt = now.plus(LOOKUP_RETRY);
                log.error("Watch id={} from {} could not be resolved to a device: {}", id, remote, e.getMessage(), e);
                return false;
            }
        }

        /** {@code LK,steps,rolls,battery}; older firmware sends a bare {@code LK}. */
        private void heartbeat(String imei, String[] args) {
            Integer battery = null;
            if (args.length >= 3) {
                try {
                    battery = percent(Integer.parseInt(args[2].trim()));
                } catch (NumberFormatException ignored) {
                    // presence only
                }
            }
            if (battery != null) {
                deviceService.applyHeartbeatStatus(imei, null, battery, null);
            } else {
                deviceService.markOnline(imei);
            }
        }

        private void report(WatchFrame frame, boolean alarm) {
            String imei = session.imei();
            UUID orgId = session.orgId();
            WatchReport r;
            try {
                r = WatchReport.parse(frame.command(), frame.args());
            } catch (IllegalArgumentException e) {
                log.warn("Watch {} from imei={} not understood ({}): {}", frame.command(), imei, e.getMessage(),
                        abbreviate(frame.content()));
                deviceService.markOnline(imei);
                return;
            }
            Instant ts = plausible(r.ts());
            byte[] raw = frame.content().getBytes(StandardCharsets.ISO_8859_1);
            boolean raises = alarm && (r.sos() || r.lowBattery());

            Optional<LocationData> stored = Optional.empty();
            if (r.valid() && !(r.latitude() == 0 && r.longitude() == 0)) {
                LocationData loc = new LocationData();
                loc.setImei(imei);
                loc.setOrgId(orgId);
                loc.setProtocolNumber(PacketType.WATCH_3G);
                loc.setTimestamp(ts);
                loc.setLatitude(r.latitude());
                loc.setLongitude(r.longitude());
                loc.setSpeed((int) Math.round(r.speedKmh()));
                loc.setCourse((int) Math.round(r.course()) % 360);
                loc.setSatellites(r.satellites());
                loc.setValid(true);
                loc.setGsmSignal(r.gsm());
                loc.setMcc(r.mcc());
                loc.setMnc(r.mnc());
                if (!r.cells().isEmpty()) {
                    loc.setLac((int) r.cells().get(0).lac());
                    loc.setCellId(r.cells().get(0).cellId());
                }
                loc.setRawPayload(raw);
                log.info("Watch location: imei={} lat={} lng={} speed={} sats={} ts={}", imei, loc.getLatitude(),
                        loc.getLongitude(), loc.getSpeed(), loc.getSatellites(), ts);
                locationService.saveAndBroadcast(loc);
                stored = Optional.of(loc);
            } else if (r.hasScan()) {
                // No GPS fix: the coordinates in the report are the last fix repeated. Where the
                // watch is comes from the cells and access points it hears.
                stored = networkLocationService.onScan(imei, orgId, PacketType.WATCH_3G, r.scan(ts), raw, raises);
            }
            // Presence, battery and signal - also when no position came out of the report.
            deviceService.applyHeartbeatStatus(imei, r.gsm(), percent(r.battery()), null);

            if (!alarm) return;
            if (!raises) {
                log.info("Watch alarm from imei={} with status {} raises nothing here", imei, Long.toHexString(r.status()));
                return;
            }
            double lat = 0, lng = 0;
            if (stored.isPresent()) {
                lat = stored.get().getLatitude();
                lng = stored.get().getLongitude();
            } else {
                Device d = deviceService.findByImei(imei).orElse(null);
                if (d != null && d.lastLatitude() != null && d.lastLongitude() != null) {
                    lat = d.lastLatitude();
                    lng = d.lastLongitude();
                }
            }
            Map<String, Object> meta = Map.of("source", "device", "protocol", "watch",
                    "status", Long.toHexString(r.status()), "positionResolved", stored.isPresent());
            if (r.sos()) {
                alarmService.raise(orgId, imei, AlarmType.SOS, AlarmSeverity.CRITICAL, ts, lat, lng, meta);
            }
            if (r.lowBattery()) {
                alarmService.raise(orgId, imei, AlarmType.LOW_BATTERY, AlarmSeverity.WARNING, ts, lat, lng, meta);
            }
        }
    }

    /** The watch's own time, unless it is ahead of now (clock set to local time, or never set). */
    static Instant plausible(Instant watchTime) {
        Instant now = Instant.now();
        return watchTime.isAfter(now.plus(CLOCK_AHEAD_TOLERANCE)) ? now : watchTime;
    }

    private static int percent(int v) {
        return Math.max(0, Math.min(100, v));
    }

    private static String abbreviate(String s) {
        return s.length() <= 200 ? s : s.substring(0, 200) + "...";
    }
}
