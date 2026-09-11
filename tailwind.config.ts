import type { Config } from "tailwindcss";

/**
 * The palette is built around the green a spreadsheet user already associates
 * with this kind of document, rather than a generic product blue.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9f2",
          100: "#d5f0e0",
          200: "#aae1c2",
          300: "#74cb9d",
          400: "#3fb176",
          500: "#1a9c5c",
          600: "#0f9d58",
          700: "#0b8043",
          800: "#0a6636",
          900: "#08512d",
        },
        // The page sits on a warm light ground rather than on black, and the
        // contrast sections use a deep green rather than a darker grey, so the
        // dark parts still read as part of the same palette.
        ground: "#edefe8",
        paper: "#ffffff",
        deep: {
          DEFAULT: "#12332a",
          soft: "#1b4436",
          line: "#2c5b49",
        },
        ink: {
          DEFAULT: "#16211c",
          muted: "#5a6b62",
          subtle: "#8b9a92",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "grow-bar": {
          from: { transform: "scaleY(0.15)" },
          to: { transform: "scaleY(1)" },
        },
        "rise-bar": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        "poster-in": {
          from: { opacity: "0", transform: "translateY(28px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // The clip box is deliberately taller than the line box. Vietnamese
        // marks rise above the cap height and a flush "inset(0 ...)" would cut
        // every accent off the headline.
        "wipe-in": {
          from: { clipPath: "inset(-35% 100% -20% 0)" },
          to: { clipPath: "inset(-35% 0 -20% 0)" },
        },
        // A slow lift and settle, for things that should feel held in the air.
        hover: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // A ribbon that never ends: the content is doubled and slid by half.
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        // A light sweeping across a button on hover.
        sheen: {
          from: { transform: "translateX(-120%) skewX(-18deg)" },
          to: { transform: "translateX(220%) skewX(-18deg)" },
        },
        // The line joining the steps draws itself left to right.
        "draw-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "70%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        float: "float 5s ease-in-out infinite",
        "grow-bar": "grow-bar 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rise-bar": "rise-bar 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "poster-in": "poster-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "wipe-in": "wipe-in 1s cubic-bezier(0.76, 0, 0.24, 1) both",
        hover: "hover 6s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        sheen: "sheen 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "draw-x": "draw-x 1.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "pop-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "spin-slow": "spin-slow 18s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
