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
        primary: {
          DEFAULT: "#0F172A", // Obsidian Navy
          container: "#131B2E",
          fixed: "#DAE2FD",
        },
        secondary: {
          DEFAULT: "#1E3A8A", // Deep Royal
          container: "#8FA7FE",
          cobalt: "#1D4ED8",  // Bright Cobalt
        },
        tertiary: {
          DEFAULT: "#10B981", // Verification Emerald
          dark: "#059669",
          container: "#002113",
        },
        accent: {
          amber: "#F59E0B",   // Escrow Warning
          amberDark: "#D97706",
        },
        surface: {
          DEFAULT: "#F8FAFC", // Base Canvas
          card: "#FFFFFF",    // Pure White Card
          subtle: "#EFF4FF",
          variant: "#D3E4FE",
        },
        border: {
          DEFAULT: "#E2E8F0",
          medium: "#CBD5E1",
          dark: "#76777D",
        },
      },
      fontFamily: {
        headline: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem", // 8px
        lg: "1rem",        // 16px
        xl: "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        ambient: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)",
        lifted: "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
        elevated: "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)",
      }
    },
  },
  plugins: [],
};

export default config;
