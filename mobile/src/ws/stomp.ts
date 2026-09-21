import { Client as StompClient, IMessage, StompSubscription } from "@stomp/stompjs";
import { tokenStore } from "@/api/client";
import type { AlarmView, LocationView } from "@/types";

type Listener<T> = (msg: T) => void;

const wsUrl = process.env.EXPO_PUBLIC_WS_BASE ?? "ws://10.0.2.2:8080/ws";

/**
 * One shared STOMP client for the app. The CONNECT frame carries the JWT
 * access token (mobile holds it directly, unlike the cookie-based web client).
 * See CLAUDE.md §9 and StompAuthChannelInterceptor.
 */
class WsClient {
  private client: StompClient | null = null;
  private connected = false;
  private connecting: Promise<void> | null = null;
  private subs = new Map<string, StompSubscription>();
  private listeners = new Map<string, Set<Listener<unknown>>>();

  private ensureConnected(): Promise<void> {
    if (this.connected) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>((resolve, reject) => {
      const client = new StompClient({
        brokerURL: wsUrl,
        connectHeaders: { Authorization: `Bearer ${tokenStore.getAccess() ?? ""}` },
        reconnectDelay: 3_000,
        heartbeatIncoming: 10_000,
        heartbeatOutgoing: 10_000,
        // stompjs needs an explicit factory in React Native.
        webSocketFactory: () => new WebSocket(wsUrl),
        debug: () => {},
      });

      client.onConnect = () => {
        this.connected = true;
        for (const [dest, set] of this.listeners.entries()) {
          if (set.size > 0 && !this.subs.has(dest)) this.attach(dest);
        }
        resolve();
      };
      client.onStompError = (frame) => reject(new Error(frame.headers.message ?? "STOMP error"));
      client.onWebSocketError = (e) => reject(e instanceof Error ? e : new Error("WS error"));
      client.onWebSocketClose = () => {
        this.connected = false;
        this.subs.clear();
      };
      client.activate();
      this.client = client;
    }).finally(() => {
      this.connecting = null;
    });

    return this.connecting;
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

    try {
      await this.ensureConnected();
      this.attach(destination);
    } catch {
      // Leave the listener registered; reconnect will attach it later.
    }

    return () => {
      const s = this.listeners.get(destination);
      if (!s) return;
      s.delete(listener as Listener<unknown>);
      if (s.size === 0) {
        this.subs.get(destination)?.unsubscribe();
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
