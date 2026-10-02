import type { Config } from "tailwindcss";

/**
 * EyeOn Design System - family safety (kids + elderly tracking).
 * Warm, rounded and high-contrast; see CLAUDE.md section 10.1.
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
        // Family-safety palette, taken from the EyeOn poster: deep teal primary,
        // warm yellow accent. Every text/background pair below is >= 4.5:1 (WCAG AA)
        // because carers of elderly relatives are a core audience.
        brand: {
          50: "#E8F5F2",
          100: "#C9E8E1",
          200: "#9AD3C7",
          300: "#63B8A8",
          400: "#2F9A87",
          500: "#0F6B5C", // Primary teal (6.4:1 with white)
          600: "#0C5A4D",
          700: "#0A4A40",
          800: "#083B33",
          900: "#052822",
        },
        // Warm accent: highlights, icon tiles, the "safe" celebratory moments.
        // Always pair with ink-900 text (9.5:1), never white.
        sun: {
          50: "#FFF8E6",
          100: "#FFEEC2",
          200: "#FFE3A0",
          300: "#FFD886",
          400: "#FFC857",
          500: "#F5B535",
          600: "#D9971F",
          700: "#A86F12",
        },
        // Surface colors (faint teal-tinted neutrals)
        surface: {
          0: "#ffffff",
          50: "#F7FAF9",
          100: "#EEF4F2", // page background
          200: "#E1EAE7",
          300: "#D2DEDA", // border
          400: "#BCCBC6",
        },
        // Text colors (teal-tinted greys). 400 is the lightest shade allowed for text.
        ink: {
          50: "#ffffff",
          100: "#F2F6F5",
          200: "#E1E8E6",
          300: "#C2CECB",
          400: "#637370", // placeholders, field labels (5.0:1)
          500: "#52625F", // secondary text (6.4:1)
          600: "#3E4E4B",
          700: "#2B3B38", // primary text
          800: "#1C2B28", // input text
          900: "#0B2E28", // headings; also the text colour on sun-*
          950: "#061C18",
        },
        // Alarm severity / feedback colours. Darkened from the old ADL hues so they
        // stay readable as text (text-alarm-red) as well as fills.
        alarm: {
          red: "#D92D20",
          amber: "#B45309",
          green: "#15803D",
        },
        // Status colors
        status: {
          moving: "#16A34A",  // Green
          stopped: "#2563EB", // Blue
          idle: "#D97706",    // Orange
          offline: "#6B7A77", // Gray
        },
        // Legacy alias kept so existing `adl-*` classes pick up the new palette.
        adl: {
          primary: "#0F6B5C",
          primaryHover: "rgba(15, 107, 92, 0.1)",
          headerBg: "#0F6B5C",
          sidebarBg: "#0F6B5C",
          border: "#D2DEDA",
          text: "#2B3B38",
          textSecondary: "#52625F",
          inputBg: "#ffffff",
          cardBg: "#ffffff",
          pageBg: "#EEF4F2",
        },
        // Marketing accent colors
        accent: {
          teal: "#14b8a6",
        },
        // Text-link colour = primary teal.
        link: {
          DEFAULT: "#0F6B5C",
          hover: "#0A4A40",
        },
      },
      fontFamily: {
        // Self-hosted via @fontsource (see app/layout.tsx). Nunito for UI text - rounded
        // terminals read as friendly and stay legible for older eyes; Baloo Da 2 for
        // headings (covers Latin + Bengali, matches the poster); JetBrains Mono for
        // machine data (IMEI, coordinates); Hind Siliguri for Bengali body text.
        sans: [
          '"Nunito Variable"',
          "Nunito",
          // Bengali digits only (see globals.css): Hind Siliguri's digit one is hard to read.
          '"EyeOn Bengali Digits"',
          '"Hind Siliguri"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        display: ['"Baloo Da 2 Variable"', '"Baloo Da 2"', '"Nunito Variable"', '"Hind Siliguri"', "sans-serif"],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        bengali: ['"EyeOn Bengali Digits"', '"Hind Siliguri"', '"Nunito Variable"', "sans-serif"],
      },
      fontSize: {
        // One step larger than the old fleet scale; 12px is the floor.
        xs: ["13px", "18px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        md: ["17px", "26px"],
        lg: ["19px", "28px"],
        xl: ["22px", "30px"],
        "2xl": ["26px", "34px"],
        "3xl": ["32px", "40px"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600", // --F-W
        bold: "700",
      },
      borderRadius: {
        // Soft, rounded corners throughout (the poster's cards are ~20px).
        none: "0",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        mkt: "12px",      // Marketing pages
        "mkt-lg": "20px", // Marketing cards
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
