import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Etsy accent kept, but everything around it tuned to an
        // Apple-like neutral system (near-black ink, soft grays, off-white).
        etsy: {
          orange: "#F1641E",
          orangeDark: "#DD550F",
          dark: "#1D1D1F",
          muted: "#6E6E73",
          faint: "#86868B",
          cream: "#FBF8F5",
          sand: "#ECE7E1",
          canvas: "#F5F5F7",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px -14px rgba(0,0,0,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.05), 0 24px 48px -28px rgba(0,0,0,0.22)",
        lift: "0 18px 40px -16px rgba(0,0,0,0.22)",
        accent: "0 10px 30px -8px rgba(241,100,30,0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(0, -22px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.5s ease both",
        "scale-in": "scale-in 0.55s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
