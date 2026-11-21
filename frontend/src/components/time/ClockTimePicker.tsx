"use client";

import { useEffect, useRef, useState } from "react";
import { clock12 } from "@/lib/format";
import { useEscapeKey } from "@/hooks/useEscapeKey";

/**
 * A time of day picked on a clock face (owner, 2026-11-21: "the entry / exit time should look
 * like a watch so that people easily understand the time they set"). The button shows a small
 * clock with the hands at the chosen time and the time in 12-hour form; it opens a large dial:
 * tap (or drag to) the hour, then the minute, and AM / PM. The value stays "HH:mm" (24-hour),
 * as the server stores it.
 */

type Mode = "hour" | "minute";

function parse(value: string): { h: number; m: number } {
  const r = /^(\d{1,2}):(\d{2})/.exec(value);
  return r ? { h: Number(r[1]) % 24, m: Number(r[2]) % 60 } : { h: 8, m: 0 };
}

const pad = (n: number) => String(n).padStart(2, "0");
const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const digits = (s: string, bn: boolean) => (bn ? s.replace(/\d/g, (d) => BN[Number(d)]) : s);

/** Small clock drawn with the hands at h:m. */
export function ClockIcon({ h, m, size = 28 }: { h: number; m: number; size?: number }) {
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minuteAngle = m * 6;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="#fff" stroke="#0F6B5C" strokeWidth="2.2" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <circle key={i} cx={16 + Math.sin(a) * 11.6} cy={16 - Math.cos(a) * 11.6} r={i % 3 === 0 ? 1.2 : 0.7} fill="#0B2E28" />;
      })}
      <line x1="16" y1="16" x2="16" y2="9" stroke="#0B2E28" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${hourAngle} 16 16)`} />
      <line x1="16" y1="16" x2="16" y2="5.5" stroke="#0F6B5C" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${minuteAngle} 16 16)`} />
      <circle cx="16" cy="16" r="1.6" fill="#D9971F" />
    </svg>
  );
}

