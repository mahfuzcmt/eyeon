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

    /** "School-এ" — the hyphenated locative attaches cleanly to any name the user typed. */
    private static String at(String place, boolean bn) {
        return orPlace(place, bn) + "-এ";
    }

    private static String orPlace(String place, boolean bn) {
        return place != null ? place : (bn ? "নির্ধারিত জায়গা" : "a saved place");
    }

    /** {@code সকাল ৮:০২} / {@code 8:02 AM}, always Asia/Dhaka. */
    static String formatTime(Instant ts, Lang lang) {
        ZonedDateTime z = (ts == null ? Instant.now() : ts).atZone(DHAKA);
        int h24 = z.getHour();
        int h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        String mm = String.format("%02d", z.getMinute());
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
