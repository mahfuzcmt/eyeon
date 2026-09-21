"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_ZOOM, DHAKA_CENTER, createBaseLayer } from "@/lib/leaflet";
import { useLocale, type StringKey } from "@/lib/i18n";
import type {
  GeofenceCreate,
  GeofenceKind,
  GeofenceNotifyOn,
  GeofenceType,
  GeofenceView,
  LatLng,
  PlaceType,
} from "@/types/domain";

const PLACE_TYPES: PlaceType[] = ["HOME", "SCHOOL", "COACHING", "MOSQUE", "HOSPITAL", "RELATIVE", "OTHER"];
/** Backend rejects trusted places under this radius: indoor GPS error alone would fire false events. */
const MIN_PLACE_RADIUS_M = 80;
const PLACE_COLOR = "#0F6B5C";
const BOUNDARY_COLOR = "#D97706";

interface Props {
  /** Decides the form: a trusted place is always a circle with a type; a boundary can be any shape. */
  kind: GeofenceKind;
  /** Present when editing; the form starts from it and the map frames it. */
  initial?: GeofenceView;
  onSubmit: (req: GeofenceCreate) => Promise<unknown>;
  onCancel: () => void;
}

export function GeofenceEditor({ kind, initial, onSubmit, onCancel }: Props) {
  const { t } = useLocale();
  const isPlace = kind === "TRUSTED_PLACE";
  const minRadius = isPlace ? MIN_PLACE_RADIUS_M : 10;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const vertexMarkersRef = useRef<L.Marker[]>([]);

  const [placeType, setPlaceType] = useState<PlaceType>(initial?.placeType ?? "HOME");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<GeofenceType>(isPlace ? "CIRCLE" : initial?.type ?? "CIRCLE");
  const [notifyOn, setNotifyOn] = useState<GeofenceNotifyOn>(initial?.notifyOn ?? "BOTH");
  const [color, setColor] = useState(initial?.color ?? (isPlace ? PLACE_COLOR : BOUNDARY_COLOR));
  const [center, setCenter] = useState<LatLng | null>(initial?.center ?? null);
  const [radiusM, setRadiusM] = useState<number>(initial?.radiusM ?? (isPlace ? 150 : 200));
  const [polygon, setPolygon] = useState<LatLng[]>(initial?.polygon ?? []);
  // A new place is named after its type ("Home") until the user types something else.
  const nameTouched = useRef(!!initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    const hasName = !!name.trim();
    const circleOk = type === "CIRCLE" ? (center !== null && radiusM >= minRadius) : true;
    const polygonOk = type === "POLYGON" ? (polygon.length >= 3) : true;
    return hasName && (type === "CIRCLE" ? circleOk : polygonOk);
  }, [name, type, center, radiusM, polygon, minRadius]);

  useEffect(() => {
    if (isPlace && !nameTouched.current) setName(t(`place.type.${placeType}` as StringKey));
  }, [isPlace, placeType, t]);

  // Init map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: DHAKA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    createBaseLayer("google-street").then((layer) => {
      if (mapRef.current === map) layer.addTo(map);
    });

    map.zoomControl.setPosition('bottomright');
    mapRef.current = map;
    // Editing: frame the existing zone instead of opening on the city.
    if (initial?.center && initial.radiusM) {
      map.fitBounds(L.latLng(initial.center.lat, initial.center.lng).toBounds(initial.radiusM * 3));
    } else if (initial && initial.polygon.length >= 3) {
      map.fitBounds(L.latLngBounds(initial.polygon.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [40, 40],
      });
    }
    // The editor mounts as an overlay whose panes settle after first paint; without
    // re-measuring, Leaflet lays tiles out for a stale size (torn tiles, wrong centre).
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      ro.disconnect();
      centerMarkerRef.current?.remove();
      centerMarkerRef.current = null;
      for (const m of vertexMarkersRef.current) m.remove();
      vertexMarkersRef.current = [];
      circleRef.current?.remove();
      polygonRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // Mount-only: `initial` is the snapshot the editor was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click handler — depends on current type
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (type === "CIRCLE") {
        setCenter(ll);
      } else {
        setPolygon((prev) => [...prev, ll]);
      }
    };

    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
    };
  }, [type]);

  // Render circle preview
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old circle
    circleRef.current?.remove();
    centerMarkerRef.current?.remove();

    if (type === "CIRCLE" && center) {
      // Draw circle
      const circle = L.circle([center.lat, center.lng], {
        radius: radiusM,
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);
      circleRef.current = circle;

      // Center marker
      const centerIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #0A1928;"></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      centerMarkerRef.current = L.marker([center.lat, center.lng], { icon: centerIcon }).addTo(map);
    }
  }, [type, center, radiusM, color]);

  // Render polygon preview + vertex markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old polygon and markers
    polygonRef.current?.remove();
    for (const m of vertexMarkersRef.current) m.remove();
    vertexMarkersRef.current = [];

    if (type === "POLYGON" && polygon.length > 0) {
      const coords = polygon.map((p) => [p.lat, p.lng] as [number, number]);

      if (polygon.length >= 3) {
        // Draw polygon
        const poly = L.polygon(coords, {
          color: color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
        polygonRef.current = poly;
      } else {
        // Draw polyline for incomplete polygon
        const line = L.polyline(coords, {
          color: color,
          weight: 2,
        }).addTo(map);
        polygonRef.current = line as unknown as L.Polygon;
      }

      // Vertex markers
      polygon.forEach((p) => {
        const vertexIcon = L.divIcon({
          html: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:1.5px solid #0A1928;"></div>`,
          className: '',
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });
        const m = L.marker([p.lat, p.lng], { icon: vertexIcon }).addTo(map);
        vertexMarkersRef.current.push(m);
      });
    }
  }, [type, polygon, color]);

  const handleSubmit = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const req: GeofenceCreate = {
        name: name.trim(),
        type,
        notifyOn,
        color,
        kind,
        ...(isPlace ? { placeType } : {}),
        ...(type === "CIRCLE"
          ? { center: center!, radiusM }
          : { polygon }),
      };
      await onSubmit(req);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2400] flex flex-col bg-white md:flex-row">
      <div className="flex max-h-[45vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-b border-surface-300 p-4 md:max-h-none md:w-80 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <div className="font-display text-[17px] font-semibold">
            {isPlace ? t(initial ? "place.edit" : "place.add") : t(initial ? "geo.edit" : "geo.new")}
          </div>
          <button type="button" className="btn-icon" aria-label={t("common.cancel")} onClick={onCancel}>
            ×
          </button>
        </div>

        {isPlace && (
          <fieldset>
            <legend className="mb-1.5 block text-[14px] text-ink-500">{t("place.kind")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {PLACE_TYPES.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  aria-pressed={pt === placeType}
                  onClick={() => setPlaceType(pt)}
                  className={`min-h-[40px] rounded-md border px-3 text-left text-[14px] font-semibold transition ${
                    pt === placeType
                      ? "border-sun-400 bg-sun-400 text-ink-900"
                      : "border-surface-300 bg-white text-ink-700 hover:bg-surface-50"
                  }`}
                >
                  {t(`place.type.${pt}` as StringKey)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className="text-[15px]">
          <span className="mb-1 block text-[14px] text-ink-400">{t("geo.name")}</span>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => {
              nameTouched.current = true;
              setName(e.target.value);
            }}
            autoFocus={!isPlace}
          />
        </label>

        {!isPlace && (
        <label className="text-[15px]">
          <span className="mb-1 block text-[14px] text-ink-400">{t("geo.shape")}</span>
          <select
            className="input"
            value={type}
            onChange={(e) => {
              const next = e.target.value as GeofenceType;
              setType(next);
              if (next === "CIRCLE") setPolygon([]);
              else setCenter(null);
            }}
          >
            <option value="CIRCLE">{t("geo.circle")}</option>
            <option value="POLYGON">{t("geo.polygon")}</option>
          </select>
        </label>
        )}

        {type === "CIRCLE" && (
          <label className="text-[15px]">
            <span className="mb-1 block text-[14px] text-ink-400">{isPlace ? t("place.size") : t("geo.radius")}</span>
            <input
              type="number"
              className="input"
              min={minRadius}
              step={10}
              value={radiusM}
              onChange={(e) => setRadiusM(Math.max(0, Number(e.target.value) || 0))}
              onBlur={() => setRadiusM((r) => Math.max(minRadius, r))}
            />
            {isPlace && <span className="mt-1 block text-[13px] text-ink-500">{t("place.sizeHint")}</span>}
          </label>
        )}

        {isPlace ? (
          <fieldset>
            <legend className="mb-1.5 block text-[14px] text-ink-500">{t("place.tellMe")}</legend>
            <div className="flex gap-4">
              {(["ENTER", "EXIT"] as const).map((side) => {
                const on = notifyOn === "BOTH" || notifyOn === side;
                return (
                  <label key={side} className="flex min-h-[40px] cursor-pointer items-center gap-2 text-[15px] text-ink-800">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-brand-500"
                      checked={on}
                      onChange={() => {
                        const arrive = side === "ENTER" ? !on : notifyOn === "BOTH" || notifyOn === "ENTER";
                        const leave = side === "EXIT" ? !on : notifyOn === "BOTH" || notifyOn === "EXIT";
                        setNotifyOn(arrive && leave ? "BOTH" : arrive ? "ENTER" : leave ? "EXIT" : "NONE");
                      }}
                    />
                    {t(side === "ENTER" ? "place.arrive" : "place.leave")}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <label className="text-[15px]">
            <span className="mb-1 block text-[14px] text-ink-400">{t("geo.notifyOn")}</span>
            <select
              className="input"
              value={notifyOn}
              onChange={(e) => setNotifyOn(e.target.value as GeofenceNotifyOn)}
            >
              <option value="ENTER">{t("geo.notifyEnter")}</option>
              <option value="EXIT">{t("geo.notifyExit")}</option>
              <option value="BOTH">{t("geo.notifyBoth")}</option>
              <option value="NONE">{t("geo.notifyNone")}</option>
            </select>
          </label>
        )}

        <label className="text-[15px]">
          <span className="mb-1 block text-[14px] text-ink-400">Color</span>
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-surface-300/30 bg-surface-100"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>

        <div className="rounded border border-dashed border-surface-300/30 p-2 text-[14px] text-ink-400">
          {isPlace ? t("place.clickMap") : type === "CIRCLE" ? t("geo.clickToSetCenter") : t("geo.clickToAddVertex")}
        </div>

        {type === "POLYGON" && polygon.length > 0 && (
          <button
            type="button"
            className="btn-ghost text-[14px]"
            onClick={() => setPolygon((prev) => prev.slice(0, -1))}
          >
            Undo last vertex ({polygon.length})
          </button>
        )}

        {error && <div className="text-[14px] text-alarm-red">{error}</div>}

        <div className="mt-auto flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!canSave || busy}
            onClick={handleSubmit}
          >
            {busy ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </div>

      <div className="relative min-h-[240px] flex-1 bg-white md:min-h-[400px]">
        <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
