package com.webinnovation.eyeon.protocol;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * One frame of the "3G" smart-watch protocol: {@code [<vendor>*<deviceId>*<LEN hex4>*<content>]}.
 * LEN is the byte length of the content only, so the content may itself contain {@code ,},
 * {@code *} or {@code ]}. The device id is the watch's 10-digit id (its IMEI without the first
 * four digits and the check digit).
 *
 * <p>The watch server ({@code watch-server/protocol.py}) answers these frames; this decoder
 * mirrors its framing so the backend reads the same frames while relaying them.
 */
public record WatchFrame(String vendor, String deviceId, String content) {

    /** "LK", "UD_LTE", "AL", ... : the content up to the first comma. */
    public String command() {
        int comma = content.indexOf(',');
        return comma < 0 ? content : content.substring(0, comma);
    }

    /** The comma-separated fields after the command name; empty fields are kept. */
    public String[] args() {
        int comma = content.indexOf(',');
        return comma < 0 ? new String[0] : content.substring(comma + 1).split(",", -1);
    }

    /**
     * Cuts a byte stream into frames. Bytes before a {@code [} are skipped, a header that does
     * not parse drops one byte and resyncs, and an incomplete frame waits for more bytes.
     * Not thread-safe: one reader per connection, fed from one thread.
     */
    public static final class Reader {

        static final int MAX_HEADER = 64;
        static final int MAX_CONTENT = 0xFFFF;
        /** A whole frame always fits; anything longer waiting in the buffer is not a frame. */
        static final int MAX_BUFFERED = MAX_HEADER + MAX_CONTENT + 1;

        private byte[] buf = new byte[512];
        private int len;

        public List<WatchFrame> feed(byte[] data) {
            if (len + data.length > buf.length) {
                buf = java.util.Arrays.copyOf(buf, Math.max(buf.length * 2, len + data.length));
            }
            System.arraycopy(data, 0, buf, len, data.length);
            len += data.length;

            List<WatchFrame> frames = new ArrayList<>();
            int pos = 0;
            while (true) {
                while (pos < len && buf[pos] != '[') pos++;
                if (pos >= len) break;
                int limit = Math.min(len, pos + MAX_HEADER);
                int s1 = indexOf('*', pos + 1, limit);
                int s2 = s1 < 0 ? -1 : indexOf('*', s1 + 1, limit);
                int s3 = s2 < 0 ? -1 : indexOf('*', s2 + 1, limit);
                if (s3 < 0) {
                    if (len - pos >= MAX_HEADER) {  // a header is never this long: not a frame start
                        pos++;
                        continue;
                    }
                    break;                          // header still arriving
                }
                int length = hex4(s2 + 1, s3);
                if (length < 0 || s1 == pos + 1 || !alphanumeric(s1 + 1, s2)) {
                    pos++;
                    continue;
                }
                int total = (s3 + 1 - pos) + length + 1;
                if (len - pos < total) break;       // content still arriving
                if (buf[pos + total - 1] != ']') {
                    pos++;
                    continue;
                }
                frames.add(new WatchFrame(text(pos + 1, s1), text(s1 + 1, s2), text(s3 + 1, s3 + 1 + length)));
                pos += total;
            }
            len -= pos;
            if (len > MAX_BUFFERED) {
                len = 0;
            } else if (pos > 0 && len > 0) {
                System.arraycopy(buf, pos, buf, 0, len);
            }
            return frames;
        }

        private int indexOf(char c, int from, int to) {
            for (int i = from; i < to; i++) {
                if (buf[i] == c) return i;
            }
            return -1;
        }

        /** Exactly four hex digits between {@code from} and {@code to}; -1 otherwise. */
        private int hex4(int from, int to) {
            if (to - from != 4) return -1;
            int v = 0;
            for (int i = from; i < to; i++) {
                int d = Character.digit(buf[i], 16);
                if (d < 0) return -1;
                v = v * 16 + d;
            }
            return v;
        }

        private boolean alphanumeric(int from, int to) {
            if (to <= from) return false;
            for (int i = from; i < to; i++) {
                byte b = buf[i];
                boolean ok = (b >= '0' && b <= '9') || (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z');
                if (!ok) return false;
            }
            return true;
        }

        private String text(int from, int to) {
            return new String(buf, from, to - from, StandardCharsets.ISO_8859_1);
        }
    }
}
