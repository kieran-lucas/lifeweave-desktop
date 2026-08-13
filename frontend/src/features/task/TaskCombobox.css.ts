import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { button, compact } from "../../design-system/primitives/controls.css";
import { text } from "../../design-system/visual/typography.css";

/**
 * Geometry shared by the Life area and Focus Plan comboboxes.
 *
 * Both previously rendered a bare `<div>` holding an inline `<label>` and `<input>`, which read as
 * `Life areaNone` and `Focus PlanNone` — the label/control concatenation that is a blocking layout
 * defect, not a cosmetic one. The field unit itself comes from the shared layout authority; only
 * the popup list is local.
 */

export const listbox = style({
  position: "absolute",
  insetInline: 0,
  insetBlockStart: `calc(100% + ${space.x1})`,
  zIndex: "var(--layer-overlay)",
  inlineSize: "100%",
  boxSizing: "border-box",
  listStyle: "none",
  margin: 0,
  padding: space.x2,
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  maxBlockSize: "14rem",
  overflowY: "auto",
  minInlineSize: 0,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-floating)",
  background: "var(--surface-raised)",
  boxShadow: "var(--elevation-floating)",
  "@media": {
    "screen and (max-width: 65rem)": {
      insetBlockStart: "auto",
      insetBlockEnd: `calc(100% + ${space.x1})`,
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
  ...text.compactBody,
  selectors: {
    "&[aria-selected=true]": { background: "var(--active-background)" },
    "&[data-active=true]": { boxShadow: "inset 2px 0 0 var(--accent)" },
    "&[data-hierarchical]": {
      position: "relative",
      flexWrap: "nowrap",
      minBlockSize: 38,
      paddingInlineStart: `calc(${space.control} + var(--tree-indent, 0px) + 16px)`,
    },
    "&[data-hierarchical]::before": {
      content: '"└"',
      position: "absolute",
      insetInlineStart: `calc(${space.control} + var(--tree-indent, 0px))`,
      color: "var(--border-strong)",
      fontSize: 11,
    },
    '&[data-hierarchy-depth="0"]': {
      marginBlockStart: space.x1,
      background: "var(--surface-subtle)",
      fontWeight: 760,
      letterSpacing: ".025em",
    },
    '&[data-hierarchy-depth="0"]::before': {
      content: '"●"',
      color: "var(--accent)",
      fontSize: 7,
    },
    "&:hover": { background: "var(--active-background)" },
  },
});

/** The breadcrumb is secondary to the title and must not run into it. */
globalStyle(`${option} span`, { color: "var(--text-muted)" });

export const empty = style({ ...text.compactBody, padding: `${space.x1} ${space.control}`, color: "var(--text-muted)" });

export const clear = style([button.ghost, compact, { alignSelf: "flex-start" }]);

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
