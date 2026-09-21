"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_ZOOM, DHAKA_CENTER, createBaseLayer } from "@/lib/leaflet";
import { useLocale } from "@/lib/i18n";
import type {
  GeofenceCreate,
  GeofenceNotifyOn,
  GeofenceType,
  LatLng,
} from "@/types/domain";

interface Props {
  onSubmit: (req: GeofenceCreate) => Promise<unknown>;
  onCancel: () => void;
}

export function GeofenceEditor({ onSubmit, onCancel }: Props) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const vertexMarkersRef = useRef<L.Marker[]>([]);

  const [name, setName] = useState("");
  const [type, setType] = useState<GeofenceType>("CIRCLE");
  const [notifyOn, setNotifyOn] = useState<GeofenceNotifyOn>("BOTH");
  const [color, setColor] = useState("#E8900A");
  const [center, setCenter] = useState<LatLng | null>(null);
  const [radiusM, setRadiusM] = useState<number>(200);
  const [polygon, setPolygon] = useState<LatLng[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    const hasName = !!name.trim();
    const circleOk = type === "CIRCLE" ? (center !== null && radiusM > 0) : true;
    const polygonOk = type === "POLYGON" ? (polygon.length >= 3) : true;
    return hasName && (type === "CIRCLE" ? circleOk : polygonOk);
  }, [name, type, center, radiusM, polygon]);

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
          <div className="font-display text-[14px] font-semibold">{t("geo.new")}</div>
          <button type="button" className="text-ink-400 hover:text-ink-900" onClick={onCancel}>
            ×
          </button>
        </div>

        <label className="text-[14px]">
          <span className="mb-1 block text-[13px] text-ink-400">{t("geo.name")}</span>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="text-[14px]">
          <span className="mb-1 block text-[13px] text-ink-400">{t("geo.shape")}</span>
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

        {type === "CIRCLE" && (
          <label className="text-[14px]">
            <span className="mb-1 block text-[13px] text-ink-400">{t("geo.radius")}</span>
            <input
              type="number"
              className="input"
              min={10}
              step={10}
              value={radiusM}
              onChange={(e) => setRadiusM(Math.max(10, Number(e.target.value) || 0))}
            />
          </label>
        )}

        <label className="text-[14px]">
          <span className="mb-1 block text-[13px] text-ink-400">{t("geo.notifyOn")}</span>
          <select
            className="input"
            value={notifyOn}
            onChange={(e) => setNotifyOn(e.target.value as GeofenceNotifyOn)}
          >
            <option value="ENTER">{t("geo.notifyEnter")}</option>
            <option value="EXIT">{t("geo.notifyExit")}</option>
            <option value="BOTH">{t("geo.notifyBoth")}</option>
          </select>
        </label>

        <label className="text-[14px]">
          <span className="mb-1 block text-[13px] text-ink-400">Color</span>
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-surface-300/30 bg-surface-100"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>

        <div className="rounded border border-dashed border-surface-300/30 p-2 text-[13px] text-ink-400">
          {type === "CIRCLE" ? t("geo.clickToSetCenter") : t("geo.clickToAddVertex")}
        </div>

        {type === "POLYGON" && polygon.length > 0 && (
          <button
            type="button"
            className="btn-ghost text-[13px]"
            onClick={() => setPolygon((prev) => prev.slice(0, -1))}
          >
            Undo last vertex ({polygon.length})
          </button>
        )}

        {error && <div className="text-[13px] text-alarm-red">{error}</div>}

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
