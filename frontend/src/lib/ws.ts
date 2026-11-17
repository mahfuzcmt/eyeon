"use client";

import { Client as StompClient, IMessage, StompSubscription } from "@stomp/stompjs";
import { clearWsToken, fetchWsToken } from "./auth";
import type { AlarmView, LocationView } from "@/types/domain";

type Listener<T> = (msg: T) => void;

/**
 * Single shared STOMP client per browser tab, created on first use and left to reconnect by
 * itself. The CONNECT frame carries the JWT in its Authorization native header — see
 * CLAUDE.md §9 and StompAuthChannelInterceptor.
 *
 * The token is fetched again before every (re)connect: the one from the first connect expires
 * after an hour and every later reconnect was refused. Subscriptions are dropped on every
 * socket close and re-attached on every connect; stompjs calls onDisconnect only for a
 * graceful disconnect, so after a network drop the socket used to come back with none.
 */
function wsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_BASE) {
    return process.env.NEXT_PUBLIC_WS_BASE;
  }
  // In browser, derive from current location
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // WebSocket connects to backend on port 8081 with /api/v1 context path
    const backendHost = host.replace(/:3001$/, ":8081");
    return `${proto}//${backendHost}/api/v1/ws`;
  }
  return "ws://localhost:8081/api/v1/ws";
}

class WsClient {
  private client: StompClient | null = null;
  private connected = false;
  private subs = new Map<string, StompSubscription>();
  private listeners = new Map<string, Set<Listener<unknown>>>();

  private ensureClient(): void {
    if (this.client) return;
    const url = wsUrl();
    const client = new StompClient({
      brokerURL: url,
      beforeConnect: async () => {
        // A failed token fetch must not throw here (stompjs would stop reconnecting): connect
        // without one, the server refuses it and the next attempt asks again.
        let token = "";
        try {
          token = await fetchWsToken();
        } catch {
          token = "";
        }
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      reconnectDelay: 3_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      debug: () => {},
      webSocketFactory: () => new WebSocket(url),
    });
    client.onConnect = () => {
      this.connected = true;
      this.subs.clear();
      for (const [dest, listenerSet] of this.listeners.entries()) {
        if (listenerSet.size > 0) this.attach(dest);
      }
    };
    client.onWebSocketClose = () => {
      this.connected = false;
      this.subs.clear();
    };
    // A refused CONNECT (expired or revoked token): never reuse the cached token.
    client.onStompError = () => {
      clearWsToken();
    };
    this.client = client;
    client.activate();
  }

  private attach(destination: string): void {
    if (!this.client || !this.connected) return;
    if (this.subs.has(destination)) return;

    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      const set = this.listeners.get(destination);
      if (!set || set.size === 0) return;
      let parsed: unknown = msg.body;
      try {
        parsed = JSON.parse(msg.body);
      } catch {
        // leave as raw string
      }
      for (const fn of set) fn(parsed);
    });
    this.subs.set(destination, sub);
  }

  /** Subscribe to a destination. Returns an unsubscribe function. */
  async subscribe<T = unknown>(destination: string, listener: Listener<T>): Promise<() => void> {
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

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
    this.connected = false;
    this.subs.clear();
    this.listeners.clear();
  }
}

let singleton: WsClient | null = null;

function get(): WsClient {
  if (!singleton) singleton = new WsClient();
  return singleton;
}

// Live data is delivered per user on /user/queue/..., filtered on the server to the children
// this user may see. The org-wide /topic/org/{orgId}/... topics are closed (they sent every
// child's position to every parent in a school). `orgId` stays in the signatures for callers.

export function subscribeLocations(
  _orgId: string,
  listener: (loc: LocationView) => void,
): Promise<() => void> {
  return get().subscribe<LocationView>("/user/queue/locations", listener);
}

/**
 * Subscribe to batched location updates (published every 10 seconds).
 * Each batch contains all devices that had location updates in the last interval.
 *
 * @param orgId Organization ID to subscribe to
 * @param listener Callback that receives an array of location updates
 * @returns Unsubscribe function
 */
export function subscribeBatchLocations(
  _orgId: string,
  listener: (locations: LocationView[]) => void,
): Promise<() => void> {
  return get().subscribe<LocationView[]>("/user/queue/locations/batch", listener);
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
