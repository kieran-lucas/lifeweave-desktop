import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { text } from "../visual/typography.css";

/**
 * Empty, loading and error states.
 *
 * The product shipped **20 bare `No x.` strings** and **37 bare `<p>Loading…</p>` fallbacks**, with
 * no skeleton or spinner anywhere. Those are the moments a user meets most often on a quiet day, and
 * they were the least designed surfaces in the application. ADR 0045's benchmark override makes them
 * in scope; this file is the shared grammar so no surface invents its own again.
 */

/* ── Empty ───────────────────────────────────────────────────────────────────────────────── */

/**
 * Composition is deliberately vertical and centred with generous air. An empty region is the one
 * place the layout can afford space, and space is what stops "nothing here" reading as "broken".
 */
export const empty = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "34px 24px",
  textAlign: "center",
  minInlineSize: 0,
});

/** Denser variant for an empty panel inside an already-small region, where 34px would dominate. */
export const emptyCompact = style({ padding: "20px 16px", gap: 7 });

/**
 * The mark. A soft accent-tinted disc holding a 20px outline icon — the same icon vocabulary the
 * rest of the product uses, at low chroma so it reads as punctuation rather than as an illustration.
 * Art stays subtle and consistent; nothing here is bespoke per surface.
 */
export const emptyMark = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 40,
  blockSize: 40,
  borderRadius: 999,
  background: "color-mix(in srgb, var(--accent) 9%, transparent)",
  color: "var(--accent)",
  marginBlockEnd: 2,
  "@media": {
    "(forced-colors: active)": { background: "Canvas", border: "1px solid CanvasText" },
  },
});

/** Editorial, because this is the only line on the surface and it should be worth reading. */
export const emptyTitle = style({ ...text.sectionTitle, color: "var(--text-primary)", margin: 0 });

export const emptyBody = style({
  ...text.compactBody,
  color: "var(--text-muted)",
  margin: 0,
  maxInlineSize: "44ch",
});

/* ── Loading ─────────────────────────────────────────────────────────────────────────────── */

const shimmer = keyframes({
  "0%": { backgroundPosition: "180% 0" },
  "100%": { backgroundPosition: "-80% 0" },
});

/**
 * A skeleton line.
 *
 * The sweep is a background-position animation over a gradient, so it composites on the GPU and
 * touches neither layout nor paint of anything around it. Under reduced motion the sweep stops and
 * the block stays as a static tone — the information ("something is coming") survives without the
 * movement, which is what ADR 0045 §6 asks for instead of a blanket zeroing.
 */
export const skeleton = style({
  blockSize: 12,
  borderRadius: 6,
  background: `linear-gradient(
    90deg,
    var(--border-subtle) 0%,
    color-mix(in srgb, var(--accent) 7%, var(--border-subtle)) 45%,
    var(--border-subtle) 90%
  )`,
  backgroundSize: "260% 100%",
  animation: `${shimmer} 1450ms linear infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none", background: "var(--border-subtle)" },
    "(forced-colors: active)": { animation: "none", background: "GrayText" },
  },
});

/**
 * A stack of skeleton lines standing in for a list while it loads.
 *
 * The widths vary by position rather than by an inline `style`, both because
 * `scripts/verify_security.py` forbids inline styles outright and because a repeating five-step
 * rhythm belongs in the stylesheet: an even stack of identical bars reads as a table, while an
 * uneven one reads as prose, which is what is actually loading.
 */
export const skeletonList = style({ display: "grid", gap: 12, padding: "6px 0" });

/* vanilla-extract requires a child selector to go through `globalStyle`; `style` may only target
 * `&`. Same mechanism `App.css.ts` and `layout.css.ts` already use for descendant rules. */
const SKELETON_WIDTHS = ["92%", "74%", "84%", "66%", "88%"];
SKELETON_WIDTHS.forEach((inlineSize, index) => {
  globalStyle(`${skeletonList} > *:nth-child(5n+${index + 1})`, { inlineSize });
});

/**
 * The canonical visually-hidden utility.
 *
 * `FocusPlansScreen.css.ts` and `NarrativeCanvas.css.ts` each declared their own copy with slightly
 * different rules; this is the one that should survive. `clip-path` rather than the deprecated
 * `clip`, and no `position: fixed`, so it stays inside the nearest positioned ancestor — Task 50
 * made the main viewport a containing block precisely so these cannot escape its `overflow: auto`.
 */
export const srOnly = style({
  position: "absolute",
  inlineSize: 1,
  blockSize: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
});

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

/**
 * The one spinner. Used only where a skeleton cannot express the shape of what is coming — a
 * button's own pending state, or an indeterminate action with no layout to preview.
 *
 * Reduced motion replaces rotation with a slow opacity pulse rather than freezing the ring, because
 * a frozen spinner reads as a hang.
 */
export const spinner = style({
  inlineSize: 15,
  blockSize: 15,
  borderRadius: 999,
  border: "2px solid color-mix(in srgb, var(--accent) 22%, transparent)",
  borderTopColor: "var(--accent)",
  animation: `${spin} 620ms linear infinite`,
  flexShrink: 0,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: `${keyframes({ "0%,100%": { opacity: 1 }, "50%": { opacity: 0.45 } })} 1200ms ease-in-out infinite`,
      borderTopColor: "var(--accent)",
    },
    "(forced-colors: active)": { borderTopColor: "Highlight" },
  },
});

/** A quiet inline "working…" row: spinner plus label, for Suspense fallbacks. */
export const loadingRow = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "14px 2px",
  ...text.metadata,
  color: "var(--text-muted)",
});
