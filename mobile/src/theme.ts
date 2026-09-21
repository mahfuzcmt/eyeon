/**
 * Brand tokens — light theme matching the AutoNemo-style mobile reference
 * (white app chrome, dark ink text, brand orange accents). The web dashboard
 * keeps its own palette; these are mobile-only.
 */
export const colors = {
  brand: "#E8900A", // primary orange
  brandDim: "#7A4A05",

  bg: "#F5F6F8", // app background (light gray)
  surface: "#FFFFFF", // cards, header, tab bar
  surfaceAlt: "#F1F5F9",
  border: "#E2E8F0",

  text: "#0F2742", // ink.900
  textDim: "#475569",
  textFaint: "#94A3B8",

  ok: "#16A34A",
  warn: "#F59E0B",
  danger: "#DC2626",
  offline: "#94A3B8",
} as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
