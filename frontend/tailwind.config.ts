import type { Config } from "tailwindcss";

/**
 * EyeOn Design System - ADL Moto Viewer Style
 * Matching the reference GPS tracking platform UI exactly
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ADL Moto Viewer exact colors
        brand: {
          50: "#e8ebff",
          100: "#c5cbff",
          200: "#9ea8ff",
          300: "#7785ff",
          400: "#5062ff",
          500: "#0421bc", // Primary blue (--BG-C, --HD-BG-C)
          600: "#031a96",
          700: "#021470",
          800: "#010d4a",
          900: "#000724",
        },
        // Surface colors
        surface: {
          0: "#ffffff",
          50: "#fafbfc",
          100: "#EAEEF2", // --S-BG-C secondary background
          200: "#e5e9ed",
          300: "#dddddd", // --BR-C border
          400: "#d1d5db",
        },
        // Text colors
        ink: {
          50: "#ffffff",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#cccccc",
          400: "#888888", // --I-L-F-C input label
          500: "#7E8792", // --A-F-C secondary text
          600: "#4b5563",
          700: "#3D4353", // --P-F-C primary text
          800: "#262626", // --I-F-C input text
          900: "#1f2937",
          950: "#111827",
        },
        // Alarm severity / feedback colours. Used as text-alarm-red, bg-alarm-amber/10,
        // border-l-alarm-red … across alarm UI and form errors (ADL status hues).
        alarm: {
          red: "#ff4d4f",
          amber: "#faad14",
          green: "#52c41a",
        },
        // Status colors (ADL style)
        status: {
          moving: "#52c41a",   // Green
          stopped: "#1890ff", // Blue
          idle: "#faad14",    // Orange
          offline: "#8c8c8c", // Gray
        },
        // ADL specific
        adl: {
          primary: "#0421bc",
          primaryHover: "rgba(4, 33, 188, 0.1)", // --HD-BG-C-R
          headerBg: "#0421bc",
          sidebarBg: "#0421bc",
          border: "#dddddd",
          text: "#3D4353",
          textSecondary: "#7E8792",
          inputBg: "#ffffff",
          cardBg: "#ffffff",
          pageBg: "#EAEEF2",
        },
        // Marketing accent colors
        accent: {
          teal: "#14b8a6",
        },
        // Text-link colour = ADL primary. The single accent across the app is
        // `brand` (#0421bc); no secondary accent scale exists on purpose.
        link: {
          DEFAULT: "#0421bc",
          hover: "#031a96",
        },
      },
      fontFamily: {
        // Self-hosted via @fontsource (see app/layout.tsx). Inter for all UI text —
        // crisp at 12–14px with true tabular figures; JetBrains Mono for machine
        // data (IMEI, plates, coordinates); Hind Siliguri for Bengali script.
        sans: [
          '"Inter Variable"',
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        display: ['"Inter Variable"', "Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        bengali: ['"Hind Siliguri"', '"Inter Variable"', "sans-serif"],
      },
      fontSize: {
        // ADL Moto Viewer font sizes
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],   // --G-F-S grid font
        base: ["14px", "20px"],
        md: ["16px", "24px"],   // --F-S base font
        lg: ["18px", "28px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "36px"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600", // --F-W
        bold: "700",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "2px",
        md: "4px",
        lg: "4px",
        xl: "8px",
        mkt: "8px",      // Marketing pages
        "mkt-lg": "12px", // Marketing cards
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        panel: "0 1px 3px 0 rgba(0,0,0,0.08)",
        card: "0 2px 8px rgba(0,0,0,0.09)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)",
        // Marketing shadows
        "mkt-sm": "0 2px 8px -2px rgba(0,0,0,0.08)",
        "mkt-md": "0 4px 16px -4px rgba(0,0,0,0.12)",
        "mkt-lg": "0 8px 32px -8px rgba(0,0,0,0.16)",
      },
      spacing: {
        "4.5": "18px",
        "13": "52px",
        "15": "60px",
      },
    },
  },
  plugins: [],
};

export default config;
