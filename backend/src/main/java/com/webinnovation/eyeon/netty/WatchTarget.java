package com.webinnovation.eyeon.netty;

/**
 * Where watch connections arriving on the tracker port are passed through to
 * ({@code eyeon.netty.watch-forward}, "host:port"). A blank setting means no relaying.
 */
public record WatchTarget(String host, int port) {

    /** Parses "host:port"; blank → null (relaying off). */
    public static WatchTarget parse(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        int colon = v.lastIndexOf(':');
        if (colon <= 0 || colon == v.length() - 1) {
            throw new IllegalArgumentException("eyeon.netty.watch-forward must be host:port, got '" + v + "'");
        }
        int port = Integer.parseInt(v.substring(colon + 1));
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("eyeon.netty.watch-forward port out of range: " + port);
        }
        return new WatchTarget(v.substring(0, colon), port);
    }

    @Override
    public String toString() {
        return host + ":" + port;
    }
}
