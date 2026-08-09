import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";

/**
 * Geometry shared by the Life area and Focus Plan comboboxes.
 *
 * Both previously rendered a bare `<div>` holding an inline `<label>` and `<input>`, which read as
 * `Life areaNone` and `Focus PlanNone` — the label/control concatenation that is a blocking layout
 * defect, not a cosmetic one. The field unit itself comes from the shared layout authority; only
 * the popup list is local.
 */

export const listbox = style({
  listStyle: "none",
  margin: 0,
  padding: space.x1,
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  maxBlockSize: "14rem",
  overflowY: "auto",
  minInlineSize: 0,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface)",
  "@media": {
    "screen and (max-width: 65rem)": {
      position: "absolute",
      insetInline: 0,
      insetBlockEnd: `calc(100% + ${space.x1})`,
      zIndex: "var(--layer-overlay)",
      inlineSize: "100%",
      boxSizing: "border-box",
    },
  },
});

export const root = style({ position: "relative" });

export const option = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: space.control,
  padding: `${space.x1} ${space.control}`,
  borderRadius: "var(--radius-small)",
  cursor: "pointer",
  minInlineSize: 0,
  selectors: {
    "&[aria-selected=true]": { background: "var(--active-background)" },
    "&:hover": { background: "var(--active-background)" },
  },
});

/** The breadcrumb is secondary to the title and must not run into it. */
globalStyle(`${option} span`, { color: "var(--text-muted)" });

export const empty = style({ padding: `${space.x1} ${space.control}`, color: "var(--text-muted)" });

export const clear = style({
  alignSelf: "flex-start",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "inherit",
  padding: `${space.x1} ${space.control}`,
  cursor: "pointer",
  selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } },
});

export const input = style({
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  minBlockSize: 40,
  padding: `${space.control} ${space.x3}`,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface)",
  color: "inherit",
  font: "inherit",
});
