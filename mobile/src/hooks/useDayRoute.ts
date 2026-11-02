import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { deviceRoute } from "@/api/endpoints";
import { dhakaTodayStartIso } from "@/format";
import type { MapRoutePiece } from "@/components/WebMap";
import type { LocationView, RoutePiece } from "@/types";

const REFRESH_MS = 60_000;
/** While the server is still matching pieces to the road. */
const PENDING_RETRY_MS = 5_000;

/**
 * Today's route of one person, as the web map draws it (GET /devices/:imei/route): standing-still
 * jitter dropped, moving parts snapped to the road, Wi-Fi estimates and long silences dashed.
 * The live position extends the last piece.
 *
 * Until 2026-11-02 the app joined every stored fix since midnight into one line, so a tracker lying
 * on a table drew a star of 20-300 m spikes around the house - one of the reasons the app's
 * location "looked wrong" while the web looked right.
 */
export function useDayRoute(imei: string, live: LocationView | null | undefined): MapRoutePiece[] {
  const [pieces, setPieces] = useState<RoutePiece[]>([]);

  useEffect(() => {
    setPieces([]);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
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
      if (!cancelled) timer = setTimeout(load, pending ? PENDING_RETRY_MS : REFRESH_MS);
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [imei]);

  return useMemo(() => {
    const out: MapRoutePiece[] = pieces
      .filter((p) => p.coords.length >= 2)
      .map((p) => ({ coords: p.coords, dashed: p.kind === "ESTIMATE" }));
    // Positions newer than the last piece: a short solid tail to where the person is now.
    const last = pieces[pieces.length - 1];
    if (live && live.valid && last && last.coords.length > 0 && Date.parse(live.ts) > Date.parse(last.to)) {
      const end = last.coords[last.coords.length - 1];
      if (end[0] !== live.latitude || end[1] !== live.longitude) {
        out.push({ coords: [end, [live.latitude, live.longitude]], dashed: false });
      }
    }
    return out;
  }, [pieces, live]);
}
