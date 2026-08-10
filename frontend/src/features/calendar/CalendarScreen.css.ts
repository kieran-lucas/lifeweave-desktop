import { style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const lede = style({ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" });

export const actions = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  minInlineSize: 0,
});

export const monthLabel = style({
  minInlineSize: "10.5rem",
  textAlign: "center",
  fontSize: "0.9375rem",
  fontWeight: 650,
  letterSpacing: "-0.015em",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-primary)",
});

export const iconAction = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 32,
  blockSize: 32,
  padding: 0,
  border: 0,
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F4F4F4", color: "var(--text-primary)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const todayAction = style({
  minBlockSize: 32,
  marginInlineStart: 4,
  paddingInline: 10,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "#FFFFFF",
  color: "var(--text-primary)",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: "#111111" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const grid = style({
  display: "grid",
  minInlineSize: 0,
  borderBlockStart: "1px solid #111111",
  borderBlockEnd: "1px solid var(--border-subtle)",
  background: "#FFFFFF",
});

export const weekdays = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--text-muted)",
  textAlign: "center",
  paddingBlock: 9,
  fontSize: "0.6875rem",
  fontWeight: 650,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
});

export const week = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" });

export const cell = style({
  minWidth: 0,
  minHeight: 102,
  borderInlineStart: "1px solid var(--border-subtle)",
  selectors: {
    "&:first-child": { borderInlineStart: 0 },
    [`${week}:not(:last-child) &`]: { borderBottom: "1px solid var(--border-subtle)" },
  },
});

export const cellButton = style({
  width: "100%",
  height: "100%",
  minHeight: 102,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "space-between",
  gap: space.x2,
  padding: "10px 11px",
  border: 0,
  background: "#FFFFFF",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&[data-outside]": { color: "#AAAAAA" },
    "&:hover": { backgroundColor: "#F7F7F7" },
    "[aria-selected=true] &": { backgroundColor: "#111111", color: "#FFFFFF" },
    "&:focus-visible": { position: "relative", outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: { "[aria-selected=true] &": { background: "Highlight", color: "HighlightText" } },
    },
  },
});

export const dayNumber = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 27,
  blockSize: 27,
  border: "1px solid transparent",
  borderRadius: "var(--radius-full)",
  fontSize: "0.8125rem",
  fontWeight: 650,
  fontVariantNumeric: "tabular-nums",
  selectors: {
    [`${cellButton}[aria-current=date] &`]: { borderColor: "currentColor" },
    [`${cellButton}[data-outside] &`]: { fontWeight: 450 },
  },
});

export const summary = style({
  display: "flex",
  alignItems: "baseline",
  gap: 4,
  minInlineSize: 0,
  color: "var(--text-muted)",
  fontSize: "0.6875rem",
  lineHeight: 1.25,
  selectors: {
    [`${cellButton}[aria-selected=true] &`]: { color: "#D7D7D7" },
  },
});

export const taskCount = style({ color: "currentColor", fontSize: "0.875rem", fontWeight: 750, fontVariantNumeric: "tabular-nums" });
export const duration = style({ marginInlineStart: "auto", color: "currentColor", fontVariantNumeric: "tabular-nums" });
export const needsAttention = style({
  marginInlineStart: 3,
  paddingInline: 5,
  border: "1px solid currentColor",
  borderRadius: "var(--radius-small)",
  fontSize: "0.625rem",
  fontWeight: 650,
});
