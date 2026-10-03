"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import type { RoutePiece, RouteData, StayView, StaysResult } from "@/types/domain";

const REFRESH_MS = 60_000;
const PENDING_RETRY_MS = 5_000;

/**
 * The selected person's route since `fromIso` (road-snapped pieces, GET /devices/:imei/route)
 * and their stays (GET /devices/:imei/stays) for the map. Refreshed every minute; while the
 * server is still snapping pieces to the road it is asked again after a few seconds.
 */
export function useDayRoute(imei: string | null, fromIso: string): { pieces: RoutePiece[]; stays: StayView[] } {
  const { locale } = useLocale();
  const [pieces, setPieces] = useState<RoutePiece[]>([]);
  const [stays, setStays] = useState<StayView[]>([]);

  useEffect(() => {
    setPieces([]);
    setStays([]);
    if (!imei) return;
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      let pending = false;
      try {
        const [r, s] = await Promise.all([
          api.get<RouteData>(`/devices/${imei}/route`, { params: { from: fromIso }, timeout: 30_000 }),
          api.get<StaysResult>(`/devices/${imei}/stays`, { params: { from: fromIso, lang: locale } }),
        ]);
        if (cancelled) return;
        setPieces(r.data.pieces);
        setStays(s.data.stays);
        pending = r.data.snapPending || s.data.namesPending;
      } catch {
        // Keep what is drawn; the next refresh tries again.
      }
      if (!cancelled) timer = window.setTimeout(load, pending ? PENDING_RETRY_MS : REFRESH_MS);
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [imei, fromIso, locale]);

  return { pieces, stays };
}
