import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          navy: "#0a1128",
          darkNavy: "#050b1a",
          deepTeal: "#006466",
        },
        noryvanta: {
          primary: "#113D60",
          deepBlue: "#0A4664",
          teal: "#12768A",
          brightTeal: "#1E96AA",
          cyan: "#3CB4D2",
        },
        primary: {
          DEFAULT: "#113D60", // Noryvanta Global Primary Blue
          container: "#0A4664",
          fixed: "#DAE2FD",
        },
        secondary: {
          DEFAULT: "#0284c7", // Vibrant Cyan
          container: "#bae6fd",
          cobalt: "#0369a1",
        },
        tertiary: {
          DEFAULT: "#10b981", // Verification Emerald
          dark: "#059669",
          container: "#002113",
        },
        accent: {
          teal: "#06b6d4",
          cyan: "#38bdf8",
          amber: "#f59e0b",
          amberDark: "#d97706",
        },
        surface: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          subtle: "#f0f9ff",
          variant: "#e0f2fe",
          dark: "#070d1e",
        },
        border: {
          DEFAULT: "#e2e8f0",
          medium: "#cbd5e1",
          dark: "#64748b",
          cyan: "#bae6fd",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
        headline: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.875rem",
        xl: "1.25rem",
        "2xl": "1.75rem",
        full: "9999px",
      },
      boxShadow: {
        ambient: "0 1px 3px 0 rgba(17, 61, 96, 0.04), 0 1px 2px -1px rgba(17, 61, 96, 0.03)",
        lifted: "0 4px 6px -1px rgba(17, 61, 96, 0.06), 0 2px 4px -2px rgba(17, 61, 96, 0.04)",
        elevated: "0 20px 25px -5px rgba(17, 61, 96, 0.08), 0 8px 10px -6px rgba(17, 61, 96, 0.03)",
        glow: "0 0 25px -5px rgba(30, 150, 170, 0.3)",
        glowTeal: "0 0 30px -5px rgba(18, 118, 138, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
