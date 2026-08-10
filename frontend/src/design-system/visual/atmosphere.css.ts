import { keyframes, style } from "@vanilla-extract/css";

/*
 * Matte Anime Painted Atlas atmosphere.
 * Motion is intentionally slow and transform/opacity-only so the field feels alive without
 * becoming an animated wallpaper. No backdrop blur, moving filter or shadow interpolation lives here.
 */
const washDrift = keyframes({
  "0%": { transform: "translate3d(-3px,-2px,0) scale(1.008)", opacity: 0.86 },
  "50%": { transform: "translate3d(4px,3px,0) scale(1.014)", opacity: 1 },
  "100%": { transform: "translate3d(1px,-1px,0) scale(1.01)", opacity: 0.9 },
});

const orbitDrift = keyframes({
  "0%": { transform: "translate3d(0,0,0)", opacity: 0.56 },
  "50%": { transform: "translate3d(-3px,2px,0)", opacity: 0.68 },
  "100%": { transform: "translate3d(2px,-2px,0)", opacity: 0.58 },
});

const petalDrift = keyframes({
  "0%": { transform: "translate3d(0,-2px,0) rotate(-1deg)", opacity: 0.28 },
  "50%": { transform: "translate3d(5px,4px,0) rotate(2deg)", opacity: 0.42 },
  "100%": { transform: "translate3d(-2px,7px,0) rotate(1deg)", opacity: 0.31 },
});

export const root = style({
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
  background: "var(--paint-canvas)",
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      backgroundImage: "var(--paint-grain-fine)",
      opacity: 0.42,
      pointerEvents: "none",
    },
  },
});

/** Broad gouache-like washes. They are pigment fields, not luminous glass glows. */
export const aura = style({
  position: "absolute",
  inset: "-5%",
  backgroundImage: `
    radial-gradient(860px 560px at 91% 2%, var(--art-aura-primary), transparent 68%),
    radial-gradient(720px 520px at 76% 39%, var(--art-aura-secondary), transparent 72%),
    radial-gradient(720px 520px at 2% 91%, var(--art-aura-cool), transparent 72%),
    radial-gradient(520px 400px at 33% 3%, var(--art-aura-rose), transparent 70%)
  `,
  animation: `${washDrift} 36s cubic-bezier(0.37,0,0.63,1) infinite alternate`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" },
  },
});

/** A flat dry-brush band that breaks the perfect digital gradient without adding blur. */
export const veil = style({
  position: "absolute",
  inset: 0,
  opacity: 0.5,
  backgroundImage: `
    linear-gradient(163deg,
      transparent 0 21%,
      color-mix(in srgb, var(--accent-ice) 22%, transparent) 21.5% 27%,
      transparent 27.5% 61%,
      color-mix(in srgb, var(--accent-violet) 6%, transparent) 62% 66%,
      transparent 67% 100%)
  `,
  backgroundSize: "100% 100%",
});

export const lines = style({
  position: "absolute",
  inset: 0,
  inlineSize: "100%",
  blockSize: "100%",
  overflow: "visible",
});

export const orbital = style({
  transformOrigin: "80% 20%",
  animation: `${orbitDrift} 42s cubic-bezier(0.37,0,0.63,1) infinite alternate`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

export const orbitalSlow = style({
  transformOrigin: "16% 84%",
  animation: `${orbitDrift} 54s cubic-bezier(0.37,0,0.63,1) infinite alternate-reverse`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

/* Stars are ink/silver marks now; no pulsing. */
export const stars = style({ opacity: 0.64 });
export const starA = style({ opacity: 0.82 });
export const starB = style({ opacity: 0.62 });
export const starC = style({ opacity: 0.48 });

export const petals = style({
  transformOrigin: "50% 50%",
  animation: `${petalDrift} 46s cubic-bezier(0.37,0,0.63,1) infinite alternate`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

/** Flat illustrated seal — intentionally no drop-shadow/glow. */
export const prism = style({ opacity: 0.42 });

/* ── Shared painted materials ────────────────────────────────────────────────────────────── */

export const paintBoard = style({
  backgroundColor: "var(--paint-board)",
  backgroundImage: "var(--paint-grain)",
  border: "1px solid var(--paint-edge)",
  boxShadow: "var(--glow-compact)",
});

export const paintSheet = style({
  backgroundColor: "var(--paint-sheet)",
  backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)",
  border: "1px solid var(--paint-edge)",
  boxShadow: "var(--glow-crystal)",
});

export const paintSheetStrong = style({
  backgroundColor: "var(--paint-sheet-strong)",
  backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue), var(--paint-wash-violet)",
  border: "1px solid var(--paint-edge)",
  boxShadow: "var(--glow-crystal-strong)",
});

/** Compatibility aliases for existing consumers. Rendered material is matte/opaque. */
export const glass = paintSheet;
export const glassStrong = paintSheetStrong;

export const forcedColorsReset = style({
  "@media": {
    "(forced-colors: active)": {
      background: "Canvas",
      backgroundImage: "none",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      border: "1px solid CanvasText",
      boxShadow: "none",
    },
  },
});

export const selectedGlow = style({ boxShadow: "var(--glow-selected)" });
export const aboveAtmosphere = style({ position: "relative", zIndex: 1 });

export const progressBar = style({
  appearance: "none",
  WebkitAppearance: "none",
  border: 0,
  borderRadius: "var(--radius-full)",
  overflow: "hidden",
  accentColor: "var(--accent)",
  background: "color-mix(in srgb, var(--accent) 8%, var(--border-subtle))",
  color: "var(--accent)",
  selectors: {
    "&::-webkit-progress-bar": {
      background: "color-mix(in srgb, var(--accent) 8%, var(--border-subtle))",
      borderRadius: "var(--radius-full)",
    },
    "&::-webkit-progress-value": {
      background: "linear-gradient(90deg, var(--accent-cyan), var(--accent), var(--accent-violet))",
      borderRadius: "var(--radius-full)",
    },
    "&::-moz-progress-bar": {
      background: "linear-gradient(90deg, var(--accent-cyan), var(--accent), var(--accent-violet))",
      borderRadius: "var(--radius-full)",
    },
  },
});
