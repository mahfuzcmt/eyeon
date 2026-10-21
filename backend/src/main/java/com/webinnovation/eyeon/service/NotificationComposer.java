package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.domain.Alarm;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;

/**
 * Turns an alarm into the words a carer reads on their lock screen, in Bengali or English
 * (docs/FAMILY_SAFETY_PLAN.md §5.3). Pure: no I/O, so every sentence is unit-tested.
 *
 * <p>Bengali verbs change with respect (পৌঁছেছে for a child, পৌঁছেছেন for a grandparent) and
 * the backend does not know who is wearing the tracker, so the Bengali templates use
 * verb-free forms ("রাফি এখন School-এ") that are correct for both.
 */
@Component
public class NotificationComposer {

    private static final ZoneId DHAKA = ZoneId.of("Asia/Dhaka");

    /** Android channel for calm arrived/left messages (default sound, normal importance). */
    public static final String CHANNEL_ARRIVALS = "arrivals";
    /** Android channel for everything that needs attention. */
    public static final String CHANNEL_ALARMS = "alarms";

    public enum Lang {
        BN, EN;

        /** {@code bn}, {@code bn-BD} → BN; {@code en*} → EN; anything else (incl. null) → BN, the product default. */
        public static Lang of(String locale) {
            return locale != null && locale.toLowerCase().startsWith("en") ? EN : BN;
        }
    }

    public record Message(String title, String body, String channelId) {}

