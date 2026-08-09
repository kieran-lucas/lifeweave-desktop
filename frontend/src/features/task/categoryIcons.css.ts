import { style } from "@vanilla-extract/css";

/**
 * The two category marks, drawn rather than typed.
 *
 * Both sit on the same 10px optical box so a row of mixed categories keeps one rhythm, and both
 * take `currentColor` so they inherit whatever the surrounding text role has decided — the same
 * contract the vendored icons follow.
 */
const markBase = style({
  display: "inline-block",
  inlineSize: 10,
  blockSize: 10,
  flexShrink: 0,
  /* Optical centring against a 12.5px metadata line, where a raw inline box sits slightly high. */
  verticalAlign: "-0.06em",
  "@media": {
    /* A tinted shape means nothing in a high-contrast palette; fall back to the system text colour. */
    "(forced-colors: active)": { background: "CanvasText", borderColor: "CanvasText" },
  },
});

/** The default category: a filled disc, the quieter and more common of the two. */
export const markGeneral = style([
  markBase,
  { borderRadius: "var(--radius-full)", background: "currentColor", opacity: 0.75 },
]);

/**
 * Any other category: an outlined diamond, so the distinction survives without colour — the two
 * marks differ in fill *and* in shape, which `docs/ACCESSIBILITY_AND_INPUT.md` requires.
 */
export const markOther = style([
  markBase,
  {
    border: "1.5px solid currentColor",
    /* Sharp corners: the radius scale starts at 6px, which on a 10px mark would round the diamond
     * away entirely. A deliberate square corner is a declaration, not an unscaled literal. */
    transform: "rotate(45deg) scale(0.82)",
    opacity: 0.75,
  },
]);