export function ClockTimePicker({
  value,
  onChange,
  locale,
  label,
  disabled = false,
  initiallyOpen = false,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  locale: "bn" | "en";
  label: string;
  disabled?: boolean;
  /** Opens the dial on first render (previews and tests). */
  initiallyOpen?: boolean;
}) {
  const bn = locale === "bn";
  const current = parse(value);
  const [open, setOpen] = useState(initiallyOpen);
  const [h, setH] = useState(current.h);
  const [m, setM] = useState(current.m);
  const [mode, setMode] = useState<Mode>("hour");
  const dial = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const p = parse(value);
    setH(p.h);
    setM(p.m);
    setMode("hour");
  }, [open, value]);

  const pm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;

  /** The dial position under the pointer as a 0-359 angle from 12 o'clock, clockwise. */
  const angleAt = (clientX: number, clientY: number): number | null => {
    const svg = dial.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.08) return null; // the centre says nothing
    return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  };

  const pick = (clientX: number, clientY: number, finish: boolean) => {
    const a = angleAt(clientX, clientY);
    if (a == null) return;
    if (mode === "hour") {
      const step = Math.round(a / 30) % 12; // 0 = 12 o'clock
      setH((pm ? 12 : 0) + step);
      if (finish) setMode("minute");
    } else {
      setM((Math.round(a / 30) % 12) * 5);
    }
  };

  const save = () => {
    onChange(`${pad(h)}:${pad(m)}`);
    setOpen(false);
  };

  const R = 112; // radius of the numbers, in the 280 x 280 dial
  const handAngle = mode === "hour" ? (h % 12) * 30 : m * 6;
  const labels =
    mode === "hour"
      ? Array.from({ length: 12 }, (_, i) => ({ v: i === 0 ? 12 : i, angle: i * 30, on: h % 12 === i % 12 }))
      : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, angle: i * 30, on: m === i * 5 }));

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${clock12(current.h, current.m, bn)}`}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-surface-300 bg-white px-3 text-[15px] font-semibold text-ink-900 hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ClockIcon h={current.h} m={current.m} />
        <span>{clock12(current.h, current.m, bn)}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[2600] flex items-end justify-center bg-ink-950/40 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <p className="text-[14px] font-semibold text-ink-500">{label}</p>

            {/* The time as it reads, hour and minute tappable, and AM / PM */}
            <div className="mt-2 flex items-center justify-center gap-4">
              <div className="flex items-baseline font-display text-5xl font-bold tabular-nums">
                <button
                  type="button"
                  onClick={() => setMode("hour")}
                  className={`rounded-lg px-1 ${mode === "hour" ? "bg-brand-50 text-brand-600" : "text-ink-900"}`}
                >
                  {digits(String(h12), bn)}
                </button>
                <span className="text-ink-500">:</span>
                <button
                  type="button"
                  onClick={() => setMode("minute")}
                  className={`rounded-lg px-1 ${mode === "minute" ? "bg-brand-50 text-brand-600" : "text-ink-900"}`}
                >
                  {digits(pad(m), bn)}
                </button>
              </div>
              <div className="flex flex-col gap-1" role="group" aria-label="AM / PM">
                {(["AM", "PM"] as const).map((p) => {
                  const on = p === "PM" ? pm : !pm;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setH((x) => (p === "PM" ? (x % 12) + 12 : x % 12))}
                      className={`min-h-[36px] min-w-[56px] rounded-lg px-2 text-[14px] font-bold ${on ? "bg-brand-500 text-white" : "bg-surface-100 text-ink-700"}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-1 text-center text-[15px] font-semibold text-brand-600">{clock12(h, m, bn)}</p>

            {/* The dial */}
            <svg
              ref={dial}
              viewBox="0 0 280 280"
              className="mx-auto mt-3 block w-full max-w-[280px] touch-none select-none"
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as Element).setPointerCapture?.(e.pointerId);
                pick(e.clientX, e.clientY, false);
              }}
              onPointerMove={(e) => {
                if (dragging.current) pick(e.clientX, e.clientY, false);
              }}
              onPointerUp={(e) => {
                if (!dragging.current) return;
                dragging.current = false;
                pick(e.clientX, e.clientY, true);
              }}
              role="img"
              aria-label={clock12(h, m, bn)}
            >
              <circle cx="140" cy="140" r="136" fill="#EEF4F2" stroke="#0F6B5C" strokeWidth="3" />
              {/* minute ticks */}
              {Array.from({ length: 60 }, (_, i) => {
                const a = (i * 6 * Math.PI) / 180;
                const r1 = i % 5 === 0 ? 126 : 130;
                return (
                  <line
                    key={i}
                    x1={140 + Math.sin(a) * r1}
                    y1={140 - Math.cos(a) * r1}
                    x2={140 + Math.sin(a) * 134}
                    y2={140 - Math.cos(a) * 134}
                    stroke="#0B2E28"
                    strokeOpacity={i % 5 === 0 ? 0.55 : 0.2}
                    strokeWidth={i % 5 === 0 ? 2 : 1}
                  />
                );
              })}
              {/* the hand being set, and the other one faint */}
              <line
                x1="140"
                y1="140"
                x2="140"
                y2={140 - (mode === "hour" ? R - 4 : R - 4)}
                stroke="#0F6B5C"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${handAngle} 140 140)`}
              />
              <line
                x1="140"
                y1="140"
                x2="140"
                y2={140 - (mode === "hour" ? 96 : 62)}
                stroke="#0B2E28"
                strokeOpacity="0.25"
                strokeWidth={mode === "hour" ? 2 : 5}
                strokeLinecap="round"
                transform={`rotate(${mode === "hour" ? m * 6 : ((h % 12) + m / 60) * 30} 140 140)`}
              />
              <circle cx="140" cy="140" r="6" fill="#0F6B5C" />
              {labels.map((l) => {
                const a = (l.angle * Math.PI) / 180;
                const x = 140 + Math.sin(a) * R;
                const y = 140 - Math.cos(a) * R;
                return (
                  <g key={l.v}>
                    <circle cx={x} cy={y} r="19" fill={l.on ? "#0F6B5C" : "transparent"} />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="17"
                      fontWeight="700"
                      fill={l.on ? "#fff" : "#0B2E28"}
                    >
                      {digits(mode === "minute" ? pad(l.v) : String(l.v), bn)}
                    </text>
                  </g>
                );
              })}
            </svg>

            <p className="mt-2 text-center text-[13px] text-ink-500">
              {mode === "hour"
                ? bn
                  ? "ঘণ্টা বেছে নিন"
                  : "Choose the hour"
                : bn
                  ? "মিনিট বেছে নিন"
                  : "Choose the minutes"}
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                {bn ? "বাতিল" : "Cancel"}
              </button>
              <button type="button" className="btn-primary min-w-[96px]" onClick={save}>
                {bn ? "ঠিক আছে" : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
