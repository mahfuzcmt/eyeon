"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface TimePoint {
  /** Epoch millis. */
  t: number;
  v: number;
}

interface Props {
  points: TimePoint[];
  /** Series color — keep to the validated chart palette (see chartColors). */
  color: string;
  title: string;
  unit: string;
  height?: number;
  /** Anchor the y-axis at zero (speeds); otherwise pad around min/max (voltage). */
  yFromZero?: boolean;
  emptyText?: string;
  formatValue?: (v: number) => string;
}

/** Palette validated with the dataviz six-checks script (light surface). */
export const chartColors = {
  speed: "#2563EB",
  voltage: "#C2410C",
} as const;

const MARGIN = { top: 8, right: 12, bottom: 20, left: 42 };
const MAX_DRAWN_POINTS = 1200;

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Keep min+max per bucket so spikes and dips survive downsampling. */
function downsample(points: TimePoint[]): TimePoint[] {
  if (points.length <= MAX_DRAWN_POINTS) return points;
  const buckets = Math.floor(MAX_DRAWN_POINTS / 2);
  const size = points.length / buckets;
  const out: TimePoint[] = [];
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(points.length, Math.floor((b + 1) * size));
    if (start >= end) continue;
    let min = points[start];
    let max = points[start];
    for (let i = start + 1; i < end; i++) {
      if (points[i].v < min.v) min = points[i];
      if (points[i].v > max.v) max = points[i];
    }
    if (min.t <= max.t) {
      out.push(min);
      if (max !== min) out.push(max);
    } else {
      out.push(max, min);
    }
  }
  return out;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) max = min + 1;
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const niceStep = step * mult;
  const start = Math.ceil(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += niceStep) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function TimeSeriesChart({
  points,
  color,
  title,
  unit,
  height = 160,
  yFromZero = false,
  emptyText = "No data",
  formatValue = (v) => String(Math.round(v * 100) / 100),
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => downsample([...points].sort((a, b) => a.t - b.t)), [points]);

  const plot = useMemo(() => {
    if (data.length < 2) return null;
    const t0 = data[0].t;
    const t1 = data[data.length - 1].t;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (const p of data) {
      if (p.v < vMin) vMin = p.v;
      if (p.v > vMax) vMax = p.v;
    }
    if (yFromZero) vMin = 0;
    if (vMax === vMin) vMax = vMin + 1;
    const pad = (vMax - vMin) * 0.08;
    const yMin = yFromZero ? 0 : vMin - pad;
    const yMax = vMax + pad;

    const iw = Math.max(50, width - MARGIN.left - MARGIN.right);
    const ih = height - MARGIN.top - MARGIN.bottom;
    const x = (t: number) => MARGIN.left + ((t - t0) / Math.max(1, t1 - t0)) * iw;
    const y = (v: number) => MARGIN.top + ih - ((v - yMin) / (yMax - yMin)) * ih;

    const path = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    const yTicks = niceTicks(yMin, yMax).filter((v) => v >= yMin && v <= yMax);
    const xTickCount = Math.max(2, Math.min(6, Math.floor(iw / 90)));
    const xTicks = Array.from({ length: xTickCount }, (_, i) => t0 + ((t1 - t0) * i) / (xTickCount - 1));
    return { t0, t1, x, y, path, yTicks, xTicks, ih, iw };
  }, [data, width, height, yFromZero]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!plot || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    // Nearest point by x — gives a hit target far bigger than the mark itself.
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(plot.x(data[i].t) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHoverIdx(best);
  }

  const hover = hoverIdx != null && plot ? data[hoverIdx] : null;

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[13px] font-semibold text-ink-900">{title}</span>
        <span className="text-[11px] text-ink-400">{unit}</span>
        {hover && (
          <span className="ml-auto text-[12px] font-medium text-ink-700">
            {timeFmt.format(new Date(hover.t))} · <span style={{ color }}>{formatValue(hover.v)} {unit}</span>
          </span>
        )}
      </div>
      {!plot ? (
        <div
          className="flex items-center justify-center rounded-sm border border-surface-200 bg-surface-50 text-[13px] text-ink-400"
          style={{ height }}
        >
          {emptyText}
        </div>
      ) : (
        <svg
          role="img"
          aria-label={`${title} over time`}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="block"
        >
          {plot.yTicks.map((v) => (
            <g key={`y${v}`}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={plot.y(v)}
                y2={plot.y(v)}
                stroke="#E2E8F0"
                strokeWidth={1}
              />
              <text x={MARGIN.left - 6} y={plot.y(v) + 3} textAnchor="end" fontSize={9} fill="#64748B">
                {formatValue(v)}
              </text>
            </g>
          ))}
          {plot.xTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={plot.x(t)}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === plot.xTicks.length - 1 ? "end" : "middle"}
              fontSize={9}
              fill="#64748B"
            >
              {timeFmt.format(new Date(t))}
            </text>
          ))}
          <path d={plot.path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover && (
            <g>
              <line
                x1={plot.x(hover.t)}
                x2={plot.x(hover.t)}
                y1={MARGIN.top}
                y2={height - MARGIN.bottom}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={plot.x(hover.t)} cy={plot.y(hover.v)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
