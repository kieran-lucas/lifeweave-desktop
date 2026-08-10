import { style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { paintSheetStrong, progressBar } from "../../design-system/visual/atmosphere.css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const eyebrow = style({
  margin: 0,
  color: "var(--accent)",
  fontSize: "0.8125rem",
  fontWeight: 650,
  letterSpacing: "0.045em",
  textTransform: "uppercase",
});

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minInlineSize: 0 });

export const monthLabel = style({
  minInlineSize: "10.5rem",
  textAlign: "center",
  fontSize: "1rem",
  fontWeight: 650,
  letterSpacing: "-0.012em",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-primary)",
});

export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  minWidth: 34,
  paddingInline: 11,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-muted)",
  fontSize: "0.8125rem",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": {
      color: "var(--accent)",
      borderColor: "var(--accent)",
      backgroundColor: "#FFFFFF",
      boxShadow: "none",
      transform: "translateY(-1px)",
    },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
});

export const grid = style([
  paintSheetStrong,
  {
    display: "grid",
    borderRadius: "var(--radius-surface)",
    overflow: "hidden",
    minInlineSize: 0,
    borderColor: "var(--paint-edge)",
    boxShadow: "none",
  },
]);

/** Weekday bar is one unambiguous solid-blue block. */
export const weekdays = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  borderBottom: "1px solid var(--accent)",
  backgroundColor: "var(--accent)",
  backgroundImage: "var(--paint-grain-fine)",
  color: "#FFFFFF",
  textAlign: "center",
  paddingBlock: 11,
  fontSize: "0.75rem",
  fontWeight: 650,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
});

export const week = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" });

export const cell = style({
  minWidth: 0,
  minHeight: 96,
  borderInlineStart: "1px solid var(--paint-edge)",
  selectors: {
    "&:first-child": { borderInlineStart: 0 },
    [`${week}:not(:last-child) &`]: { borderBottom: "1px solid var(--paint-edge)" },
  },
});

export const cellButton = style({
  width: "100%",
  height: "100%",
  minHeight: 96,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 8,
  padding: "10px 11px",
  border: 0,
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
  selectors: {
    "&[data-outside]": { color: "var(--text-muted)" },
    "&:hover": { backgroundColor: "#F5F5F5", boxShadow: "none" },
    "[aria-selected=true] &": {
      backgroundColor: "#FFFFFF",
      backgroundImage: "var(--paint-grain-fine)",
      boxShadow: "inset 3px 0 0 var(--accent)",
    },
    "&:focus-visible": { position: "relative", outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: { "[aria-selected=true] &": { borderInlineStart: "3px solid Highlight", boxShadow: "none", background: "Canvas" } },
    },
  },
});

export const dayNumber = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 29,
  blockSize: 27,
  border: "1px solid transparent",
  borderRadius: "var(--radius-small)",
  fontSize: "0.8125rem",
  fontWeight: 650,
  fontVariantNumeric: "tabular-nums",
  transition: `background-color ${duration.state} ${easing.standard}`,
  selectors: {
    [`${cellButton}[aria-current=date] &`]: {
      borderColor: "var(--accent)",
      backgroundColor: "var(--accent)",
      backgroundImage: "var(--paint-grain-fine)",
      color: "#FFFFFF",
      boxShadow: "none",
    },
    [`${cellButton}[data-outside] &`]: { fontWeight: 400 },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        [`${cellButton}[aria-current=date] &`]: { borderColor: "Highlight", background: "Highlight", color: "HighlightText", boxShadow: "none" },
      },
    },
  },
});

export const summary = style({ display: "grid", gap: 5, fontSize: "0.6875rem", lineHeight: 1.35, color: "var(--text-muted)" });
export const icons = style({ display: "flex", gap: 4, alignItems: "center" });
export const loads = style({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 });
export const load = style([progressBar, { width: "100%", height: 6 }]);
export const missed = style({
  display: "grid",
  placeItems: "center",
  width: 16,
  height: 16,
  borderRadius: "var(--radius-full)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  border: "1px solid var(--danger)",
  color: "var(--danger)",
  fontSize: "0.625rem",
  fontWeight: 750,
  boxShadow: "none",
});