    /**
     * @param personName the tracker's display name (falls back to the IMEI upstream)
     */
    public Message compose(Alarm alarm, String personName, Lang lang) {
        String time = formatTime(alarm.ts(), lang);
        String place = metaString(alarm.metadata(), "geofenceName");
        boolean bn = lang == Lang.BN;

        return switch (alarm.type()) {
            case "PLACE_ARRIVED" -> new Message(
                    bn ? "📍 " + personName + " এখন " + at(place, bn)
                       : "📍 " + personName + " reached " + orPlace(place, bn),
                    bn ? "পৌঁছানোর সময়: " + time : "Arrived at " + time,
                    CHANNEL_ARRIVALS);
            case "PLACE_LEFT" -> new Message(
                    bn ? "🚶 " + personName + " আর " + at(place, bn) + " নেই"
                       : "🚶 " + personName + " left " + orPlace(place, bn),
                    bn ? "বের হওয়ার সময়: " + time : "Left at " + time,
                    CHANNEL_ARRIVALS);
            case "GEOFENCE_EXIT" -> new Message(
                    bn ? "⚠️ " + personName + " নিরাপদ এলাকার বাইরে"
                       : "⚠️ " + personName + " is outside the safe area",
                    joinDot(place, time, bn ? "ম্যাপে দেখতে ট্যাপ করুন" : "Tap to see the map"),
                    CHANNEL_ALARMS);
            case "GEOFENCE_ENTER" -> new Message(
                    bn ? "✅ " + personName + " আবার নিরাপদ এলাকায়"
                       : "✅ " + personName + " is back in the safe area",
                    joinDot(place, time),
                    CHANNEL_ARRIVALS);   // good news: the calm channel, not the alarm one
            case "SOS" -> new Message(
                    bn ? "🚨 SOS! " + personName + "-এর জরুরি সাহায্য দরকার"
                       : "🚨 SOS! " + personName + " needs help",
                    joinDot(time, bn ? "এখনই লোকেশন দেখুন" : "See their location now"),
                    CHANNEL_ALARMS);
            case "NOT_ARRIVED" -> new Message(
                    bn ? "⏰ " + personName + " এখনো " + at(place, bn) + " পৌঁছায়নি"
                       : "⏰ " + personName + " has not reached " + orPlace(place, bn),
                    joinDot(expected(alarm, time, bn, true),
                            bn ? "কোথায় আছে দেখতে ট্যাপ করুন" : "Tap to see where they are"),
                    CHANNEL_ALARMS);
            case "NOT_LEFT" -> new Message(
                    bn ? "⏰ " + personName + " এখনো " + at(place, bn) + " আছে"
                       : "⏰ " + personName + " is still at " + orPlace(place, bn),
                    expected(alarm, time, bn, false),
                    CHANNEL_ALARMS);
            case "ARRIVED_ON_TIME" -> new Message(
                    bn ? "✅ সময়মতো: " + personName + " এখন " + at(place, bn)
                       : "✅ " + personName + " reached " + orPlace(place, bn) + " on time",
                    joinDot(bn ? "পৌঁছানো: " + time : "Arrived " + time, expected(alarm, null, bn, true)),
                    CHANNEL_ARRIVALS);
            case "LEFT_ON_TIME" -> new Message(
                    bn ? "✅ সময়মতো: " + personName + " আর " + at(place, bn) + " নেই"
                       : "✅ " + personName + " left " + orPlace(place, bn) + " on time",
                    joinDot(bn ? "বের হওয়া: " + time : "Left " + time, expected(alarm, null, bn, false)),
                    CHANNEL_ARRIVALS);
            case "ARRIVED_LATE" -> new Message(
                    bn ? "🕘 দেরিতে: " + personName + " এখন " + at(place, bn)
                       : "🕘 " + personName + " reached " + orPlace(place, bn) + " late",
                    joinDot(bn ? "পৌঁছানো: " + time : "Arrived " + time, expected(alarm, null, bn, true)),
                    CHANNEL_ARRIVALS);
            case "LEFT_LATE" -> new Message(
                    bn ? "🕘 দেরিতে: " + personName + " আর " + at(place, bn) + " নেই"
                       : "🕘 " + personName + " left " + orPlace(place, bn) + " late",
                    joinDot(bn ? "বের হওয়া: " + time : "Left " + time, expected(alarm, null, bn, false)),
                    CHANNEL_ARRIVALS);
            case "ROUTE_DEVIATION" -> new Message(
                    bn ? "🧭 " + personName + " অন্য পথে যাচ্ছে"
                       : "🧭 " + personName + " is off the usual route",
                    joinDot(routeName(alarm, place, bn), time, bn ? "কোথায় আছে দেখতে ট্যাপ করুন" : "Tap to see where they are"),
                    CHANNEL_ALARMS);
            case "BACK_ON_ROUTE" -> new Message(
                    bn ? "✅ " + personName + " আবার চেনা পথে"
                       : "✅ " + personName + " is back on the usual route",
                    joinDot(routeName(alarm, place, bn), time),
                    CHANNEL_ARRIVALS);
            case "CHARGE_REMINDER" -> {
                String pct = metaString(alarm.metadata(), "batteryPercent");
                String level = pct == null ? null
                        : (bn ? "ব্যাটারি " + toBengaliDigits(pct) + "%" : "Battery at " + pct + "%");
                boolean morning = "MORNING".equals(metaString(alarm.metadata(), "reason"));
                yield morning
                        ? new Message(
                                bn ? "🔋 " + personName + "-এর ট্র্যাকার আজ সারাদিন নাও চলতে পারে"
                                   : "🔋 " + personName + "'s tracker may not last the day",
                                joinDot(level, bn ? "বের হওয়ার আগে চার্জ দিন" : "Charge it before they leave"),
                                CHANNEL_ALARMS)
                        : new Message(
                                bn ? "🔋 আজ রাতে " + personName + "-এর ট্র্যাকার চার্জ দিন"
                                   : "🔋 Charge " + personName + "'s tracker tonight",
                                level == null ? "" : level,
                                CHANNEL_ARRIVALS);
            }
            case "LOW_BATTERY" -> new Message(
                    bn ? "🔋 " + personName + "-এর ডিভাইসে চার্জ কম"
                       : "🔋 " + personName + "'s tracker battery is low",
                    bn ? "আজই চার্জ দিন" : "Charge it today",
                    CHANNEL_ALARMS);
            default -> {
                boolean critical = "CRITICAL".equals(alarm.severity());
                String label = alarm.type().replace('_', ' ');
                yield new Message(
                        (critical ? "🚨 " : "⚠️ ") + label + " — " + personName,
                        joinDot(time, bn ? "বিস্তারিত দেখতে ট্যাপ করুন" : "Tap for details"),
                        CHANNEL_ALARMS);
            }
        };
    }

