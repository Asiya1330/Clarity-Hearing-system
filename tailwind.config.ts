import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: [
          "var(--font-montserrat)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // --- Existing brand tokens (unchanged) ---
        "brand-navy": "#002147",
        "brand-teal": "#008B8B",
        "brand-slate": "#708090",
        "brand-white": "#FFFFFF",
        // --- Accessible / surface extensions (derived from the brand) ---
        "brand-teal-700": "#00696A", // teal that passes AA as text/links on white
        "brand-ink": "#001A38", // deepest navy for large display
        "brand-muted": "#44525E", // accessible secondary text (~7:1 on white)
        "brand-mist": "#F1F5F6", // section background wash
        "brand-tint": "#E6F0F0", // pale-teal highlight surface
        "brand-line": "#E1E8EA", // hairline rules / borders
        "brand-line-strong": "#C4D0D4", // slightly heavier hairline for emphasized rules
        // --- Premium-report accessible palette ---
        ink: "#001A38", // body/number ink — 16:1
        "muted-ink": "#455A64", // secondary text — 7.24:1 on white
        action: "#00736F", // small teal text — 5.70:1 AA on white
        signal: "#008B8B", // large non-text teal fill / accent
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      maxWidth: {
        prose: "65ch", // age-friendly reading measure
      },
      keyframes: {
        "draw-line": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "draw-line": "draw-line 1.6s ease-out forwards",
        "rise-in": "rise-in 0.7s ease-out both",
        "fade-in": "fade-in 0.22s ease-out both",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
