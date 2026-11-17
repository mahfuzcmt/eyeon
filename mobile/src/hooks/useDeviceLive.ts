import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { deviceLastLocation, getDevice } from "@/api/endpoints";
import { isWsConnected, subscribeLocations } from "@/ws/stomp";
import { mergeLive } from "@/hooks/useLiveLocations";
import type { DeviceView, LocationView } from "@/types";

/** REST fallback while the socket is down or slow: the server's last-known position. */
const POLL_MS = 10_000;
/** The device row (online / offline, battery, last seen) is read again this often while the app is open. */
const DEVICE_RELOAD_MS = 30_000;

/** One device with its last-known position, kept live over the WS stream with a REST fallback. */
export function useDeviceLive(imei: string, orgId: string | null) {
  const [device, setDevice] = useState<DeviceView | null>(null);
  const [loc, setLoc] = useState<LocationView | null>(null);
  const [loading, setLoading] = useState(true);

  /** Re-fetch the device row (e.g. after an engine cut/restore command). */
  const reloadDevice = useCallback(async () => {
    try {
      setDevice(await getDevice(imei));
    } catch {
      /* keep prior state */
    }
  }, [imei]);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;
    const newer = (u: LocationView) => (prev: LocationView | null) =>
      prev && new Date(prev.ts).getTime() >= new Date(u.ts).getTime() ? prev : mergeLive(prev, u);
    const poll = async () => {
      try {
        const l = await deviceLastLocation(imei);
        if (mounted && l) setLoc(newer(l));
      } catch {
        /* keep prior state */
      }
    };
    // The device row was loaded once, so on the Track and Statistics tabs the online / offline
    // state, the state pill, the marker colour and the battery stayed as they were when the
    // screen opened. It never comes over the socket: read it again on a timer and on resume.
    const loadDevice = async () => {
      try {
        const d = await getDevice(imei);
        if (mounted) setDevice(d);
      } catch {
        /* keep prior state */
      }
    };
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      if (AppState.currentState !== "active") return;
      if (!isWsConnected() || tick % 2 === 0) void poll();
      if (tick % (DEVICE_RELOAD_MS / (POLL_MS / 2)) === 0) void loadDevice();
    }, POLL_MS / 2);
    const appSub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      void poll();
      void loadDevice();
    });

    (async () => {
      try {
        const [d, l] = await Promise.all([getDevice(imei), deviceLastLocation(imei)]);
        if (mounted) {
          setDevice(d);
          setLoc(l);
        }
      } catch {
        /* leave nulls */
      } finally {
        if (mounted) setLoading(false);
      }

      if (orgId) {
        unsub = await subscribeLocations(orgId, (u) => {
          if (!mounted || u.imei !== imei) return;
          setLoc(newer(u));
        });
      }
    })();

    return () => {
      mounted = false;
      clearInterval(timer);
      appSub.remove();
      unsub?.();
    };
  }, [imei, orgId]);

  return { device, loc, loading, reloadDevice };
}
