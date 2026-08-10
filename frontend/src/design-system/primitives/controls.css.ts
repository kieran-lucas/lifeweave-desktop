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
    "&:disabled": { cursor: "not-allowed", opacity: 0.5, transform: "none" },
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
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "var(--accent)",
      color: "#FFFFFF",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" },
        "&:active:not(:disabled)": { transform: "translateY(1px)", backgroundColor: "#1E40AF", borderColor: "#1E40AF" },
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
      backgroundColor: "#FFFFFF",
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "var(--paint-edge)",
      color: "var(--text-primary)",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", backgroundColor: "#F5F5F5", borderColor: "var(--accent)" },
        "&:active:not(:disabled)": { transform: "translateY(1px)", backgroundColor: "#F3F4F6" },
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
        "&:hover:not(:disabled)": { backgroundColor: "#F5F5F5", borderColor: "var(--paint-edge)", color: "var(--text-primary)" },
        "&:active:not(:disabled)": { backgroundColor: "#F3F4F6" },
      },
    },
  ],

  destructive: [
    base,
    {
      backgroundColor: "#FFFFFF",
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "var(--danger)",
      color: "var(--danger)",
      selectors: {
        "&:hover:not(:disabled)": { backgroundColor: "var(--danger)", borderColor: "var(--danger)", color: "#FFFFFF" },
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
