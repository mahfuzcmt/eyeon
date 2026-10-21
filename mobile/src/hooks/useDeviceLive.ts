import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { deviceLastLocation, getDevice } from "@/api/endpoints";
import { subscribeLocations } from "@/ws/stomp";
import { mergeLive } from "@/hooks/useLiveLocations";
import type { DeviceView, LocationView } from "@/types";

/** REST fallback while the socket is down or slow: the server's last-known position. */
const POLL_MS = 10_000;

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
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void poll();
    }, POLL_MS);
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") void poll();
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
