import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette sobria: blu scuro rassicurante + verde "fiducia" come accento.
        brand: {
          50: "#eefdf4",
          100: "#d6f9e4",
          200: "#b0f1cc",
          300: "#7be4ad",
          400: "#40cd86",
          500: "#16b268", // accento primario
          600: "#0a9054",
          700: "#0a7245",
          800: "#0c5a39",
          900: "#0b4a31",
        },
        ink: {
          DEFAULT: "#0f172a", // slate-900 — testo/heading
          soft: "#334155", // slate-700 — testo corrente
          muted: "#64748b", // slate-500 — testo secondario
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
        cta: "0 8px 24px rgba(10,144,84,0.28)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        "fade-in": "fade-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
