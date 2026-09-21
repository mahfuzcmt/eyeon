"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { BaseLayerKind } from "@/lib/leaflet";

interface LayerOption {
  kind: BaseLayerKind;
  label: string;
  icon: React.ReactNode;
  requiresGoogle: boolean;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    kind: "google-street",
    label: "Street",
    requiresGoogle: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    kind: "google-satellite",
    label: "Satellite",
    requiresGoogle: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    kind: "google-hybrid",
    label: "Hybrid",
    requiresGoogle: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    kind: "google-terrain",
    label: "Terrain",
    requiresGoogle: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
      </svg>
    ),
  },
  {
    kind: "osm",
    label: "OpenStreetMap",
    requiresGoogle: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
];

interface MapLayerDropdownProps {
  currentLayer: BaseLayerKind;
  onChange: (layer: BaseLayerKind) => void;
  googleAvailable: boolean;
}

export function MapLayerDropdown({ currentLayer, onChange, googleAvailable }: MapLayerDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = LAYER_OPTIONS.find((o) => o.kind === currentLayer) ?? LAYER_OPTIONS[0];

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const handleSelect = (layer: BaseLayerKind) => {
    onChange(layer);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-mkt border border-white/30 bg-white/80 px-2.5 py-1.5 text-[13px] font-semibold text-ink-900 shadow-glass backdrop-blur-md transition hover:bg-white/90 hover:border-white/50"
        title="Map layer"
      >
        <span className="text-ink-600">{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1.5 min-w-[160px] overflow-hidden rounded-mkt border border-white/30 bg-white/90 shadow-glass backdrop-blur-lg">
          {LAYER_OPTIONS.map((option) => {
            const disabled = option.requiresGoogle && !googleAvailable;
            const isSelected = option.kind === currentLayer;

            return (
              <button
                key={option.kind}
                type="button"
                onClick={() => !disabled && handleSelect(option.kind)}
                disabled={disabled}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition ${
                  isSelected
                    ? "bg-brand-50/80 font-semibold text-brand-600"
                    : disabled
                    ? "cursor-not-allowed text-ink-300"
                    : "text-ink-700 hover:bg-white/60"
                }`}
              >
                <span className={isSelected ? "text-brand-500" : disabled ? "text-ink-300" : "text-ink-500"}>
                  {option.icon}
                </span>
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-brand-500"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {disabled && (
                  <span className="text-[11px] text-ink-300">(No API key)</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
