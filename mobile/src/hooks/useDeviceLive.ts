import { useCallback, useEffect, useState } from "react";
import { deviceLastLocation, getDevice } from "@/api/endpoints";
import { subscribeLocations } from "@/ws/stomp";
import type { DeviceView, LocationView } from "@/types";

/** One device with its last-known position, kept live over the org WS stream. */
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
          setLoc((prev) =>
            prev && new Date(prev.ts).getTime() >= new Date(u.ts).getTime() ? prev : u,
          );
        });
      }
    })();

    return () => {
      mounted = false;
      unsub?.();
    };
  }, [imei, orgId]);

  return { device, loc, loading, reloadDevice };
}
