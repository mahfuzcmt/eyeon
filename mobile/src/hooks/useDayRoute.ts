import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { deviceRoute } from "@/api/endpoints";
import { dhakaTodayStartIso } from "@/format";
import type { MapRoutePiece } from "@/components/WebMap";
import type { LocationView, RoutePiece } from "@/types";

const REFRESH_MS = 60_000;
/** While the server is still matching pieces to the road. */
const PENDING_RETRY_MS = 5_000;
/** A live tail longer than this in time or distance is a guess, not a track: drawn dashed. */
const TAIL_SOLID_MAX_MS = 2 * 60_000;
const TAIL_SOLID_MAX_M = 300;

/** Metres between two [lat, lng] points (haversine). */
function metresBetween(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Today's route of one person, as the web map draws it (GET /devices/:imei/route): standing-still
 * jitter dropped, moving parts snapped to the road, Wi-Fi estimates and long silences dashed.
 * The live position extends the last piece.
 *
 * Until 2026-11-02 the app joined every stored fix since midnight into one line, so a tracker lying
 * on a table drew a star of 20-300 m spikes around the house - one of the reasons the app's
 * location "looked wrong" while the web looked right.
 */
export function useDayRoute(imei: string | null, live: LocationView | null | undefined): MapRoutePiece[] {
  const [pieces, setPieces] = useState<RoutePiece[]>([]);

  useEffect(() => {
    setPieces([]);
    if (!imei) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let loading = false;
    const load = async () => {
      if (loading) return; // the round in flight schedules the next one
      loading = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
      let pending = false;
      if (AppState.currentState === "active") {
        try {
          const r = await deviceRoute(imei, dhakaTodayStartIso());
          if (cancelled) return;
          setPieces(r.pieces);
          pending = r.snapPending;
        } catch {
          // Keep what is drawn; the next round tries again.
        }
      }
      loading = false;
      if (!cancelled) timer = setTimeout(load, pending ? PENDING_RETRY_MS : REFRESH_MS);
    };
    void load();
    // Back in the app: what is drawn is as old as the time away; do not wait out the minute.
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") void load();
    });
    return () => {
      cancelled = true;
      appSub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [imei]);

  return useMemo(() => {
    const out: MapRoutePiece[] = pieces
      .filter((p) => p.coords.length >= 2)
      .map((p) => ({ coords: p.coords, dashed: p.kind === "ESTIMATE", from: Date.parse(p.from), to: Date.parse(p.to) }));
    // Positions newer than the last piece: a tail to where the person is now. Solid only while
    // it is short (the route is a minute behind at most); after a longer gap - the app was in
    // the background, the tracker was silent - one straight line would cut across buildings as
    // if it were the way they went, so it is dashed like the server's own estimates.
    const last = pieces[pieces.length - 1];
    if (live && live.valid && last && last.coords.length > 0 && Date.parse(live.ts) > Date.parse(last.to)) {
      const end = last.coords[last.coords.length - 1];
      if (end[0] !== live.latitude || end[1] !== live.longitude) {
        const now: [number, number] = [live.latitude, live.longitude];
        const from = Date.parse(last.to);
        const to = Date.parse(live.ts);
        const dashed = to - from > TAIL_SOLID_MAX_MS || metresBetween(end, now) > TAIL_SOLID_MAX_M;
        out.push({ coords: [end, now], dashed, from, to });
      }
    }
    return imei ? out : [];
  }, [imei, pieces, live]);
}
