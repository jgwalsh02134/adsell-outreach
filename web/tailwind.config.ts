import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1A73E8",
        secondary: "#00B2A9",
        accent: "#2D9CDB",
        bg: "#0B0E14",
        fg: "#F7F9FC",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;


