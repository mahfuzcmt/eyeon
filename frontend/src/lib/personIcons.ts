// Map markers for people: an upright round portrait (a boy, a girl, an old man or a generic
// adult) inside a ring tinted by state, with a small heading pointer that orbits the ring.
// (The vehicle product rotated a whole top-down silhouette; a person's face should never be
// drawn upside down.) Inline SVG so markers stay crisp at any zoom and recolour without new
// assets. The SVG carries no ids (no clipPath / filter references): the same markup is
// repeated for every marker and list row, and an id that resolves into a hidden copy makes
// the whole badge vanish in some browsers.
//
// The portrait art is duplicated in mobile/src/components/WebMap.tsx (the WebView cannot
// import this file). Keep the two visually in sync.

export const PERSON_TYPES = ["BOY", "GIRL", "OLD_MAN", "PERSON"] as const;
export type PersonTypeId = (typeof PERSON_TYPES)[number];

/** Default ring colour when no state is known (brand teal). */
export const DEFAULT_ICON_COLOR = "#0F6B5C";

/** Ring colours per state. */
export const STATUS_COLORS = {
  moving: "#16A34A",
  stopped: "#2563EB",
  idle: "#D97706",
  offline: "#9AA8A4",
};

/**
 * The badge is centred on (20,30) inside a square 72-unit viewport, the geometry the
 * markers have always used, so anchors and label offsets in FleetMap follow from `size`.
 * `size` is the nominal badge width; the returned box is the square.
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

const SHADOW = "filter:drop-shadow(0 1.5px 1.8px rgba(0,0,0,.35))";

/**
 * Map marker: portrait badge on the 72-unit canvas, optionally with a heading pointer.
 *
 * @param rotation heading in degrees for the pointer, or null to draw no pointer
 *                 (anyone who is not moving).
 */
export function buildPersonSvg(
  personType: string | null | undefined,
  badgeColor: string | null | undefined,
  rotation: number | null = null,
  size = 24,
): string {
  const color = badgeColor || DEFAULT_ICON_COLOR;
  const { width, height } = getIconDimensions(size);

  const pointer =
    rotation == null
      ? ""
      : `<path d="M0 -26 L6.5 -15 L-6.5 -15 Z" fill="${color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" transform="rotate(${Math.round(((rotation % 360) + 360) % 360)})"/>`;

  return `<svg width="${width}" height="${height}" viewBox="-16 -6 72 72" xmlns="http://www.w3.org/2000/svg" style="display:block;${SHADOW}"><g transform="translate(20 30)">${pointer}${badge(normalizePersonType(personType), color)}</g></svg>`;
}

/** Portrait badge alone, cropped tight: `size` is the rendered width. For lists and pickers. */
export function buildPersonAvatar(
  personType: string | null | undefined,
  ringColor: string | null | undefined,
  size = 28,
): string {
  return `<svg width="${size}" height="${size}" viewBox="-18 -18 36 36" xmlns="http://www.w3.org/2000/svg" style="display:block">${badge(normalizePersonType(personType), ringColor || DEFAULT_ICON_COLOR)}</svg>`;
}

/**
 * Badge centred on the origin: backdrop disc, portrait, state ring, white rim. The portrait
 * may spill up to r=16 — the ring (r 12.7-16.3) is painted over it, which is what crops the
 * shoulders to the circle without a clipPath.
 */
function badge(type: PersonTypeId, ring: string): string {
  return `<circle r="14.5" fill="${BACKDROP[type]}"/>${PORTRAIT[type]}<circle r="14.5" fill="none" stroke="${ring}" stroke-width="3.6"/><circle r="16.9" fill="none" stroke="#fff" stroke-width="1.4"/>`;
}

const SKIN = "#E9B48C";
const HAIR = "#2A1B14";
const INK = "#2A1B14";

const BACKDROP: Record<PersonTypeId, string> = {
  BOY: "#D6EBFF",
  GIRL: "#FFE1EC",
  OLD_MAN: "#E8F0DC",
  PERSON: "#E3F3EF",
};

/** Shoulders: the lower edge runs along the ring's centre line, so the ring hides the cut. */
const shoulders = (fill: string) =>
  `<path d="M-11.4 9 C-9.6 5 -5 4 0 4 C5 4 9.6 5 11.4 9 A14.5 14.5 0 0 1 -11.4 9 Z" fill="${fill}"/>`;
const EARS = `<circle cx="-7.5" cy="-1.5" r="1.6" fill="${SKIN}"/><circle cx="7.5" cy="-1.5" r="1.6" fill="${SKIN}"/>`;
const HEAD = `<circle cy="-2.2" r="7.6" fill="${SKIN}"/>`;
const EYES = `<circle cx="-2.8" cy="-1.5" r="1" fill="${INK}"/><circle cx="2.8" cy="-1.5" r="1" fill="${INK}"/>`;
const SMILE = `<path d="M-2.5 1.7 Q0 4 2.5 1.7" fill="none" stroke="#8A3B2E" stroke-width="1" stroke-linecap="round"/>`;
const CHEEKS = `<circle cx="-4.7" cy="1.3" r="1.4" fill="#F0857A" opacity=".45"/><circle cx="4.7" cy="1.3" r="1.4" fill="#F0857A" opacity=".45"/>`;

