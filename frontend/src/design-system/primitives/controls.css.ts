import { style, styleVariants } from "@vanilla-extract/css";

import "../visual/theme.css";
import { duration, easing, reduced } from "../visual/motion.css";
import { text } from "../visual/typography.css";

const base = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  minHeight: 32,
  padding: "5px 13px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-control)",
  fontFamily: text.button.fontFamily,
  fontSize: text.button.fontSize,
  fontWeight: text.button.fontWeight,
  lineHeight: text.button.lineHeight,
  letterSpacing: text.button.letterSpacing,
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "none",
  transition:
    `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
    `color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
  selectors: {
    "&:active:not(:disabled)": { transform: "translateY(1px) scale(.99)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
    "&:disabled": { cursor: "not-allowed", opacity: 0.45, transform: "none" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transition: `background-color ${reduced.duration} linear, border-color ${reduced.duration} linear, color ${reduced.duration} linear`,
      selectors: { "&:active:not(:disabled)": { transform: "none" } },
    },
    "(forced-colors: active)": { borderColor: "ButtonText", boxShadow: "none" },
  },
});

export const button = styleVariants({
  primary: [
    base,
    {
      background: "var(--accent)",
      borderColor: "var(--accent)",
      color: "#FFFFFF",
      boxShadow: "none",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", background: "#1D4ED8", borderColor: "#1D4ED8", boxShadow: "none" },
        "&:active:not(:disabled)": { transform: "translateY(1px) scale(.99)", background: "#1E40AF" },
      },
      "@media": {
        "(forced-colors: active)": { background: "Highlight", color: "HighlightText", borderColor: "Highlight", boxShadow: "none" },
        "(prefers-reduced-motion: reduce)": { selectors: { "&:hover:not(:disabled)": { transform: "none" } } },
      },
    },
  ],

  secondary: [
    base,
    {
      background: "#FFFFFF",
      borderColor: "var(--glass-border)",
      color: "var(--text-primary)",
      boxShadow: "none",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", background: "var(--accent-soft)", borderColor: "var(--accent)", boxShadow: "none" },
        "&:active:not(:disabled)": { transform: "translateY(1px) scale(.99)", backgroundColor: "var(--surface-selected)" },
      },
      "@media": {
        "(prefers-reduced-motion: reduce)": { selectors: { "&:hover:not(:disabled)": { transform: "none" } } },
      },
    },
  ],

  ghost: [
    base,
    {
      background: "transparent",
      borderColor: "transparent",
      color: "var(--text-muted)",
      selectors: {
        "&:hover:not(:disabled)": { backgroundColor: "var(--accent-soft)", borderColor: "var(--border-strong)", color: "var(--text-primary)" },
        "&:active:not(:disabled)": { backgroundColor: "var(--surface-selected)" },
      },
    },
  ],

  destructive: [
    base,
    {
      background: "rgba(255,245,248,.78)",
      borderColor: "rgba(217,78,114,.34)",
      color: "var(--danger)",
      boxShadow: "none",
      selectors: {
        "&:hover:not(:disabled)": { background: "#C84269", borderColor: "#C84269", color: "#FFFFFF", boxShadow: "none" },
      },
      "@media": {
        "(forced-colors: active)": { background: "Canvas", color: "LinkText", borderColor: "LinkText", boxShadow: "none" },
      },
    },
  ],
});

export const iconButton = style([
  base,
  { minWidth: 32, width: 32, height: 32, padding: 0, borderRadius: "var(--radius-control)" },
]);

export const compact = style({
  minHeight: 26,
  padding: "2px 9px",
  fontSize: 12.5,
  borderRadius: "var(--radius-small)",
});
