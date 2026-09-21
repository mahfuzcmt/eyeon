// ADL Moto Viewer style vehicle markers: top-down silhouettes (40×60 canvas,
// nose pointing up) rotated to the GPS heading and tinted by state. Drawn as
// inline SVG so they stay crisp at any zoom and recolour without new assets.

export const VEHICLE_TYPES = ["CAR", "MOTORBIKE", "TRUCK", "BUS", "CNG", "MICROBUS"] as const;
export type VehicleTypeId = (typeof VEHICLE_TYPES)[number];

/** ADL "static" blue — default body colour when no state is known. */
export const DEFAULT_ICON_COLOR = "#1e7ff5";

/** Body colours per state, matching ADL's green / blue / grey marker set. */
export const STATUS_COLORS = {
  moving: "#30c85a",
  stopped: "#1e7ff5",
  idle: "#f5b301",
  offline: "#c9cdd2",
};

/**
 * The vehicle is drawn on a 40×60 canvas like ADL's PNGs, but rendered inside
 * a square 72-unit viewport (the 40×60 diagonal) so any rotation fits without
 * clipping. `size` is the vehicle's width; the returned box is the square.
 */
const VEHICLE_W = 40;
const CANVAS = 72;
export const CANVAS_SCALE = CANVAS / VEHICLE_W;

export function getIconDimensions(size: number): { width: number; height: number } {
  const box = Math.round(size * CANVAS_SCALE);
  return { width: box, height: box };
}

/** Distance (px) from the marker centre to the vehicle's nose, for label placement. */
export function noseOffset(size: number): number {
  return Math.round(size * 0.75);
}

const GLASS = "#1f2937";
const GLASS_EDGE = "rgba(255,255,255,0.35)";
const CARGO = "#f3f4f6";
const TYRE = "#111827";

interface Palette {
  body: string;
  edge: string;
  roof: string;
}

function palette(color: string): Palette {
  return { body: color, edge: darkenColor(color, 28), roof: lightenColor(color, 14) };
}

/**
 * Build the marker SVG for a vehicle type. Rotation is applied around the
 * canvas centre so Leaflet's centre anchor keeps the vehicle on its position.
 */
export function buildVehicleSvg(
  vehicleType: string | null | undefined,
  bodyColor: string | null | undefined,
  rotation = 0,
  size = 24,
): string {
  const p = palette(bodyColor || DEFAULT_ICON_COLOR);
  const type = (vehicleType?.toUpperCase() || "CAR") as VehicleTypeId;
  const { width, height } = getIconDimensions(size);
  const rot = Math.round(((rotation % 360) + 360) % 360);

  let shape: string;
  switch (type) {
    case "MOTORBIKE": shape = motorbike(p); break;
    case "TRUCK": shape = truck(p); break;
    case "BUS": shape = bus(p); break;
    case "CNG": shape = cng(p); break;
    case "MICROBUS": shape = van(p); break;
    case "CAR":
    default: shape = car(p); break;
  }

  return `<svg width="${width}" height="${height}" viewBox="-16 -6 72 72" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="pp-veh-shadow" x="-30%" y="-20%" width="160%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <g transform="rotate(${rot} 20 30)" filter="url(#pp-veh-shadow)">${shape}</g>
  </svg>`;
}

/* ── Shapes (nose at top) ──────────────────────────────────────────── */

function mirrors(p: Palette, y: number): string {
  return `<rect x="4" y="${y}" width="5" height="3" rx="1" fill="${p.edge}"/>
    <rect x="31" y="${y}" width="5" height="3" rx="1" fill="${p.edge}"/>`;
}

/** Sedan — ADL's car marker: rounded body, windscreen, roof, rear window. */
function car(p: Palette): string {
  return `
    ${mirrors(p, 17)}
    <path d="M20 3 C29 3 32 8 32 14 L32 50 C32 55 28 57 20 57 C12 57 8 55 8 50 L8 14 C8 8 11 3 20 3 Z" fill="${p.body}" stroke="${p.edge}" stroke-width="1.2"/>
    <path d="M11.5 15 Q20 12 28.5 15 L27.5 24 Q20 22 12.5 24 Z" fill="${GLASS}"/>
    <path d="M12.5 15.5 Q20 13.5 27.5 15.5 L27 18 Q20 16.5 13 18 Z" fill="${GLASS_EDGE}"/>
    <rect x="11" y="25.5" width="18" height="15" rx="3" fill="${p.roof}"/>
    <path d="M12 42 Q20 44 28 42 L29 49.5 Q20 51.5 11 49.5 Z" fill="${GLASS}"/>`;
}

/** Van / microbus — ADL's van marker: flat long roof, tall windscreen. */
function van(p: Palette): string {
  return `
    ${mirrors(p, 13)}
    <path d="M20 3 C30 3 33 7 33 12 L33 52 C33 56 30 57 20 57 C10 57 7 56 7 52 L7 12 C7 7 10 3 20 3 Z" fill="${p.body}" stroke="${p.edge}" stroke-width="1.2"/>
    <path d="M10 12 Q20 9 30 12 L30 20.5 Q20 18.5 10 20.5 Z" fill="${GLASS}"/>
    <path d="M11 12.5 Q20 10.5 29 12.5 L28.7 15 Q20 13.5 11.3 15 Z" fill="${GLASS_EDGE}"/>
    <rect x="10" y="23" width="20" height="30" rx="2.5" fill="${p.roof}"/>
    <path d="M13 33 H27 M13 43 H27" stroke="${p.edge}" stroke-opacity="0.35" stroke-width="1"/>`;
}

