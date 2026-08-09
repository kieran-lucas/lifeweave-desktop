import { style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { glassStrong, progressBar } from "../../design-system/visual/atmosphere.css";

/*
 * Calendar, composed for Visual Baseline v2.
 *
 * Calendar owns no page width. It is a WIDE_WORKSPACE and consumes the shared `PageFrame`, which is
 * also the query container its cells reflow against (ADR 0044).
 *
 * The design decision that shapes this file: **the grid is drawn with hairlines, not with cards.**
 *
 * The previous version rendered the grid as a 1 px `gap` over a `--border-subtle` background, so
 * every one of 35–42 cells became a separate filled tile floating on a coloured sheet. That reads
 * as a card per day, which is exactly what the v2 direction rules out, and it made the whole month
 * a field of boxes before a single date was read.
 *
 * Here the grid is one continuous surface and the separators are real 1 px hairlines drawn on the
 * cells themselves — outer border on the container, inner borders on cells, no double lines. What
 * carries the composition is the date typography, the whitespace inside each cell, and a single
 * blue for today and for selection.
 */

export const eyebrow = style({ margin: 0, color: "var(--text-muted)", fontSize: "0.8125rem" });

export const actions = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: space.control,
  minInlineSize: 0,
});

/** The month label between the arrows. Tabular so the header does not shift month to month. */
export const monthLabel = style({
  minInlineSize: "9.5rem",
  textAlign: "center",
  fontSize: "0.9375rem",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  fontVariantNumeric: "tabular-nums",
});

/** Low-chrome: a hairline and a hover tone, no fill at rest. */
export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  minWidth: 32,
  paddingInline: 10,
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: "0.8125rem",
  cursor: "pointer",
  transition: "background-color 100ms cubic-bezier(0.2,0,0,1), color 100ms cubic-bezier(0.2,0,0,1)",
  selectors: {
    "&:hover": { background: "var(--icon-background)", color: "var(--text-primary)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

/**
 * One continuous surface with a single outer hairline and a 12 px radius, matching the Today row
 * group. `overflow: hidden` lets the corner cells clip to the radius so no cell fill escapes it.
 */
export const grid = style([
  glassStrong,
  { display: "grid", borderRadius: 12, overflow: "hidden", minInlineSize: 0 },
]);

export const weekdays = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--text-muted)",
  textAlign: "center",
  paddingBlock: 10,
  fontSize: "0.75rem",
  fontWeight: 500,
  letterSpacing: "0.02em",
});

export const week = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" });

/*
 * Separators live on the cell, so there is exactly one line between neighbours and none on the
 * outer edge where the container already draws one.
 */
export const cell = style({
  minWidth: 0,
  minHeight: 112,
  borderInlineStart: "1px solid var(--border-subtle)",
  selectors: {
    "&:first-child": { borderInlineStart: 0 },
    [`${week}:not(:last-child) &`]: { borderBottom: "1px solid var(--border-subtle)" },
  },
});

/**
 * Today and selection are the only blue on the screen, and they are deliberately different marks:
 * today gets a filled accent disc behind its date number, selection gets the pale fill the whole
 * v2 system uses. Neither depends on colour alone — today also carries `aria-current="date"` and
 * selection `aria-selected`, and the two remain distinguishable in forced colors because one is a
 * shape and the other is a field.
 */
export const cellButton = style({
  width: "100%",
  height: "100%",
  minHeight: 112,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 7,
  padding: "9px 10px",
  border: 0,
  background: "transparent",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  transition: "background-color 100ms cubic-bezier(0.2,0,0,1)",
  selectors: {
    // Days outside the shown month recede by tone, not by opacity: opacity dims the hairlines too.
    "&[data-outside]": { color: "var(--text-muted)" },
    "&:hover": { background: "var(--icon-background)" },
    "[aria-selected=true] &": { background: "var(--icon-background)" },
    "&:focus-visible": { position: "relative", outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
});

export const dayNumber = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 24,
  blockSize: 24,
  borderRadius: 999,
  fontSize: "0.8125rem",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  selectors: {
    [`${cellButton}[aria-current=date] &`]: {
      background: "var(--accent)",
      color: "#fff",
    },
    [`${cellButton}[data-outside] &`]: { fontWeight: 400 },
  },
});

export const summary = style({
  display: "grid",
  gap: 5,
  fontSize: "0.6875rem",
  lineHeight: 1.35,
  color: "var(--text-muted)",
});

export const icons = style({ display: "flex", gap: 4, alignItems: "center" });

/*
 * Period load stays a real three-part reading of morning / afternoon / evening — it is factual
 * schedule information, not decoration, and the accessible summary depends on all three. What
 * changes is its weight: 3 px bars in the neutral track with the accent fill, so a dense month
 * reads as texture rather than as colour.
 */
export const loads = style({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 });

/**
 * The load bars are `<progress>` elements and must be styled through their shadow parts.
 *
 * `accent-color` alone was not enough: adding `border`/`border-radius` moves Chromium off the
 * native control path, and the fallback rendering ignored the accent and painted the default
 * **green** — every day in the month showed a green bar, which the v2 direction bans outright. It
 * was invisible in the CSS and obvious the moment the month was rendered.
 *
 * `appearance: none` plus explicit track and value backgrounds removes the ambiguity: the track is
 * the neutral fill, the value is the accent, and no user-agent colour can leak through.
 */
export const load = style([progressBar, { width: "100%", height: 3 }]);

/**
 * Unevaluated past work keeps a distinct semantic colour rather than being folded into the blue
 * accent. It is a warning, and the v2 direction explicitly preserves warning and error semantics
 * instead of forcing every state into one hue.
 */
export const missed = style({
  display: "grid",
  placeItems: "center",
  width: 15,
  height: 15,
  borderRadius: "50%",
  background: "var(--icon-background)",
  color: "#a34b24",
  fontSize: "0.625rem",
  fontWeight: 700,
});
