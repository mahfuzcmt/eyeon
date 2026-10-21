"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, extractError } from "@/lib/api";
import { DHAKA_CENTER, createBaseLayer } from "@/lib/leaflet";
import { formatNumber } from "@/lib/format";
import { useLocale, type StringKey } from "@/lib/i18n";
import type {
  GeofenceView,
  LatLng,
  PlaceRoute,
  PlaceSchedule,
  RouteDirection,
  RouteMode,
  RouteSnap,
} from "@/types/domain";

const DIRECTIONS: RouteDirection[] = ["TO", "FROM"];
const WIDTHS: number[] = [50, 100, 150, 200, 300];
const ROUTE_COLOR = "#0F6B5C";
const OTHER_COLOR = "#637370";

interface Props {
  place: GeofenceView;
  onClose: () => void;
}

/**
 * The usual way to and from one trusted place. The parent taps the other end and a few turns;
 * the place itself is always the far end of "to" and the start of "from", so it is never tapped.
 * The line is snapped to the roads by the server. While a trip is expected (see the hints) the
 * server compares every fix with the line and tells the owner when the person takes another way.
 */
export function RoutesDialog({ place, onClose }: Props) {
  const { t, locale } = useLocale();
  const anchor: LatLng | null = place.center;
  const [direction, setDirection] = useState<RouteDirection>("TO");
  const [saved, setSaved] = useState<PlaceRoute[]>([]);
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [taps, setTaps] = useState<LatLng[]>([]);
  const [mode, setMode] = useState<RouteMode>("VEHICLE");
  const [width, setWidth] = useState(100);
  const [snap, setSnap] = useState<RouteSnap | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const snapSeq = useRef(0);

  const current = saved.find((r) => r.direction === direction) ?? null;
  const other = saved.find((r) => r.direction !== direction) ?? null;

  /** The tapped points plus the place at the right end. */
  const waypoints = useMemo<LatLng[]>(() => {
    if (!anchor) return taps;
    return direction === "TO" ? [...taps, anchor] : [anchor, ...taps];
  }, [taps, anchor, direction]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        api.get<PlaceRoute[]>(`/geofences/${place.id}/routes`),
        api.get<PlaceSchedule[]>(`/geofences/${place.id}/schedules`),
      ]);
      setSaved(r.data);
      setSchedules(s.data);
      setError(null);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  }, [place.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Switching direction (or loading) starts the form from what is saved for it.
  useEffect(() => {
    const r = saved.find((x) => x.direction === direction);
    if (r) {
      const pts = r.waypoints;
      setTaps(direction === "TO" ? pts.slice(0, -1) : pts.slice(1));
      setMode(r.mode);
      setWidth(r.widthM);
      setSnap({ path: r.path, lengthM: r.lengthM, roads: true });
    } else {
      setTaps([]);
      setSnap(null);
    }
    setDirty(false);
  }, [saved, direction]);

  // Map, once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: anchor ? [anchor.lat, anchor.lng] : DHAKA_CENTER,
      zoom: 15,
      zoomControl: true,
    });
    map.zoomControl.setPosition("bottomright");
    createBaseLayer().then((layer) => {
      if (mapRef.current === map) layer.addTo(map);
    });
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 120);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // Mount-only: the place does not change while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tapping the map adds a point.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      setTaps((prev) => (prev.length >= 23 ? prev : [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]));
      setDirty(true);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, []);

  // Snap the edited points to the roads; a newer edit wins over a slower answer.
  useEffect(() => {
    if (!dirty) return;
    if (waypoints.length < 2) {
      setSnap(null);
      return;
    }
    const seq = ++snapSeq.current;
    setSnapping(true);
    const timer = setTimeout(async () => {
      try {
        const r = await api.post<RouteSnap>("/geofences/routes/snap", { points: waypoints, mode });
        if (seq === snapSeq.current) setSnap(r.data);
      } catch (err) {
        if (seq === snapSeq.current) setError(extractError(err).message);
      } finally {
        if (seq === snapSeq.current) setSnapping(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [waypoints, mode, dirty]);

  // Draw: the place, the other direction faintly, this route, the tapped points.
  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;
    if (!map || !group) return;
    group.clearLayers();
    if (anchor && place.radiusM) {
      L.circle([anchor.lat, anchor.lng], {
        radius: place.radiusM,
        color: ROUTE_COLOR,
        weight: 2,
        fillOpacity: 0.12,
      }).addTo(group);
    }
    if (other) {
      L.polyline(other.path.map((p) => [p.lat, p.lng] as [number, number]), {
        color: OTHER_COLOR,
        weight: 4,
        opacity: 0.6,
        dashArray: "6 8",
      }).addTo(group);
    }
    const line = snap?.path ?? (waypoints.length >= 2 ? waypoints : []);
    if (line.length >= 2) {
      const latlngs = line.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latlngs, { color: "#ffffff", weight: 9, opacity: 0.9 }).addTo(group);
      L.polyline(latlngs, {
        color: ROUTE_COLOR,
        weight: 5,
        dashArray: snap && !snap.roads ? "8 8" : undefined,
      }).addTo(group);
    }
    taps.forEach((p, i) => {
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:9999px;background:${ROUTE_COLOR};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font:600 13px/1 sans-serif">${i + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        interactive: false,
      }).addTo(group);
    });
  }, [snap, taps, waypoints, other, anchor, place.radiusM]);

  // Frame a saved route when it is shown.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || dirty) return;
    const pts = [...(current?.path ?? []), ...(other?.path ?? [])];
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30] });
    }
  }, [current, other, dirty]);

  const save = async () => {
    if (!snap || waypoints.length < 2) {
      setError(t("route.tapMore"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.put<PlaceRoute>(`/geofences/${place.id}/routes/${direction}`, {
        mode,
        waypoints,
        path: snap.path,
        widthM: width,
      });
      await load();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/geofences/${place.id}/routes/${direction}`);
      await load();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const neededKind = direction === "TO" ? "ARRIVE_BY" : "LEAVE_BY";
  const hasTime = schedules.some((s) => s.kind === neededKind && s.active);
  const title = (d: RouteDirection) => t(`route.${d}` as StringKey).replace("{place}", place.name);
  const km = snap ? formatNumber(Math.round(snap.lengthM / 100) / 10, locale) : null;
  const canSave = !busy && !snapping && !!snap && waypoints.length >= 2 && (dirty || width !== current?.widthM);

  return (
    <div
      className="fixed inset-0 z-[2400] flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("route.title")}
    >
      <div className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[92dvh] sm:rounded-2xl">
        <div className="px-5 pt-4 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">{t("route.title")}</h2>
          <p className="text-[15px] font-semibold text-brand-500">{place.name}</p>
          <p className="mt-1 text-[14px] text-ink-500">{t("route.hint")}</p>
          <div className="mt-3 flex gap-2" role="tablist">
            {DIRECTIONS.map((d) => {
              const on = d === direction;
              const has = saved.some((r) => r.direction === d);
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setDirection(d)}
                  className={`flex-1 rounded-lg px-3 py-2 text-left text-[14px] font-semibold ${on ? "bg-brand-500 text-white" : "bg-surface-100 text-ink-700"}`}
                >
                  <span className="block truncate">{title(d)}</span>
                  <span className={`block text-[13px] font-normal ${on ? "text-white/90" : "text-ink-500"}`}>
                    {has ? t("route.saved") : t("route.notSet")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-3 h-[44dvh] min-h-[260px] w-full bg-surface-100">
          <div ref={containerRef} className="h-full w-full" />
          {(snapping || loading) && (
            <div className="absolute left-3 top-3 z-[1000] rounded-full bg-white px-3 py-1 text-[14px] text-ink-700 shadow">
              {loading ? t("common.loading") : t("route.snapping")}
            </div>
          )}
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          <p className="text-[14px] text-ink-500">{t(direction === "TO" ? "route.whenTO" : "route.whenFROM")}</p>
          {!loading && !hasTime && (
            <p className="mt-2 rounded-lg bg-sun-100 px-3 py-2 text-[14px] text-ink-900">
              {t("route.needTime").replace("{kind}", t(direction === "TO" ? "route.kindArrive" : "route.kindLeave"))}
            </p>
          )}
          {snap && !snap.roads && !snapping && (
            <p className="mt-2 text-[14px] text-alarm-amber">{t("route.straight")}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["VEHICLE", "WALK"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setDirty(true);
                }}
                className={`rounded-full px-3 py-1.5 text-[14px] font-semibold ${mode === m ? "bg-brand-500 text-white" : "bg-white text-ink-700 ring-1 ring-surface-300"}`}
              >
                {t(m === "WALK" ? "route.walk" : "route.vehicle")}
              </button>
            ))}
            <span className="ml-auto text-[14px] text-ink-700">
              {t("route.points").replace("{n}", formatNumber(waypoints.length, locale))}
              {km && <> · {t("route.length").replace("{km}", km)}</>}
            </span>
          </div>

          <label className="mt-3 flex items-center gap-3">
            <span className="flex-1 text-[15px] font-semibold text-ink-900">{t("route.width")}</span>
            <select
              className="input w-28 text-[15px]"
              value={width}
              aria-label={t("route.width")}
              onChange={(e) => setWidth(Number(e.target.value))}
            >
              {WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {formatNumber(w, locale)} m
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={taps.length === 0}
              onClick={() => {
                setTaps((p) => p.slice(0, -1));
                setDirty(true);
              }}
            >
              {t("route.undo")}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={taps.length === 0}
              onClick={() => {
                setTaps([]);
                setDirty(true);
              }}
            >
              {t("route.clear")}
            </button>
            {current && (
              <button type="button" className="btn-ghost text-alarm-red" disabled={busy} onClick={remove}>
                {t("common.delete")}
              </button>
            )}
          </div>

          {error && <div className="mt-3 text-[14px] text-alarm-red">{error}</div>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-ghost px-4" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="button" className="btn-primary px-4" disabled={!canSave} onClick={save}>
              {busy ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
