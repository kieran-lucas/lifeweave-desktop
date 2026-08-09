import { style } from "@vanilla-extract/css";

/**
 * Layer 0 geometry, plus the shared material classes the rest of the application composes with.
 *
 * These are the only places the art system is defined. A feature that wants glass uses `glass`; it
 * does not invent a translucent background of its own, which is how the previous 31-radius,
 * 14-shadow sprawl happened one layer down.
 */

/**
 * The atmosphere sits behind everything, fixed to the viewport rather than to the page, so it does
 * not scroll with content — the field stays put and the product moves over it, which is what makes
 * it read as a world rather than as a very tall background image.
 */
export const root = style({
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
});

/**
 * Three aura fields, anchored off-centre.
 *
 * Placement is the whole design: every centre is at or beyond an edge, so the middle of the screen —
 * where task titles, tables and prose live — stays clean canvas. The field is present at the
 * periphery, which is where atmosphere belongs.
 */
export const aura = style({
  position: "absolute",
  inset: 0,
  backgroundImage: `
    radial-gradient(1100px 720px at 92% -8%, var(--art-aura-primary), transparent 66%),
    radial-gradient(900px 640px at 104% 46%, var(--art-aura-secondary), transparent 68%),
    radial-gradient(820px 600px at -8% 104%, var(--art-aura-cool), transparent 70%)
  `,
});

export const lines = style({ position: "absolute", inset: 0, inlineSize: "100%", blockSize: "100%" });

/* ── Layer 3: glass ──────────────────────────────────────────────────────────────────────── */

/**
 * The shared glass material.
 *
 * Tint carries it, blur refines it. `background` alone produces the correct surface, so the
 * hierarchy survives if `backdrop-filter` is unsupported, disabled, or dropped under forced colors —
 * text contrast never depends on the blur being applied. The `@supports` guard means the blur is an
 * enhancement rather than a requirement.
 *
 * The inset highlight is what stops translucency reading as "faded": a one-pixel light edge along
 * the top gives the surface a lit rim, which is most of what makes glass look like a material
 * rather than like reduced opacity.
 */
export const glass = style({
  background: "var(--glass-surface)",
  border: "1px solid var(--glass-border)",
  boxShadow: `inset 0 1px 0 var(--glass-highlight)`,
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      backdropFilter: "blur(var(--glass-blur)) saturate(1.15)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.15)",
    },
  },
});

/** For surfaces carrying dense text, where a more opaque tint keeps reading effortless. */
export const glassStrong = style({
  background: "var(--glass-surface-strong)",
  border: "1px solid var(--glass-border)",
  boxShadow: `inset 0 1px 0 var(--glass-highlight)`,
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      backdropFilter: "blur(var(--glass-blur)) saturate(1.1)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.1)",
    },
  },
});

/**
 * Forced colors removes the material entirely.
 *
 * A translucent tint and a blur mean nothing in a high-contrast palette and can actively harm it, so
 * both are dropped and the surface falls back to `Canvas` with a real `CanvasText` border. This is
 * the one place the art system is switched off rather than adapted, because the user has asked the
 * OS for exactly that.
 */
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

/* ── Layer 4: luminous state ─────────────────────────────────────────────────────────────── */

/** A selected object gains light rather than a heavier outline. */
export const selectedGlow = style({ boxShadow: "var(--glow-selected)" });

/**
 * Content that must sit above the atmosphere.
 *
 * The field is `z-index: 0` and fixed; anything the user reads or clicks needs its own stacking
 * context above it. Applied at the shell so individual features never have to think about it.
 */
export const aboveAtmosphere = style({ position: "relative", zIndex: 1 });

/* ── Shared controls ─────────────────────────────────────────────────────────────────────── */

/**
 * The one progress-bar material in the application.
 *
 * `accent-color` alone is not reliable on `<progress>`: as soon as an author sets geometry that
 * moves Chromium off its native control path, the element falls back to user-agent rendering and
 * paints the default **green**. Calendar shipped exactly that — a green bar on every day of the
 * month — and Analytics carried the same pattern.
 *
 * Rather than patch each site, the material lives here: `appearance: none` plus explicit track and
 * value backgrounds, so no user-agent colour can appear regardless of what geometry a consumer adds.
 * Any future progress bar composes this and inherits the guarantee.
 */
export const progressBar = style({
  appearance: "none",
  WebkitAppearance: "none",
  border: 0,
  borderRadius: "var(--radius-full)",
  overflow: "hidden",
  accentColor: "var(--accent)",
  background: "var(--border-subtle)",
  color: "var(--accent)",
  selectors: {
    "&::-webkit-progress-bar": { background: "var(--border-subtle)", borderRadius: "var(--radius-full)" },
    "&::-webkit-progress-value": { background: "var(--accent)", borderRadius: "var(--radius-full)" },
    "&::-moz-progress-bar": { background: "var(--accent)", borderRadius: "var(--radius-full)" },
  },
});
