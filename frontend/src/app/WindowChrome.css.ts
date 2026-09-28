import { style } from "@vanilla-extract/css";

import { focusRing } from "../design-system/primitives/utilities.css";
import { duration, easing } from "../design-system/visual/motion.css";

export const chrome = style({
  gridColumn: "1 / -1",
  gridRow: 1,
  display: "flex",
  minWidth: 0,
  height: 38,
  padding: "3px 5px 3px 8px",
  background: "var(--sidebar-background)",
  borderBottom: "1px solid var(--border-subtle)",
  userSelect: "none",
  WebkitUserSelect: "none",
  "@media": { "(forced-colors: active)": { background: "Canvas", borderBottomColor: "CanvasText" } },
});

export const dragRegion = style({
  flex: 1,
  minWidth: 0,
  cursor: "default",
});

export const controls = style({ display: "flex", alignItems: "center", gap: 4 });

export const control = style([
  focusRing,
  {
    display: "grid",
    placeItems: "center",
    width: 38,
    height: 30,
    padding: 0,
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": { background: "var(--surface-hover)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" },
      "&:active": { transform: "translateY(1px) scale(.96)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:active": { transform: "none" } } },
      "(forced-colors: active)": { selectors: { "&:hover": { background: "Highlight", color: "HighlightText" } } },
    },
  },
]);

export const closeControl = style({
  selectors: {
    "&:hover": { background: "var(--danger)", borderColor: "var(--danger)", color: "var(--accent-contrast)" },
  },
  "@media": {
    "(forced-colors: active)": { selectors: { "&:hover": { background: "Highlight", borderColor: "Highlight", color: "HighlightText" } } },
  },
});

export const glyph = style({
  display: "block",
  width: 17,
  height: 17,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  pointerEvents: "none",
});
