import { keyframes, style } from "@vanilla-extract/css";

const breathe = keyframes({
  "0%": { transform: "scale(1) translate3d(0,0,0)", opacity: 0.84 },
  "50%": { transform: "scale(1.035) translate3d(-0.7%,0.6%,0)", opacity: 1 },
  "100%": { transform: "scale(1.015) translate3d(0.8%,-0.5%,0)", opacity: 0.9 },
});

const veilDrift = keyframes({
  "0%": { transform: "translate3d(-2%, -1%, 0) rotate(-2deg)" },
  "50%": { transform: "translate3d(2%, 1.5%, 0) rotate(1deg)" },
  "100%": { transform: "translate3d(-1%, 2%, 0) rotate(-1deg)" },
});

const orbitDrift = keyframes({
  "0%": { transform: "translate3d(0,0,0) rotate(0deg)", opacity: 0.72 },
  "50%": { transform: "translate3d(-8px,5px,0) rotate(1.5deg)", opacity: 0.95 },
  "100%": { transform: "translate3d(4px,-3px,0) rotate(0deg)", opacity: 0.78 },
});

const starPulse = keyframes({
  "0%, 100%": { opacity: 0.38, transform: "scale(0.88)" },
  "50%": { opacity: 1, transform: "scale(1.12)" },
});

const petalDrift = keyframes({
  "0%": { transform: "translate3d(0,-4px,0) rotate(-3deg)", opacity: 0.24 },
  "50%": { transform: "translate3d(10px,8px,0) rotate(6deg)", opacity: 0.58 },
  "100%": { transform: "translate3d(-4px,14px,0) rotate(2deg)", opacity: 0.3 },
});

export const root = style({
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
  background:
    "linear-gradient(145deg, color-mix(in srgb, var(--accent-ice) 28%, transparent), transparent 36%), var(--app-background)",
});

export const aura = style({
  position: "absolute",
  inset: "-7%",
  backgroundImage: `
    radial-gradient(880px 620px at 88% 4%, var(--art-aura-primary), transparent 64%),
    radial-gradient(760px 560px at 73% 42%, var(--art-aura-secondary), transparent 68%),
    radial-gradient(720px 560px at 3% 88%, var(--art-aura-cool), transparent 68%),
    radial-gradient(560px 440px at 36% 5%, var(--art-aura-rose), transparent 66%)
  `,
  filter: "saturate(1.08)",
  animation: `${breathe} 19s ease-in-out infinite alternate`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

export const veil = style({
  position: "absolute",
  inset: "-18%",
  opacity: 0.72,
  background:
    "conic-gradient(from 220deg at 78% 16%, transparent 0deg 55deg, color-mix(in srgb, var(--accent-violet) 14%, transparent) 82deg, transparent 116deg 220deg, color-mix(in srgb, var(--accent-cyan) 12%, transparent) 256deg, transparent 292deg 360deg)",
  filter: "blur(34px)",
  animation: `${veilDrift} 27s ease-in-out infinite alternate`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
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
  animation: `${orbitDrift} 22s ease-in-out infinite alternate`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

export const orbitalSlow = style({
  transformOrigin: "16% 84%",
  animation: `${orbitDrift} 31s ease-in-out infinite alternate-reverse`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

export const stars = style({
  transformOrigin: "50% 50%",
  selectors: { "& > *": { transformOrigin: "center" } },
});

export const starA = style({ animation: `${starPulse} 4.8s ease-in-out infinite` });
export const starB = style({ animation: `${starPulse} 6.2s 1.3s ease-in-out infinite` });
export const starC = style({ animation: `${starPulse} 7.1s 2.1s ease-in-out infinite` });

export const petals = style({
  transformOrigin: "50% 50%",
  animation: `${petalDrift} 18s ease-in-out infinite alternate`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none", transform: "none" } },
});

export const prism = style({
  opacity: 0.6,
  filter: "drop-shadow(0 10px 22px color-mix(in srgb, var(--accent-violet) 18%, transparent))",
});

/* Shared crystal material. */
export const glass = style({
  background:
    "linear-gradient(145deg, color-mix(in srgb, white 44%, transparent) 0%, transparent 44%), var(--glass-surface)",
  border: "1px solid var(--glass-border)",
  boxShadow:
    "inset 0 1px 0 var(--glass-highlight), 0 16px 46px color-mix(in srgb, var(--accent) 8%, transparent)",
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      backdropFilter: "blur(var(--glass-blur)) saturate(1.24)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.24)",
    },
  },
});

export const glassStrong = style({
  background:
    "linear-gradient(145deg, color-mix(in srgb, white 52%, transparent) 0%, transparent 42%), var(--glass-surface-strong)",
  border: "1px solid var(--glass-border)",
  boxShadow:
    "inset 0 1px 0 var(--glass-highlight), 0 20px 54px color-mix(in srgb, var(--accent) 9%, transparent)",
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      backdropFilter: "blur(calc(var(--glass-blur) * 0.8)) saturate(1.18)",
      WebkitBackdropFilter: "blur(calc(var(--glass-blur) * 0.8)) saturate(1.18)",
    },
  },
});

export const forcedColorsReset = style({
  "@media": {
    "(forced-colors: active)": {
      background: "Canvas",
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
  background: "color-mix(in srgb, var(--accent) 7%, var(--border-subtle))",
  color: "var(--accent)",
  boxShadow: "inset 0 1px 2px color-mix(in srgb, var(--text-primary) 8%, transparent)",
  selectors: {
    "&::-webkit-progress-bar": {
      background: "color-mix(in srgb, var(--accent) 7%, var(--border-subtle))",
      borderRadius: "var(--radius-full)",
    },
    "&::-webkit-progress-value": {
      background: "linear-gradient(90deg, var(--accent-cyan), var(--accent), var(--accent-violet))",
      borderRadius: "var(--radius-full)",
      boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 30%, transparent)",
    },
    "&::-moz-progress-bar": {
      background: "linear-gradient(90deg, var(--accent-cyan), var(--accent), var(--accent-violet))",
      borderRadius: "var(--radius-full)",
    },
  },
});
