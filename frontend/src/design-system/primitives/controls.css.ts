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
    `color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:active:not(:disabled)": { transform: "translateY(1px)" },
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
      backgroundColor: "var(--accent)",
      borderColor: "var(--accent)",
      color: "var(--accent-contrast)",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", backgroundColor: "var(--accent-muted)", borderColor: "var(--accent-muted)" },
        "&:active:not(:disabled)": { transform: "translateY(1px)", backgroundColor: "var(--text-primary)", borderColor: "var(--text-primary)" },
      },
      "@media": {
        "(forced-colors: active)": { background: "Highlight", color: "HighlightText", borderColor: "Highlight" },
        "(prefers-reduced-motion: reduce)": { selectors: { "&:hover:not(:disabled)": { transform: "none" } } },
      },
    },
  ],

  secondary: [
    base,
    {
      backgroundColor: "var(--surface-raised)",
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "var(--paint-edge)",
      color: "var(--text-primary)",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", backgroundColor: "var(--surface-hover)", borderColor: "var(--text-primary)" },
        "&:active:not(:disabled)": { transform: "translateY(1px)", backgroundColor: "var(--surface-selected)" },
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
        "&:hover:not(:disabled)": { backgroundColor: "var(--surface-hover)", borderColor: "var(--paint-edge)", color: "var(--text-primary)" },
        "&:active:not(:disabled)": { backgroundColor: "var(--surface-selected)" },
      },
    },
  ],

  destructive: [
    base,
    {
      backgroundColor: "var(--surface-raised)",
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "var(--text-primary)",
      color: "var(--text-primary)",
      selectors: {
        "&:hover:not(:disabled)": { backgroundColor: "var(--text-primary)", borderColor: "var(--text-primary)", color: "var(--app-background)" },
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
