import { AppState, type AppStateStatus } from "react-native";
import { Client as StompClient, IMessage, StompSubscription } from "@stomp/stompjs";
import { freshAccessToken } from "@/api/client";
import type { AlarmView, LocationView } from "@/types";

type Listener<T> = (msg: T) => void;

const wsUrl = process.env.EXPO_PUBLIC_WS_BASE ?? "ws://10.0.2.2:8081/ws";

/**
 * One shared STOMP client for the app. The CONNECT frame carries the JWT
 * access token (mobile holds it directly, unlike the cookie-based web client).
 * See CLAUDE.md §9 and StompAuthChannelInterceptor.
 *
 * The token is read again before every (re)connect and refreshed when about to expire;
 * reusing the one from the first connect meant every reconnect after an hour was refused.
 * Coming back to the foreground forces a reconnect, because a socket that slept in the
 * background is often dead without having noticed.
 */
class WsClient {
  private client: StompClient | null = null;
  private connected = false;
  private subs = new Map<string, StompSubscription>();
  private listeners = new Map<string, Set<Listener<unknown>>>();

  /**
   * Exactly one client, created on first use and left to reconnect by itself. (Until 2026-11-02 a
   * failed first connect left that client retrying while every later subscriber started another
   * one, so a phone on a bad connection could end up with several sockets.) Subscriptions are
   * (re)attached in onConnect, so callers never wait for the socket.
   */
  isConnected(): boolean {
    return this.connected;
  }

  private ensureClient(): void {
    if (this.client) return;
    const client = new StompClient({
      brokerURL: wsUrl,
      beforeConnect: async () => {
        client.connectHeaders = { Authorization: `Bearer ${(await freshAccessToken()) ?? ""}` };
      },
      reconnectDelay: 3_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      // React Native's WebSocket cuts text frames at the NULL byte that ends every STOMP frame,
      // in both directions (stompjs docs, "React Native"). Without these two flags the CONNECT
      // frame never completed and no message was parsed, so the app never got a live update and
      // only moved with the 10 s REST poll - about 30 s behind the web (client feedback
      // 2026-11-05). Binary frames keep the NULL on the way out; the second flag restores it on
      // the way in. TextEncoder (needed for binary frames) is in Hermes since RN 0.74.
      forceBinaryWSFrames: typeof TextEncoder !== "undefined",
      appendMissingNULLonIncoming: true,
      // stompjs needs an explicit factory in React Native.
      webSocketFactory: () => new WebSocket(wsUrl),
      debug: () => {},
    });
    client.onConnect = () => {
      this.connected = true;
      this.subs.clear();
      for (const [dest, set] of this.listeners.entries()) {
        if (set.size > 0) this.attach(dest);
      }
    };
    client.onWebSocketClose = () => {
      this.connected = false;
      this.subs.clear();
    };
    this.client = client;
    client.activate();
    this.watchAppState();
  }

  private attach(destination: string): void {
    if (!this.client || !this.connected || this.subs.has(destination)) return;
    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      const set = this.listeners.get(destination);
      if (!set || set.size === 0) return;
      let parsed: unknown = msg.body;
      try {
        parsed = JSON.parse(msg.body);
      } catch {
        /* keep raw */
      }
      for (const fn of set) fn(parsed);
    });
    this.subs.set(destination, sub);
  }

  async subscribe<T>(destination: string, listener: Listener<T>): Promise<() => void> {
    let set = this.listeners.get(destination);
    if (!set) {
      set = new Set();
      this.listeners.set(destination, set);
    }
    set.add(listener as Listener<unknown>);
    this.ensureClient();
    this.attach(destination);

    return () => {
      const s = this.listeners.get(destination);
      if (!s) return;
      s.delete(listener as Listener<unknown>);
      if (s.size === 0) {
        if (this.connected) this.subs.get(destination)?.unsubscribe();
        this.subs.delete(destination);
        this.listeners.delete(destination);
      }
    };
  }

  private appStateSub: { remove: () => void } | null = null;
  private lastAppState: AppStateStatus = AppState.currentState;

  private watchAppState(): void {
    if (this.appStateSub) return;
    this.appStateSub = AppState.addEventListener("change", (next) => {
      const wasAway = this.lastAppState !== "active";
      this.lastAppState = next;
      if (next === "active" && wasAway && this.client) {
        // Drop the possibly dead socket; stompjs reconnects at once with a fresh token.
        this.client.forceDisconnect();
      }
    });
  }

  disconnect(): void {
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.client?.deactivate();
    this.client = null;
    this.connected = false;
    this.subs.clear();
    this.listeners.clear();
  }
}

let singleton: WsClient | null = null;

/** True while the STOMP socket is up; the REST fallback polls faster when it is not. */
export function isWsConnected(): boolean {
  return singleton?.isConnected() ?? false;
}

function get(): WsClient {
  if (!singleton) singleton = new WsClient();
  return singleton;
}

// Live data is delivered per user on /user/queue/..., filtered on the server to the children
// this user may see (the org-wide /topic/org/... topics are closed). Locations arrive in
// batches every ~10 s; this unpacks them so callers still get one location at a time.
// (Before 2026-09-21 the app listened on a single-location topic nothing published to, so the
// mobile map never updated live.) `orgId` stays in the signatures for callers.

export function subscribeLocations(
  _orgId: string,
  listener: (loc: LocationView) => void,
): Promise<() => void> {
  return get().subscribe<LocationView[]>("/user/queue/locations/batch", (batch) => {
    for (const loc of batch) listener(loc);
  });
}

export function subscribeAlarms(
  _orgId: string,
  listener: (alarm: AlarmView) => void,
): Promise<() => void> {
  return get().subscribe<AlarmView>("/user/queue/alarms", listener);
}

export function disconnectWs(): void {
  if (singleton) {
    singleton.disconnect();
    singleton = null;
  }
}