    /**
     * One text message for a critical alarm. Kept short on purpose: Bengali is sent as Unicode,
     * where a segment is 70 characters, and every segment is billed. The map link is last so
     * that a truncated message still says who needs help.
     */
    public String composeSms(Alarm alarm, String personName, Lang lang) {
        boolean bn = lang == Lang.BN;
        String time = formatTime(alarm.ts(), lang);
        String what = switch (alarm.type()) {
            case "SOS" -> bn ? "SOS! " + personName + "-এর জরুরি সাহায্য দরকার।"
                             : "SOS! " + personName + " needs help.";
            case "REMOVE" -> bn ? personName + "-এর ট্র্যাকার খুলে ফেলা হয়েছে।"
                                : personName + "'s tracker was taken off.";
            default -> (bn ? "জরুরি সতর্কতা: " : "Urgent alert: ")
                    + alarm.type().replace('_', ' ') + " - " + personName + ".";
        };
        String where = alarm.latitude() != null && alarm.longitude() != null
                ? (bn ? " ম্যাপ: " : " Map: ") + String.format(java.util.Locale.ROOT,
                        "https://maps.google.com/?q=%.5f,%.5f", alarm.latitude(), alarm.longitude())
                : (bn ? " অ্যাপে লোকেশন দেখুন।" : " Open the app for the location.");
        return "EyeOn " + what + " " + (bn ? "সময় " + time + "।" : time + ".") + where;
    }

    /**
     * "Expected by 8:00 AM (+10 min)" from the schedule in the metadata; falls back to the
     * alarm's own time for alarms raised before the metadata carried it.
     */
    private static String expected(Alarm alarm, String fallback, boolean bn, boolean arrive) {
        String hhmm = metaString(alarm.metadata(), "expectedTime");
        String clock;
        if (hhmm != null) {
            try {
                java.time.LocalTime t = java.time.LocalTime.parse(hhmm);
                clock = formatClock(t.getHour(), t.getMinute(), bn ? Lang.BN : Lang.EN);
            } catch (java.time.DateTimeException e) {
                clock = fallback;
            }
        } else {
            clock = fallback;
        }
        if (clock == null) return null;
        String g = metaString(alarm.metadata(), "graceMinutes");
        String grace = g == null || "0".equals(g) ? "" : (bn ? " (+" + toBengaliDigits(g) + " মিনিট)" : " (+" + g + " min)");
        if (bn) return (arrive ? "নির্ধারিত সময়: " : "বের হওয়ার নির্ধারিত সময়: ") + clock + grace;
        return (arrive ? "Expected by " : "Expected to leave by ") + clock + grace;
    }

    /** "School-এ" — the hyphenated locative attaches cleanly to any name the user typed. */
    /** {@code School-এ যাওয়ার পথ} / {@code Way to School}; the direction is in the metadata. */
    private static String routeName(Alarm alarm, String place, boolean bn) {
        boolean from = "FROM".equals(metaString(alarm.metadata(), "direction"));
        if (bn) return from ? orPlace(place, true) + " থেকে ফেরার পথ" : orPlace(place, true) + "-এ যাওয়ার পথ";
        return (from ? "Way back from " : "Way to ") + orPlace(place, false);
    }

    private static String at(String place, boolean bn) {
        return orPlace(place, bn) + "-এ";
    }

    private static String orPlace(String place, boolean bn) {
        return place != null ? place : (bn ? "নির্ধারিত জায়গা" : "a saved place");
    }

    /** {@code সকাল ৮:০২} / {@code 8:02 AM}, always Asia/Dhaka. */
    static String formatTime(Instant ts, Lang lang) {
        ZonedDateTime z = (ts == null ? Instant.now() : ts).atZone(DHAKA);
        return formatClock(z.getHour(), z.getMinute(), lang);
    }

    static String formatClock(int h24, int minute, Lang lang) {
        int h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        String mm = String.format("%02d", minute);
        if (lang == Lang.EN) {
            return h12 + ":" + mm + (h24 < 12 ? " AM" : " PM");
        }
        return dayPart(h24) + " " + toBengaliDigits(h12 + ":" + mm);
    }

    private static String dayPart(int h24) {
        if (h24 < 4) return "রাত";
        if (h24 < 6) return "ভোর";
        if (h24 < 12) return "সকাল";
        if (h24 < 15) return "দুপুর";
        if (h24 < 18) return "বিকাল";
        if (h24 < 20) return "সন্ধ্যা";
        return "রাত";
    }

    static String toBengaliDigits(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            sb.append(c >= '0' && c <= '9' ? (char) ('০' + (c - '0')) : c);
        }
        return sb.toString();
    }

    private static String joinDot(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            if (sb.length() > 0) sb.append(" · ");
            sb.append(p);
        }
        return sb.toString();
    }

    private static String metaString(Map<String, Object> meta, String key) {
        if (meta == null) return null;
        Object v = meta.get(key);
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
