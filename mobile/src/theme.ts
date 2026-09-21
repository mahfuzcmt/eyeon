/**
 * Brand tokens - family safety palette shared with the web dashboard
 * (frontend/tailwind.config.ts): deep teal primary, warm yellow accent.
 * Every text/background pair is >= 4.5:1; carers of elderly relatives are a core audience.
 */
export const colors = {
  brand: "#0F6B5C", // primary teal - white text on top
  brandDim: "#0A4A40",
  brandSoft: "#E8F5F2", // tinted backgrounds for selected rows / icon tiles
  onBrand: "#FFFFFF",

  accent: "#FFC857", // warm yellow - dark text on top, never white
  onAccent: "#0B2E28",

  bg: "#EEF4F2", // app background
  surface: "#FFFFFF", // cards, header, tab bar
  surfaceAlt: "#F7FAF9",
  border: "#D2DEDA",

  text: "#0B2E28",
  textDim: "#3E4E4B",
  textFaint: "#637370", // lightest shade allowed for text (5.0:1 on white)

  ok: "#15803D",
  warn: "#B45309",
  danger: "#D92D20",
  offline: "#6B7A77",
} as const;

export const radius = { sm: 10, md: 14, lg: 20 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
/** Minimum touch target (dp). Buttons and tappable rows must not go below this. */
export const touch = { min: 48, button: 52 } as const;
