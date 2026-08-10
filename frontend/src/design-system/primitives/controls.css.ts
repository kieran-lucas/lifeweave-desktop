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
      background: "linear-gradient(135deg, var(--accent), #7864EE)",
      borderColor: "rgba(255,255,255,.38)",
      color: "#FFFFFF",
      boxShadow: "var(--glow-primary), inset 0 1px 0 rgba(255,255,255,.26)",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", background: "linear-gradient(135deg, #4468F0, #6E59DF)", borderColor: "rgba(255,255,255,.54)", boxShadow: "0 13px 32px rgba(70,93,218,.27), inset 0 1px 0 rgba(255,255,255,.30)" },
        "&:active:not(:disabled)": { transform: "translateY(1px) scale(.99)", background: "linear-gradient(135deg, #3658D9, #6250C8)" },
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
      background: "rgba(255,255,255,.70)",
      backdropFilter: "blur(12px)",
      borderColor: "var(--glass-border)",
      color: "var(--text-primary)",
      boxShadow: "var(--glow-compact), inset 0 1px 0 rgba(255,255,255,.82)",
      selectors: {
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", background: "rgba(241,246,255,.94)", borderColor: "rgba(113,143,219,.48)", boxShadow: "var(--glow-hover)" },
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
        "&:hover:not(:disabled)": { backgroundColor: "rgba(239,244,255,.76)", borderColor: "rgba(185,202,228,.54)", color: "var(--text-primary)" },
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
        "&:hover:not(:disabled)": { background: "linear-gradient(135deg, #E55B7D, #C84269)", borderColor: "rgba(255,255,255,.45)", color: "#FFFFFF", boxShadow: "var(--glow-danger)" },
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
