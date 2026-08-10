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
  transition:
    `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
    `color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, ` +
    `transform ${duration.press} ${easing.standard}`,
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
      borderColor: "color-mix(in srgb, var(--accent) 76%, var(--paint-edge))",
      color: "var(--accent-contrast)",
      boxShadow: "var(--glow-primary)",
      selectors: {
        "&:hover:not(:disabled)": {
          transform: "translateY(-1px)",
          backgroundColor: "color-mix(in srgb, var(--accent) 88%, var(--accent-violet))",
          boxShadow: "var(--glow-hover)",
        },
        "&:active:not(:disabled)": {
          transform: "translateY(1px)",
          backgroundColor: "color-mix(in srgb, var(--accent) 84%, var(--text-primary))",
        },
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
      backgroundColor: "var(--paint-sheet-strong)",
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "var(--paint-edge)",
      color: "var(--text-primary)",
      boxShadow: "var(--glow-compact)",
      selectors: {
        "&:hover:not(:disabled)": {
          transform: "translateY(-1px)",
          backgroundColor: "var(--surface-hover)",
          borderColor: "var(--paint-edge-strong)",
          boxShadow: "var(--glow-hover)",
        },
        "&:active:not(:disabled)": {
          transform: "translateY(1px)",
          backgroundColor: "var(--paint-selected)",
        },
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
        "&:hover:not(:disabled)": {
          backgroundColor: "var(--surface-hover)",
          backgroundImage: "var(--paint-grain-fine)",
          borderColor: "var(--paint-edge)",
          color: "var(--text-primary)",
        },
        "&:active:not(:disabled)": { backgroundColor: "var(--paint-selected)" },
      },
    },
  ],

  destructive: [
    base,
    {
      backgroundColor: "color-mix(in srgb, var(--danger) 4%, var(--paint-sheet))",
      backgroundImage: "var(--paint-grain-fine)",
      borderColor: "color-mix(in srgb, var(--danger) 30%, var(--paint-edge))",
      color: "var(--danger)",
      selectors: {
        "&:hover:not(:disabled)": {
          backgroundColor: "color-mix(in srgb, var(--danger) 9%, var(--paint-sheet))",
          borderColor: "var(--danger)",
          boxShadow: "var(--glow-danger)",
        },
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