const PORTRAIT: Record<PersonTypeId, string> = {
  // Short black hair with a side-swept fringe, blue T-shirt.
  BOY:
    shoulders("#2F80ED") +
    `<path d="M-2.6 4.2 L0 6.6 L2.6 4.2 Z" fill="#fff"/>` +
    EARS + HEAD +
    `<path d="M-7.9 -3 C-8.8 -9.6 -4.4 -12.2 0.4 -12 C5.6 -11.8 8.8 -8.6 7.9 -2.8 C7.2 -5.4 5.4 -7 3 -7.4 C0 -6 -4 -5.8 -6.4 -6.6 C-7.2 -5.6 -7.6 -4.4 -7.9 -3 Z" fill="${HAIR}"/>` +
    EYES + SMILE + CHEEKS,

  // Centre parting, two bunches with yellow ties, pink dress.
  GIRL:
    `<ellipse cx="-9" cy="1.6" rx="2.7" ry="4.6" fill="${HAIR}"/><ellipse cx="9" cy="1.6" rx="2.7" ry="4.6" fill="${HAIR}"/>` +
    `<circle cy="-3" r="8.5" fill="${HAIR}"/>` +
    shoulders("#EC4899") +
    `<path d="M-2.6 4.2 Q0 6.4 2.6 4.2 Z" fill="#fff"/>` +
    HEAD +
    `<path d="M-7.6 -2.4 C-7.8 -8.4 -4 -10.4 0 -10.4 C4 -10.4 7.8 -8.4 7.6 -2.4 C6.8 -5.6 4 -7.8 0 -8.6 C-4 -7.8 -6.8 -5.6 -7.6 -2.4 Z" fill="${HAIR}"/>` +
    `<circle cx="-8.4" cy="-3" r="1.5" fill="#FFC857"/><circle cx="8.4" cy="-3" r="1.5" fill="#FFC857"/>` +
    EYES + SMILE + CHEEKS,

  // Bald crown, grey side hair, glasses, white beard and moustache.
  OLD_MAN:
    `<circle cx="-7" cy="-4.6" r="3.1" fill="#DADFE3"/><circle cx="7" cy="-4.6" r="3.1" fill="#DADFE3"/>` +
    shoulders("#5B7083") +
    EARS + HEAD +
    `<path d="M-2.6 -7.4 Q0 -8 2.6 -7.4" fill="none" stroke="#CF9A72" stroke-width=".6" stroke-linecap="round"/>` +
    `<path d="M-7 0 C-6.8 6.4 -3.4 9.4 0 9.4 C3.4 9.4 6.8 6.4 7 0 C5 2.4 2.6 1.5 0 1.5 C-2.6 1.5 -5 2.4 -7 0 Z" fill="#F7F7F5" stroke="#D5DADE" stroke-width=".4"/>` +
    `<path d="M-3.4 1.9 Q-1.7 .4 0 1.6 Q1.7 .4 3.4 1.9 Q1.7 3.2 0 2.5 Q-1.7 3.2 -3.4 1.9 Z" fill="#E1E5E8"/>` +
    `<path d="M-1.3 3.9 Q0 4.7 1.3 3.9" fill="none" stroke="#B56A5A" stroke-width=".7" stroke-linecap="round"/>` +
    `<path d="M-4.9 -5.3 Q-3 -6.2 -1.3 -5.3 M1.3 -5.3 Q3 -6.2 4.9 -5.3" fill="none" stroke="#C4CACF" stroke-width="1" stroke-linecap="round"/>` +
    `<circle cx="-2.9" cy="-2" r="2.2" fill="#fff" fill-opacity=".4" stroke="#3B3B3B" stroke-width=".7"/><circle cx="2.9" cy="-2" r="2.2" fill="#fff" fill-opacity=".4" stroke="#3B3B3B" stroke-width=".7"/>` +
    `<path d="M-.7 -2.2 Q0 -2.7 .7 -2.2 M-5.1 -2.4 L-7.2 -3 M5.1 -2.4 L7.2 -3" fill="none" stroke="#3B3B3B" stroke-width=".7" stroke-linecap="round"/>` +
    `<circle cx="-2.9" cy="-1.9" r=".85" fill="${INK}"/><circle cx="2.9" cy="-1.9" r=".85" fill="${INK}"/>`,

  // Generic adult: neat side parting, teal shirt.
  PERSON:
    shoulders("#0F6B5C") +
    `<path d="M-2.6 4.2 L0 6.6 L2.6 4.2 Z" fill="#fff"/>` +
    EARS + HEAD +
    `<path d="M-7.8 -2.6 C-8.6 -9 -4.6 -11.8 0 -11.8 C4.8 -11.8 8.6 -9 7.8 -2.6 C7.2 -5 6 -6.8 4.4 -7.8 C1.6 -8.4 -1.8 -8.2 -4.6 -8.6 C-6.2 -7.2 -7.2 -5 -7.8 -2.6 Z" fill="${HAIR}"/>` +
    EYES + SMILE,
};

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