/** Truck — coloured cab with a light cargo box (ADL's lorry marker). */
function truck(p: Palette): string {
  return `
    ${mirrors(p, 12)}
    <path d="M20 3 C29 3 32 7 32 12 L32 22 L8 22 L8 12 C8 7 11 3 20 3 Z" fill="${p.body}" stroke="${p.edge}" stroke-width="1.2"/>
    <path d="M10.5 11 Q20 8 29.5 11 L29.5 18.5 Q20 16.5 10.5 18.5 Z" fill="${GLASS}"/>
    <rect x="6" y="23.5" width="28" height="33.5" rx="2" fill="${CARGO}" stroke="${p.edge}" stroke-width="1.2"/>
    <path d="M9 27 H31 M20 27 V54" stroke="${p.edge}" stroke-opacity="0.35" stroke-width="1"/>`;
}

/** Bus — long body with roof panel and window strips. */
function bus(p: Palette): string {
  return `
    ${mirrors(p, 9)}
    <rect x="7" y="3" width="26" height="54" rx="5" fill="${p.body}" stroke="${p.edge}" stroke-width="1.2"/>
    <path d="M9 6 Q20 3.5 31 6 L31 13.5 Q20 11.5 9 13.5 Z" fill="${GLASS}"/>
    <rect x="10" y="16" width="20" height="36" rx="2" fill="${p.roof}"/>
    <path d="M13 26 H27 M13 36 H27 M13 46 H27" stroke="${p.edge}" stroke-opacity="0.35" stroke-width="1"/>
    <path d="M9 52 Q20 54.5 31 52 L31 55 Q20 57 9 55 Z" fill="${GLASS}"/>`;
}

/** Motorbike — two tyres, tank/body, handlebar and rider helmet. */
function motorbike(p: Palette): string {
  return `
    <rect x="16.5" y="2" width="7" height="13" rx="3.5" fill="${TYRE}"/>
    <rect x="16.5" y="45" width="7" height="13" rx="3.5" fill="${TYRE}"/>
    <path d="M20 12 C26 12 27.5 18 27.5 24 L27.5 40 C27.5 46 24 49 20 49 C16 49 12.5 46 12.5 40 L12.5 24 C12.5 18 14 12 20 12 Z" fill="${p.body}" stroke="${p.edge}" stroke-width="1.2"/>
    <rect x="7" y="16" width="26" height="3.5" rx="1.75" fill="${TYRE}"/>
    <path d="M20 21 C24 21 25 24 25 27 L15 27 C15 24 16 21 20 21 Z" fill="${p.roof}"/>
    <circle cx="20" cy="33" r="6" fill="${GLASS}"/>
    <path d="M15.5 31 Q20 28 24.5 31" stroke="${GLASS_EDGE}" stroke-width="1.5" fill="none"/>
    <rect x="15" y="40" width="10" height="6" rx="2" fill="${p.edge}"/>`;
}

/** CNG auto-rickshaw — narrow nose, one front wheel, canopy, two rear wheels. */
function cng(p: Palette): string {
  return `
    <rect x="18" y="1" width="4" height="7" rx="2" fill="${TYRE}"/>
    <rect x="4.5" y="43" width="3.5" height="9" rx="1.5" fill="${TYRE}"/>
    <rect x="32" y="43" width="3.5" height="9" rx="1.5" fill="${TYRE}"/>
    <path d="M20 5 C28 5 31 10 31 16 L32 50 C32 55 28 57 20 57 C12 57 8 55 8 50 L9 16 C9 10 12 5 20 5 Z" fill="${p.body}" stroke="${p.edge}" stroke-width="1.2"/>
    <path d="M12 12.5 Q20 9.5 28 12.5 L28 19.5 Q20 17.5 12 19.5 Z" fill="${GLASS}"/>
    <rect x="11" y="22" width="18" height="30" rx="3" fill="${p.roof}"/>
    <path d="M14 22 V52 M20 22 V52 M26 22 V52" stroke="${p.edge}" stroke-opacity="0.3" stroke-width="1"/>`;
}

/* ── Other markers ─────────────────────────────────────────────────── */

/** Kept for callers that want a generic vehicle without a type. */
export function buildSimpleArrow(
  bodyColor: string | null | undefined,
  rotation = 0,
  size = 24,
): string {
  return buildVehicleSvg("CAR", bodyColor, rotation, size);
}

/** Simple pin marker for static locations (ADL's blue location pin). */
export function buildSimplePin(
  bodyColor: string | null | undefined,
  size = 24,
): string {
  const color = bodyColor || DEFAULT_ICON_COLOR;
  return `<svg width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0 C6 0 1 5 1 11 C1 18 12 30 12 30 C12 30 23 18 23 11 C23 5 18 0 12 0 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="4" fill="#fff"/>
  </svg>`;
}

/** Cluster marker for grouped vehicles. */
export function buildClusterMarker(
  count: number,
  color: string = "#1890ff",
  size = 28,
): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="${color}" stroke="#fff" stroke-width="2"/>
    <text x="14" y="18" text-anchor="middle" fill="#fff" font-size="12" font-weight="600" font-family="Arial">${count}</text>
  </svg>`;
}

// Helper functions
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
