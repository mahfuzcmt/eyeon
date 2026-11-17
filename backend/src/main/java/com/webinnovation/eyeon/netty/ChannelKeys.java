package com.webinnovation.eyeon.netty;

import io.netty.util.AttributeKey;

import java.util.UUID;

/**
 * Channel attribute keys carried for the lifetime of a device's TCP connection.
 * Set by LoginHandler after IMEI extraction (CLAUDE.md §6.4).
 */
public final class ChannelKeys {

    public static final AttributeKey<String> IMEI_KEY = AttributeKey.valueOf("eyeon.imei");
    public static final AttributeKey<UUID> ORG_ID_KEY = AttributeKey.valueOf("eyeon.orgId");
    public static final AttributeKey<Boolean> REGISTERED_KEY = AttributeKey.valueOf("eyeon.registered");
    /** Holds packets that arrive while the login lookup is still running (see {@link LoginGate}). */
    public static final AttributeKey<LoginGate> LOGIN_GATE_KEY = AttributeKey.valueOf("eyeon.loginGate");

    /**
     * The IMEI of the first LOGIN on this connection, set on the event loop before the lookup
     * starts. A connection speaks for one tracker only; a later LOGIN with another IMEI is ignored.
     */
    public static final AttributeKey<String> LOGIN_IMEI_KEY = AttributeKey.valueOf("eyeon.loginImei");

    private ChannelKeys() {}
}
