"use client";

import { Client as StompClient, IMessage, StompSubscription } from "@stomp/stompjs";
import { fetchWsToken } from "./auth";
import type { AlarmView, LocationView } from "@/types/domain";

type Listener<T> = (msg: T) => void;

/**
 * Single shared STOMP client per browser tab. Reconnects with exponential
 * backoff. The CONNECT frame carries the JWT in its Authorization native
 * header — see CLAUDE.md §9 and StompAuthChannelInterceptor.
 */
class WsClient {
  private client: StompClient | null = null;
  private connected = false;
  private connecting: Promise<void> | null = null;
  private subs = new Map<string, StompSubscription>();
  private listeners = new Map<string, Set<Listener<unknown>>>();

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const token = await fetchWsToken();

      // Dynamically determine WebSocket URL based on current page location
      const getWsUrl = (): string => {
        if (process.env.NEXT_PUBLIC_WS_BASE) {
          return process.env.NEXT_PUBLIC_WS_BASE;
        }
        // In browser, derive from current location
        if (typeof window !== "undefined") {
          const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
          const host = window.location.host;
          // WebSocket connects to backend on port 8080 with /api/v1 context path
          const backendHost = host.replace(/:3000$/, ":8080");
          return `${proto}//${backendHost}/api/v1/ws`;
        }
        return "ws://localhost:8080/api/v1/ws";
      };

      const wsUrl = getWsUrl();

      console.log(`[ws] Connecting to WebSocket: ${wsUrl}`);

      const client = new StompClient({
        brokerURL: wsUrl,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 3_000,
        heartbeatIncoming: 10_000,
        heartbeatOutgoing: 10_000,
        debug: (msg) => console.log(`[STOMP] ${msg}`),
        // Force WebSocket to reconnect on error
        webSocketFactory: () => new WebSocket(wsUrl),
      });

      await new Promise<void>((resolve, reject) => {
        client.onConnect = () => {
          this.connected = true;
          for (const [dest, listenerSet] of this.listeners.entries()) {
            if (listenerSet.size > 0 && !this.subs.has(dest)) {
              this.attach(dest);
            }
          }
          resolve();
        };
        client.onStompError = (frame) => reject(new Error(frame.headers.message ?? "STOMP error"));
        client.onWebSocketError = (e) => reject(e instanceof Error ? e : new Error("WS error"));
        client.onDisconnect = () => {
          this.connected = false;
          this.subs.clear();
        };
        client.activate();
      });

      this.client = client;
    })().finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  private attach(destination: string): void {
    if (!this.client || !this.connected) return;
    if (this.subs.has(destination)) return;

    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      console.log(`[ws] Message received on ${destination}, body length: ${msg.body.length}`);
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

    await this.ensureConnected();
    this.attach(destination);

    return () => {
      const s = this.listeners.get(destination);
      if (!s) return;
      s.delete(listener as Listener<unknown>);
      if (s.size === 0) {
        const sub = this.subs.get(destination);
        sub?.unsubscribe();
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

export function subscribeLocations(
  orgId: string,
  listener: (loc: LocationView) => void,
): Promise<() => void> {
  return get().subscribe<LocationView>(`/topic/org/${orgId}/locations`, listener);
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
  orgId: string,
  listener: (locations: LocationView[]) => void,
): Promise<() => void> {
  const topic = `/topic/org/${orgId}/locations/batch`;
  console.log(`[ws] Subscribing to batch topic: ${topic}`);
  return get().subscribe<LocationView[]>(topic, (locations) => {
    console.log(`[ws] Received batch message on ${topic}: ${locations.length} locations`);
    listener(locations);
  });
}

export function subscribeAlarms(
  orgId: string,
  listener: (alarm: AlarmView) => void,
): Promise<() => void> {
  return get().subscribe<AlarmView>(`/topic/org/${orgId}/alarms`, listener);
}

export function disconnectWs(): void {
  if (singleton) {
    singleton.disconnect();
    singleton = null;
  }
}
