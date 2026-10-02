package com.webinnovation.eyeon.service;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Every setting of a Jimi PL601 that the app lets a carer change: how to ask the tracker for it,
 * how to read its answer, how to check a wanted value and which commands write it. Pure.
 *
 * <p>A value is a small map (stored as JSON). The answer formats are the ones the production
 * tracker really sends - see {@code docs/PL601_SETTINGS.md}; they are not always what the manual
 * shows. Writing never trusts the "setting OK" answer: the service asks again afterwards and
 * compares ({@link #matches}).
 *
 * <p>Deliberately absent: server address, APN, factory reset, remote shutdown and the data /
 * positioning switches of the reporting mode (one wrong value takes a tracker off the network
 * for good), and the listening functions (covert audio).
 */
public enum TrackerSetting {

    /** Up to four numbers the tracker texts / calls when SOS is pressed. {@code {numbers:[..]}} */
    SOS_NUMBERS("SOS#") {
        private final Pattern slot = Pattern.compile("([1-4]):\\s*(\\+?\\d*)");

        @Override public Map<String, Object> parse(String reply) {
            int at = reply.indexOf("SOS Number:");
            if (at < 0) return null;
            List<String> numbers = new ArrayList<>();
            Matcher m = slot.matcher(reply.substring(at + "SOS Number:".length()));
            while (m.find()) if (!m.group(2).isEmpty()) numbers.add(m.group(2));
            return map("numbers", numbers);
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            Object raw = in.get("numbers");
            if (!(raw instanceof List<?> list)) throw bad("numbers must be a list");
            Set<String> numbers = new LinkedHashSet<>();
            for (Object o : list) {
                String n = String.valueOf(o).replaceAll("[\\s\\-()]", "");
                if (n.isEmpty()) continue;
                if (!n.matches("\\+?\\d{6,15}")) throw bad("'" + o + "' is not a phone number");
                numbers.add(n);
            }
            if (numbers.size() > 4) throw bad("The tracker stores at most 4 SOS numbers");
            return map("numbers", new ArrayList<>(numbers));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            List<String> out = new ArrayList<>();
            // Adding only fills free slots, so the list is cleared first.
            out.add("SOS,D,1,2,3,4#");
            List<?> numbers = (List<?>) v.get("numbers");
            if (!numbers.isEmpty()) {
                out.add("SOS,A," + String.join(",", numbers.stream().map(String::valueOf).toList()) + "#");
            }
            return out;
        }
    },

    /** What pressing SOS does. {@code {enabled, method, extra}}; method: see {@link #METHODS}. */
    SOS_ALARM("SOSALM#") {
        private final Pattern p = Pattern.compile("SOS HelpSwitch:(ON|OFF),Report Mode:(\\d)(?:,(\\d))?");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            if (!m.find()) return null;
            return map("enabled", on(m.group(1)), "method", Integer.parseInt(m.group(2)),
                    "extra", m.group(3) == null ? 1 : Integer.parseInt(m.group(3)));
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            Map<String, Object> v = merged(current, in, map("enabled", true, "method", 0, "extra", 1));
            return map("enabled", bool(v, "enabled"), "method", range(v, "method", 0, 3), "extra", range(v, "extra", 0, 9));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("SOSALM," + onOff(v) + "," + v.get("method") + "," + v.get("extra") + "#");
        }
    },

    /** Who may phone the tracker. {@code {who}}: 0 nobody, 2 only SOS numbers, 3 anyone. */
    CALL_PERMISSION("MONPERMIT#") {
        private final Pattern p = Pattern.compile("MONPERMIT:(\\d)");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("who", Integer.parseInt(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            int who = range(in, "who", 0, 3);
            if (who == 1) throw bad("who must be 0 (nobody), 2 (SOS numbers) or 3 (anyone)");
            return map("who", who);
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("MONPERMIT," + v.get("who") + "#");
        }
    },

    /** {@code {auto}}: true = the tracker picks up incoming calls by itself. */
    ANSWER_MODE("ANSWER#") {
        private final Pattern p = Pattern.compile("ANSWER:([01])");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("auto", "1".equals(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            return map("auto", bool(in, "auto"));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("ANSWER," + (bool(v, "auto") ? 1 : 0) + "#");
        }
    },

    /** {@code {level}} 1-7. */
    CALL_VOLUME("CALLVOL#") {
        private final Pattern p = Pattern.compile("call\\s+volume:(\\d)", Pattern.CASE_INSENSITIVE);

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("level", Integer.parseInt(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            return map("level", range(in, "level", 1, 7));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("CALLVOL," + v.get("level") + "#");
        }
    },

    /** {@code {level}} 1-7. */
    RING_VOLUME("RINGVOL#") {
        private final Pattern p = Pattern.compile("ring\\s+volume:(\\d)", Pattern.CASE_INSENSITIVE);

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("level", Integer.parseInt(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            return map("level", range(in, "level", 1, 7));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("RINGVOL," + v.get("level") + "#");
        }
    },

    /**
     * How often positions are sent.
     * <ul>
     *   <li>{@code {mode:2, moving, still}} - by movement: every {@code moving} s while moving,
     *       every {@code still} s when not (0 = nothing while still)</li>
     *   <li>{@code {mode:4, steps, idleWait, accel, riding}} - by steps (factory setting, easiest
     *       on the battery): a report per {@code steps} steps, every {@code riding} s in a vehicle</li>
     *   <li>{@code {mode:1, interval}} - fixed interval, moving or not</li>
     * </ul>
     * GPS, Wi-Fi, cell positioning and mobile data are always written as on.
     */
    REPORTING("MODE#") {
        private final Pattern p = Pattern.compile("Mode:([124])((?:,\\d+)+)");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            if (!m.find()) return null;
            String[] f = m.group(2).substring(1).split(",");
            try {
                return switch (m.group(1)) {
                    case "1" -> map("mode", 1, "interval", Integer.parseInt(f[0]));
                    case "2" -> map("mode", 2, "moving", Integer.parseInt(f[0]), "still", Integer.parseInt(f[1]));
                    default -> map("mode", 4, "steps", Integer.parseInt(f[0]), "idleWait", Integer.parseInt(f[1]),
                            "accel", Integer.parseInt(f[2]), "riding", Integer.parseInt(f[3]));
                };
            } catch (RuntimeException e) {
                return null;
            }
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            int mode = range(in, "mode", 1, 4);
            switch (mode) {
                case 1:
                    return map("mode", 1, "interval", range(in, "interval", 10, 86_400));
                case 2: {
                    int still = range(in, "still", 0, 66_400);
                    if (still != 0 && still < 180) throw bad("still must be 0 or at least 180 seconds");
                    return map("mode", 2, "moving", range(in, "moving", 10, 3600), "still", still);
                }
                case 4: {
                    Map<String, Object> v = merged(null, in, map("steps", 100, "idleWait", 300, "accel", 10, "riding", 300));
                    int steps = range(v, "steps", 10, 65_530);
                    if (steps % 10 != 0) throw bad("steps must be a multiple of 10");
                    return map("mode", 4, "steps", steps, "idleWait", range(v, "idleWait", 10, 86_400),
                            "accel", range(v, "accel", 1, 200), "riding", range(v, "riding", 10, 86_400));
                }
                default:
                    throw bad("mode must be 1, 2 or 4");
            }
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of(switch ((Integer) v.get("mode")) {
                case 1 -> "MODE,1," + v.get("interval") + ",1,1,1#";
                case 2 -> "MODE,2," + v.get("moving") + "," + v.get("still") + ",1,1,1,1#";
                default -> "MODE,4," + v.get("steps") + "," + v.get("idleWait") + "," + v.get("accel") + ","
                        + v.get("riding") + ",1,1,1,1#";
            });
        }
    },

    /**
     * {@code {minutes}}: how often the tracker says "still connected". Limited to
     * {@value #MAX_HEARTBEAT_MINUTES} because the server calls a tracker offline after 10 silent minutes.
     */
    HEARTBEAT("HBT#") {
        private final Pattern p = Pattern.compile("T1:(\\d+)");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return reply.contains("Heartbeat") && m.find() ? map("minutes", Integer.parseInt(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            return map("minutes", range(in, "minutes", 1, MAX_HEARTBEAT_MINUTES));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("HBT," + v.get("minutes") + "#");
        }
    },

    /**
     * Daily hours in which the tracker switches itself off: no position and no SOS.
     * {@code {enabled, from, to, mode}}; mode 1 = airplane mode, 2 = switched off (factory).
     */
    NIGHT_REST("FLY#") {
        private final Pattern p = Pattern.compile("FLY:\\s*(ON|OFF),(\\d{2}:\\d{2})-(\\d{2}:\\d{2}),([12])");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("enabled", on(m.group(1)), "from", m.group(2), "to", m.group(3),
                    "mode", Integer.parseInt(m.group(4))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            Map<String, Object> v = merged(current, in, map("enabled", false, "from", "00:00", "to", "07:00", "mode", 2));
            String from = time(v, "from"), to = time(v, "to");
            if (from.equals(to)) throw bad("The rest must start and end at different times");
            return map("enabled", bool(v, "enabled"), "from", from, "to", to, "mode", range(v, "mode", 1, 2));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("FLY," + onOff(v) + "," + v.get("from") + "-" + v.get("to") + "," + v.get("mode") + "#");
        }

        @Override public boolean matches(Map<String, Object> wanted, Map<String, Object> applied) {
            return applied != null && wanted.get("enabled").equals(applied.get("enabled"))
                    && wanted.get("from").equals(applied.get("from")) && wanted.get("to").equals(applied.get("to"));
        }
    },

    /** Daily hours in which the tracker makes no sound. {@code {enabled, from, to}} */
    QUIET_HOURS("SILENTPERIOD#") {
        private final Pattern p = Pattern.compile("SILENTPERIOD:\\s*(ON|OFF),(\\d{2}:\\d{2}),(\\d{2}:\\d{2})");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("enabled", on(m.group(1)), "from", m.group(2), "to", m.group(3)) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            Map<String, Object> v = merged(current, in, map("enabled", false, "from", "08:00", "to", "13:00"));
            String from = time(v, "from"), to = time(v, "to");
            if (from.equals(to)) throw bad("Quiet hours must start and end at different times");
            return map("enabled", bool(v, "enabled"), "from", from, "to", to);
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("SILENTPERIOD," + onOff(v) + "," + v.get("from") + "," + v.get("to") + "#");
        }
    },

    /** {@code {enabled, method, led, sound}}: what the tracker itself does when its battery is low. */
    LOW_BATTERY_ALARM("BATALM#") {
        private final Pattern p = Pattern.compile(
                "Low Battery Alarm Switch:(ON|OFF),Report Mode:(\\d),led reminder mode:(\\d),ring reminder mode:(\\d)");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("enabled", on(m.group(1)), "method", Integer.parseInt(m.group(2)),
                    "led", Integer.parseInt(m.group(3)), "sound", Integer.parseInt(m.group(4))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            Map<String, Object> v = merged(current, in, map("enabled", true, "method", 0, "led", 2, "sound", 1));
            return map("enabled", bool(v, "enabled"), "method", range(v, "method", 0, 3),
                    "led", range(v, "led", 0, 2), "sound", range(v, "sound", 0, 2));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("BATALM," + onOff(v) + "," + v.get("method") + "," + v.get("led") + "," + v.get("sound") + "#");
        }
    },

    /**
     * Fall alarm: a fall followed by {@code immobileSeconds} without movement.
     * {@code {enabled, method, immobileSeconds, muteMinutes}}
     */
    FALL_ALARM("DROPALM#") {
        private final Pattern p = Pattern.compile("DROPALM:(ON|OFF),(\\d),(\\d+),(\\d+)");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("enabled", on(m.group(1)), "method", Integer.parseInt(m.group(2)),
                    "immobileSeconds", Integer.parseInt(m.group(3)), "muteMinutes", Integer.parseInt(m.group(4))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            Map<String, Object> v = merged(current, in, map("enabled", false, "method", 0, "immobileSeconds", 30, "muteMinutes", 3));
            return map("enabled", bool(v, "enabled"), "method", range(v, "method", 0, 3),
                    "immobileSeconds", range(v, "immobileSeconds", 30, 300), "muteMinutes", range(v, "muteMinutes", 1, 1440));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("DROPALM," + onOff(v) + "," + v.get("method") + "," + v.get("immobileSeconds") + ","
                    + v.get("muteMinutes") + "#");
        }
    },

    /** {@code {enabled}}: true = the tracker cannot be switched off with the SOS button. */
    POWER_OFF_LOCK("PWRLIMIT#") {
        private final Pattern p = Pattern.compile("Switch:(ON|OFF)\\s*$");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return reply.toLowerCase().contains("pwrlimit") && m.find() ? map("enabled", on(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            return map("enabled", bool(in, "enabled"));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("PWRLIMIT," + onOff(v) + "#");
        }
    },

    /** {@code {enabled}}: true = the tracker switches itself on when it is put on the charger. */
    AUTO_POWER_ON("AUTOSTART#") {
        private final Pattern p = Pattern.compile("AUTOSTART:(ON|OFF)");

        @Override public Map<String, Object> parse(String reply) {
            Matcher m = p.matcher(reply);
            return m.find() ? map("enabled", on(m.group(1))) : null;
        }

        @Override public Map<String, Object> normalize(Map<String, Object> in, Map<String, Object> current) {
            return map("enabled", bool(in, "enabled"));
        }

        @Override public List<String> commands(Map<String, Object> v) {
            return List.of("AUTOSTART," + onOff(v) + "#");
        }
    };

    /** 0 = data only, 1 = SMS + data, 2 = data + SMS + call, 3 = data + call (to the SOS numbers). */
    public static final String METHODS = "0-3";
    public static final int MAX_HEARTBEAT_MINUTES = 8;

    private final String query;

    TrackerSetting(String query) {
        this.query = query;
    }

    /** The command that makes the tracker report this setting. */
    public String query() {
        return query;
    }

    /** @return the value in the tracker's answer, or null when the answer is not understood */
    public abstract Map<String, Object> parse(String reply);

    /**
     * Checks a wanted value and completes it from what the tracker has now.
     * @throws IllegalArgumentException with a message fit for the user
     */
    public abstract Map<String, Object> normalize(Map<String, Object> input, Map<String, Object> current);

    /** The commands that write a normalized value, in order. */
    public abstract List<String> commands(Map<String, Object> value);

    /** Does what the tracker reports afterwards satisfy what was wanted? */
    public boolean matches(Map<String, Object> wanted, Map<String, Object> applied) {
        if (applied == null) return false;
        // Switched off is switched off, whatever the other fields say.
        if (Boolean.FALSE.equals(wanted.get("enabled")) && wanted.size() > 1) {
            return Boolean.FALSE.equals(applied.get("enabled"));
        }
        return wanted.equals(applied);
    }

    public static TrackerSetting of(String key) {
        try {
            return valueOf(key == null ? "" : key.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown setting: " + key);
        }
    }

    // ---- helpers ----

    static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    /** defaults, overlaid with the tracker's current value, overlaid with the input. */
    static Map<String, Object> merged(Map<String, Object> current, Map<String, Object> input, Map<String, Object> defaults) {
        Map<String, Object> m = new LinkedHashMap<>(defaults);
        if (current != null) m.putAll(current);
        if (input != null) input.forEach((k, v) -> { if (v != null) m.put(k, v); });
        return m;
    }

    private static boolean on(String s) {
        return "ON".equalsIgnoreCase(s);
    }

    private static String onOff(Map<String, Object> v) {
        return bool(v, "enabled") ? "ON" : "OFF";
    }

    static IllegalArgumentException bad(String message) {
        return new IllegalArgumentException(message);
    }

    static boolean bool(Map<String, Object> v, String key) {
        Object o = v.get(key);
        if (o instanceof Boolean b) return b;
        throw bad(key + " must be true or false");
    }

    static int range(Map<String, Object> v, String key, int min, int max) {
        Object o = v.get(key);
        if (!(o instanceof Number n) || n.doubleValue() != Math.rint(n.doubleValue())) {
            throw bad(key + " must be a whole number");
        }
        int i = n.intValue();
        if (i < min || i > max) throw bad(key + " must be between " + min + " and " + max);
        return i;
    }

    static String time(Map<String, Object> v, String key) {
        try {
            LocalTime t = LocalTime.parse(String.valueOf(v.get(key)).trim());
            return String.format("%02d:%02d", t.getHour(), t.getMinute());
        } catch (DateTimeParseException e) {
            throw bad(key + " must be a time like 23:00");
        }
    }
}
