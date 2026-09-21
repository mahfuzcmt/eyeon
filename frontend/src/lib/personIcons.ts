// Map markers for people: an upright round avatar badge tinted by state, with a small
// heading pointer that orbits the badge. (The vehicle product rotated a whole top-down
// silhouette; a person's face should never be drawn upside down.) Inline SVG so markers
// stay crisp at any zoom and recolour without new assets.

export const PERSON_TYPES = ["BOY", "GIRL", "PERSON"] as const;
export type PersonTypeId = (typeof PERSON_TYPES)[number];

/** Default badge colour when no state is known (brand teal). */
export const DEFAULT_ICON_COLOR = "#0F6B5C";

/** Badge colours per state. */
export const STATUS_COLORS = {
  moving: "#16A34A",
  stopped: "#2563EB",
  idle: "#D97706",
  offline: "#9AA8A4",
};

/**
 * The badge is drawn on a 40×60 canvas centred on (20,30) inside a square 72-unit viewport,
 * the same geometry the previous markers used, so marker sizing, anchors and label offsets
 * in FleetMap did not have to change. `size` is the badge width; the returned box is the square.
 */
const BADGE_W = 40;
const CANVAS = 72;
export const CANVAS_SCALE = CANVAS / BADGE_W;

export function getIconDimensions(size: number): { width: number; height: number } {
  const box = Math.round(size * CANVAS_SCALE);
  return { width: box, height: box };
}

/** Distance (px) from the marker centre to the top of the badge, for label placement. */
export function noseOffset(size: number): number {
  return Math.round(size * 0.75);
}

/** Anything that is not a known person type (including legacy CAR/MOTORBIKE rows) is a PERSON. */
export function normalizePersonType(type: string | null | undefined): PersonTypeId {
  const t = type?.toUpperCase();
  return (PERSON_TYPES as readonly string[]).includes(t ?? "") ? (t as PersonTypeId) : "PERSON";
}

/**
 * @param rotation heading in degrees for the pointer, or null to draw no pointer
 *                 (lists, pickers, and anyone who is not moving).
 */
export function buildPersonSvg(
  personType: string | null | undefined,
  badgeColor: string | null | undefined,
  rotation: number | null = null,
  size = 24,
): string {
  const color = badgeColor || DEFAULT_ICON_COLOR;
  const edge = darkenColor(color, 22);
  const type = normalizePersonType(personType);
  const { width, height } = getIconDimensions(size);

  const pointer =
    rotation == null
      ? ""
      : `<path d="M20 5 L26.5 15.5 L13.5 15.5 Z" fill="${color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" transform="rotate(${Math.round(((rotation % 360) + 360) % 360)} 20 30)"/>`;

  return `<svg width="${width}" height="${height}" viewBox="-16 -6 72 72" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="eo-person-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <clipPath id="eo-person-clip"><circle cx="20" cy="30" r="13.5"/></clipPath>
    </defs>
    <g filter="url(#eo-person-shadow)">
      ${pointer}
      <circle cx="20" cy="30" r="15" fill="${color}" stroke="#fff" stroke-width="3"/>
      <g clip-path="url(#eo-person-clip)">${glyph(type, edge)}</g>
    </g>
  </svg>`;
}

function glyph(type: PersonTypeId, hair: string): string {
  const body = `<path d="M9.5 46 C9.5 37.5 14 34.5 20 34.5 C26 34.5 30.5 37.5 30.5 46 Z" fill="#fff"/>`;
  const head = `<circle cx="20" cy="26.5" r="5.6" fill="#fff"/>`;
  switch (type) {
    case "GIRL":
      // two bunches
      return `<circle cx="13" cy="24.5" r="3" fill="#fff"/><circle cx="27" cy="24.5" r="3" fill="#fff"/>${head}
        <path d="M14.6 25.6 Q20 18.6 25.4 25.6 Q20 22.4 14.6 25.6 Z" fill="${hair}"/>${body}`;
    case "BOY":
      // short fringe
      return `${head}<path d="M14.5 25.2 Q15.5 19.8 20 19.8 Q24.5 19.8 25.5 25.2 Q22.5 22 14.5 25.2 Z" fill="${hair}"/>${body}`;
    case "PERSON":
    default:
      return `${head}${body}`;
  }
}

/** Simple pin marker for static locations. */
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
