import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        surface: "var(--color-surface)",
        brand: "var(--color-brand)",
        accent: "var(--color-accent)",
      },
      boxShadow: {
        panel: "0 16px 45px rgba(0, 89, 140, 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
