"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, extractError } from "@/lib/api";
import { DHAKA_CENTER, createBaseLayer } from "@/lib/leaflet";
import { formatClockTime, formatNumber } from "@/lib/format";
import { useDevices } from "@/hooks/useDevices";
import { ClockTimePicker } from "@/components/time/ClockTimePicker";
import { useLocale, type StringKey } from "@/lib/i18n";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type {
  GeofenceView,
  LatLng,
  PlaceRoute,
  PlaceSchedule,
  RouteCandidate,
  RouteDirection,
  RouteMode,
  RouteSnap,
} from "@/types/domain";

const DIRECTIONS: RouteDirection[] = ["TO", "FROM"];
const WIDTHS: number[] = [50, 100, 150, 200, 300];
/** Shown Sunday first: the school week in Bangladesh runs Sunday to Thursday. ISO numbers, 7 = Sunday. */
const WEEK: number[] = [7, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS: number[] = [7, 1, 2, 3, 4];
const LEVELS = ["INFO", "WARNING", "CRITICAL"] as const;
type Level = (typeof LEVELS)[number];
const MAX_ROUTES = 10;
const ROUTE_COLOR = "#0F6B5C";
const OTHER_COLOR = "#637370";

interface Props {
  place: GeofenceView;
  onClose: () => void;
}

function shift(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 55, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Today's date in Dhaka as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
}

/**
 * The usual routes to and from one trusted place: several each way ("Home to School", "Coaching to
 * here"), each with its own days, hours and alert level. The parent taps the other end and a few
 * turns, or picks a trip the person really made; the place itself is always the far end of "to"
 * and the start of "from", so it is never tapped. During a route's hours the server compares every
 * fix with the line and tells the owner when the person takes another way.
 */
export function RoutesDialog({ place, onClose }: Props) {
  const { t, locale } = useLocale();
  const { devices } = useDevices();
  const anchor: LatLng | null = place.center;
  const [direction, setDirection] = useState<RouteDirection>("TO");
  const [saved, setSaved] = useState<PlaceRoute[]>([]);
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [places, setPlaces] = useState<GeofenceView[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  /** The route being edited, or "new". */
  const [selectedId, setSelectedId] = useState<string>("new");
  const [name, setName] = useState("");
  const [otherId, setOtherId] = useState("");
  const [days, setDays] = useState<number[]>(SCHOOL_DAYS);
  const [timeFrom, setTimeFrom] = useState("07:00");
  const [timeTo, setTimeTo] = useState("09:00");
  const [level, setLevel] = useState<Level>("WARNING");
  const [taps, setTaps] = useState<LatLng[]>([]);
  const [mode, setMode] = useState<RouteMode>("VEHICLE");
  const [width, setWidth] = useState(100);
  const [snap, setSnap] = useState<RouteSnap | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [histImei, setHistImei] = useState("");
  const [histDate, setHistDate] = useState(dhakaToday);
  const [trips, setTrips] = useState<RouteCandidate[] | null>(null);
  const [finding, setFinding] = useState(false);

  useEscapeKey(onClose, !busy);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const snapSeq = useRef(0);
  /** Set when the line was copied (other direction, past trip): keep it exactly, do not ask the road service. */
  const skipSnap = useRef(false);

  const inDirection = useMemo(() => saved.filter((r) => r.direction === direction), [saved, direction]);
  const current = saved.find((r) => r.id === selectedId) ?? null;
  /** The route the other way that this one would mirror: between the same two places when there is one. */
  const other = useMemo(() => {
    const opposite = saved.filter((r) => r.direction !== direction);
    return opposite.find((r) => (r.otherGeofenceId ?? "") === otherId) ?? opposite[0] ?? null;
  }, [saved, direction, otherId]);

  /** The tapped points plus the place at the right end. */
  const waypoints = useMemo<LatLng[]>(() => {
    if (!anchor) return taps;
    return direction === "TO" ? [...taps, anchor] : [anchor, ...taps];
  }, [taps, anchor, direction]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s, g, d] = await Promise.all([
        api.get<PlaceRoute[]>(`/geofences/${place.id}/routes`),
        api.get<PlaceSchedule[]>(`/geofences/${place.id}/schedules`),
        api.get<GeofenceView[]>("/geofences", { params: { kind: "TRUSTED_PLACE" } }),
        api.get<string[]>(`/geofences/${place.id}/devices`),
      ]);
      setSaved(r.data);
      setSchedules(s.data);
      setPlaces(g.data.filter((x) => x.id !== place.id));
      setAssigned(d.data);
      setHistImei((prev) => prev || d.data[0] || "");
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

  // A direction shows its first route, or an empty form when it has none.
  useEffect(() => {
    if (selectedId !== "new" && inDirection.some((r) => r.id === selectedId)) return;
    if (selectedId === "new" && inDirection.length === 0) return;
    if (selectedId === "new" && dirty) return;
    setSelectedId(inDirection[0]?.id ?? "new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inDirection]);

  /** Hours for a route that has none yet: around the place's expected time when it has one. */
  const defaultHours = useCallback((): { days: number[]; from: string; to: string } => {
    const kind = direction === "TO" ? "ARRIVE_BY" : "LEAVE_BY";
    const s = schedules.find((x) => x.kind === kind && x.active);
    if (s) {
      return direction === "TO"
        ? { days: s.weekdays, from: shift(s.time, -60), to: shift(s.time, 30) }
        : { days: s.weekdays, from: shift(s.time, -30), to: shift(s.time, 120) };
    }
    return direction === "TO"
      ? { days: SCHOOL_DAYS, from: "07:00", to: "09:00" }
      : { days: SCHOOL_DAYS, from: "12:00", to: "15:00" };
  }, [direction, schedules]);

  // Choosing a route (or loading) starts the form from what is saved for it.
  useEffect(() => {
    const r = saved.find((x) => x.id === selectedId);
    const hours = defaultHours();
    if (r) {
      const pts = r.waypoints;
      setTaps(r.direction === "TO" ? pts.slice(0, -1) : pts.slice(1));
      setMode(r.mode);
      setWidth(r.widthM);
      setSnap({ path: r.path, lengthM: r.lengthM, roads: true });
      setName(r.name ?? "");
      setOtherId(r.otherGeofenceId ?? "");
      setLevel(r.severity ?? "WARNING");
      setDays(r.weekdays ?? hours.days);
      setTimeFrom(r.timeFrom ?? hours.from);
      setTimeTo(r.timeTo ?? hours.to);
    } else {
      setTaps([]);
      setSnap(null);
      setName("");
      setOtherId("");
      setLevel("WARNING");
      setDays(hours.days);
      setTimeFrom(hours.from);
      setTimeTo(hours.to);
    }
    setTrips(null);
    setDirty(false);
  }, [saved, selectedId, defaultHours]);

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
    if (skipSnap.current) {
      skipSnap.current = false;
      return;
    }
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

  /** The other direction's road, reversed: the usual case of coming back the way they went. */
  const copyOther = () => {
    if (!other) return;
    const otherTaps = other.direction === "TO" ? other.waypoints.slice(0, -1) : other.waypoints.slice(1);
    snapSeq.current++;
    skipSnap.current = true;
    setSnapping(false);
    setTaps([...otherTaps].reverse());
    setMode(other.mode);
    setWidth(other.widthM);
    setSnap({ path: [...other.path].reverse(), lengthM: other.lengthM, roads: true });
    setDirty(true);
  };

  /** A trip the person really made, as the line. */
  const applyTrip = (c: RouteCandidate) => {
    const pts = direction === "TO" ? c.waypoints.slice(0, -1) : c.waypoints.slice(1);
    snapSeq.current++;
    skipSnap.current = true;
    setSnapping(false);
    setTaps(pts.slice(0, 23));
    setSnap({ path: c.path, lengthM: c.lengthM, roads: true });
    setDirty(true);
    const map = mapRef.current;
    if (map && c.path.length >= 2) {
      map.fitBounds(L.latLngBounds(c.path.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30] });
    }
  };

  const findTrips = async () => {
    if (!histImei) return;
    setFinding(true);
    setError(null);
    try {
      const r = await api.post<RouteCandidate[]>(`/geofences/${place.id}/routes/from-history`, {
        imei: histImei,
        date: histDate,
        direction,
      });
      setTrips(r.data);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setFinding(false);
    }
  };

  const otherPlace = places.find((p) => p.id === otherId) ?? null;
  const title = (d: RouteDirection) => t(`route.${d}` as StringKey).replace("{place}", place.name);
  /** What a route is called when the parent gave it no name. */
  const autoName = (d: RouteDirection, otherName: string | null) =>
    otherName ? (d === "TO" ? `${otherName} → ${place.name}` : `${place.name} → ${otherName}`) : title(d);

  const save = async () => {
    if (!snap || waypoints.length < 2) {
      setError(t("route.tapMore"));
      return;
    }
    if (days.length === 0) {
      setError(t("route.needDays"));
      return;
    }
    if (timeFrom >= timeTo) {
      setError(t("route.timeOrder"));
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      direction,
      name: name.trim() || autoName(direction, otherPlace?.name ?? null),
      mode,
      waypoints,
      path: snap.path,
      widthM: width,
      otherGeofenceId: otherId || null,
      weekdays: days,
      timeFrom,
      timeTo,
      severity: level,
    };
    try {
      const r = current
        ? await api.put<PlaceRoute>(`/geofences/${place.id}/routes/${current.id}`, body)
        : await api.post<PlaceRoute>(`/geofences/${place.id}/routes`, body);
      setDirty(false);
      setSelectedId(r.data.id);
      await load();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!current || !window.confirm(t("route.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/geofences/${place.id}/routes/${current.id}`);
      setSelectedId("new");
      await load();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const bn = locale === "bn";
  const km = snap ? formatNumber(Math.round(snap.lengthM / 100) / 10, locale) : null;
  const canSave = !busy && !snapping && !!snap && waypoints.length >= 2;
  const dayNames = (list: number[]) => WEEK.filter((d) => list.includes(d)).map((d) => t(`day.${d}` as StringKey)).join(" ");
  const personName = (imei: string) => devices.find((d) => d.imei === imei)?.name || imei;
  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

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
              const count = saved.filter((r) => r.direction === d).length;
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
                    {count > 0 ? t("route.count").replace("{n}", formatNumber(count, locale)) : t("route.notSet")}
                  </span>
                </button>
              );
            })}
          </div>
          {(inDirection.length > 0 || selectedId !== "new") && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {inDirection.map((r) => {
                const on = r.id === selectedId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelectedId(r.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-left text-[14px] ${on ? "bg-brand-50 text-brand-600 ring-2 ring-brand-500" : "bg-white text-ink-700 ring-1 ring-surface-300"}`}
                  >
                    <span className="block max-w-[220px] truncate font-semibold">{r.name || title(r.direction)}</span>
                    <span className="block text-[13px] text-ink-500">
                      {r.weekdays && r.timeFrom && r.timeTo
                        ? `${dayNames(r.weekdays)} · ${formatClockTime(r.timeFrom, locale)} – ${formatClockTime(r.timeTo, locale)}`
                        : t("route.followsTime")}
                    </span>
                  </button>
                );
              })}
              {inDirection.length < MAX_ROUTES && (
                <button
                  type="button"
                  aria-pressed={selectedId === "new"}
                  onClick={() => setSelectedId("new")}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[14px] font-semibold ${selectedId === "new" ? "bg-brand-50 text-brand-600 ring-2 ring-brand-500" : "bg-white text-brand-600 ring-1 ring-surface-300"}`}
                >
                  + {t("route.add")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="relative mt-3 h-[38dvh] min-h-[260px] w-full bg-surface-100">
          <div ref={containerRef} className="h-full w-full" />
          {(snapping || loading) && (
            <div className="absolute left-3 top-3 z-[1000] rounded-full bg-white px-3 py-1 text-[14px] text-ink-700 shadow">
              {loading ? t("common.loading") : t("route.snapping")}
            </div>
          )}
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[14px] font-semibold text-ink-900">{t("route.name")}</span>
              <input
                className="input mt-1 w-full text-[15px]"
                value={name}
                maxLength={80}
                placeholder={autoName(direction, otherPlace?.name ?? null)}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[14px] font-semibold text-ink-900">
                {t(direction === "TO" ? "route.otherTO" : "route.otherFROM")}
              </span>
              <select className="input mt-1 w-full text-[15px]" value={otherId} onChange={(e) => setOtherId(e.target.value)}>
                <option value="">{t("route.otherNone")}</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {direction === "TO" && <p className="mt-1 text-[13px] text-ink-500">{t("route.otherHint")}</p>}

          <div className="mt-4 text-[14px] font-semibold text-ink-900">{t("route.days")}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={`min-w-[46px] rounded-full px-3 py-1.5 text-[14px] font-semibold ${on ? "bg-brand-500 text-white" : "bg-white text-ink-700 ring-1 ring-surface-300"}`}
                >
                  {t(`day.${d}` as StringKey)}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ClockTimePicker value={timeFrom} onChange={setTimeFrom} locale={bn ? "bn" : "en"} label={t("route.from")} />
            <span className="text-[14px] text-ink-500">{t("route.until")}</span>
            <ClockTimePicker value={timeTo} onChange={setTimeTo} locale={bn ? "bn" : "en"} label={t("route.until")} />
          </div>
          <p className="mt-2 text-[14px] text-ink-500">
            {t(direction === "TO" ? "route.whenOwnTO" : "route.whenOwnFROM").replace("{place}", place.name)}
          </p>
          {current && !current.weekdays && (
            <p className="mt-2 rounded-lg bg-sun-100 px-3 py-2 text-[14px] text-ink-900">{t("route.legacy")}</p>
          )}

          <div className="mt-4 text-[14px] font-semibold text-ink-900">{t("route.level")}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className={`rounded-full px-3 py-1.5 text-[14px] font-semibold ${
                  level === l
                    ? l === "CRITICAL"
                      ? "bg-alarm-red text-white"
                      : l === "WARNING"
                        ? "bg-alarm-amber text-white"
                        : "bg-brand-500 text-white"
                    : "bg-white text-ink-700 ring-1 ring-surface-300"
                }`}
              >
                {t(`severity.${l}` as StringKey)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[13px] text-ink-500">{t(`route.level.${level}` as StringKey)}</p>

          <div className="mt-4 rounded-xl bg-surface-100 p-3">
            <div className="text-[14px] font-semibold text-ink-900">{t("route.history")}</div>
            <p className="text-[13px] text-ink-500">{t("route.historyHint")}</p>
            {assigned.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-700">{t("route.historyNobody")}</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  className="input w-44 text-[15px]"
                  value={histImei}
                  aria-label={t("route.person")}
                  onChange={(e) => {
                    setHistImei(e.target.value);
                    setTrips(null);
                  }}
                >
                  {assigned.map((imei) => (
                    <option key={imei} value={imei}>
                      {personName(imei)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input w-44 text-[15px]"
                  value={histDate}
                  max={dhakaToday()}
                  aria-label={t("route.date")}
                  onChange={(e) => {
                    setHistDate(e.target.value);
                    setTrips(null);
                  }}
                />
                <button type="button" className="btn-secondary" disabled={finding || !histImei || !histDate} onClick={findTrips}>
                  {finding ? t("common.loading") : t("route.find")}
                </button>
              </div>
            )}
            {trips && trips.length === 0 && <p className="mt-2 text-[14px] text-ink-700">{t("route.noTrips")}</p>}
            {trips && trips.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {trips.map((c) => (
                  <li key={c.from} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
                    <span className="flex-1 text-[14px] text-ink-900">
                      {formatClockTime(c.from, locale)} – {formatClockTime(c.to, locale)} ·{" "}
                      {t("route.length").replace("{km}", formatNumber(Math.round(c.lengthM / 100) / 10, locale))}
                    </span>
                    <button type="button" className="btn-secondary" onClick={() => applyTrip(c)}>
                      {t("route.useTrip")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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

          {other && (
            <button type="button" className="btn-secondary mt-3 w-full" disabled={busy} onClick={copyOther}>
              {t(other.direction === "TO" ? "route.sameTO" : "route.sameFROM")}
            </button>
          )}

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
