import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1A73E8",
        secondary: "#00B2A9",
        bg: "#0B0E14",
        fg: "#F7F9FC",
        accent: "#2D9CDB",
        card: "#0F131A",
        muted: "#1B2330",
        border: "rgba(255,255,255,0.08)",
      },
      boxShadow: { soft: "0 8px 30px rgba(0,0,0,0.25)" },
      borderRadius: { xl: "14px", "2xl": "20px" },
      fontFamily: {
        heading: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;


