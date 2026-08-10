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
    `transform ${duration.state} ${easing.standard}, filter ${duration.state} ${easing.standard}`,
  selectors: {
    "&:active:not(:disabled)": { transform: "translateY(1px) scale(0.995)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
    "&:disabled": { cursor: "not-allowed", opacity: 0.5, transform: "none", filter: "none" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transition: `background-color ${reduced.duration} linear, border-color ${reduced.duration} linear, color ${reduced.duration} linear`,
      selectors: { "&:active:not(:disabled)": { transform: "none" } },
    },
    "(forced-colors: active)": { borderColor: "ButtonText", boxShadow: "none", filter: "none" },
  },
});

export const button = styleVariants({
  primary: [
    base,
    {
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(135deg, var(--accent-cyan) -28%, var(--accent) 42%, var(--accent-violet) 120%)",
      borderColor: "color-mix(in srgb, white 24%, var(--accent))",
      color: "white",
      boxShadow: "var(--glow-primary), inset 0 1px 0 color-mix(in srgb, white 46%, transparent)",
      textShadow: "0 1px 6px color-mix(in srgb, var(--text-primary) 20%, transparent)",
      selectors: {
        "&:hover:not(:disabled)": {
          transform: "translateY(-1px)",
          filter: "saturate(1.08) brightness(1.035)",
          boxShadow:
            "0 16px 38px color-mix(in srgb, var(--accent) 34%, transparent), 0 5px 18px color-mix(in srgb, var(--accent-violet) 22%, transparent), inset 0 1px 0 color-mix(in srgb, white 58%, transparent)",
        },
        "&:active:not(:disabled)": { transform: "translateY(1px) scale(0.995)", filter: "saturate(1.02)" },
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
      background:
        "linear-gradient(145deg, color-mix(in srgb, white 48%, transparent), transparent 52%), var(--glass-surface-strong)",
      borderColor: "var(--glass-border)",
      color: "var(--text-primary)",
      boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 5px 16px color-mix(in srgb, var(--accent) 6%, transparent)",
      selectors: {
        "&:hover:not(:disabled)": {
          transform: "translateY(-1px)",
          background: "color-mix(in srgb, var(--glass-surface-strong) 84%, white)",
          borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border-subtle))",
          boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 8px 22px color-mix(in srgb, var(--accent) 10%, transparent)",
        },
        "&:active:not(:disabled)": { transform: "translateY(1px)", background: "var(--active-background)" },
      },
      "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover:not(:disabled)": { transform: "none" } } } },
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
          background:
            "linear-gradient(110deg, color-mix(in srgb, var(--accent-cyan) 9%, transparent), color-mix(in srgb, var(--accent-violet) 8%, transparent))",
          borderColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
          color: "var(--text-primary)",
        },
        "&:active:not(:disabled)": { background: "color-mix(in srgb, var(--accent) 14%, transparent)" },
      },
    },
  ],

  destructive: [
    base,
    {
      background: "color-mix(in srgb, var(--danger) 3%, transparent)",
      borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)",
      color: "var(--danger)",
      selectors: {
        "&:hover:not(:disabled)": {
          background: "color-mix(in srgb, var(--danger) 9%, transparent)",
          borderColor: "var(--danger)",
          boxShadow: "0 7px 20px color-mix(in srgb, var(--danger) 10%, transparent)",
        },
      },
    },
  ],
});

export const iconButton = style([
  base,
  {
    minWidth: 32,
    width: 32,
    height: 32,
    padding: 0,
    borderRadius: "var(--radius-control)",
  },
]);

export const compact = style({
  minHeight: 26,
  padding: "2px 9px",
  fontSize: 12.5,
  borderRadius: "var(--radius-small)",
});
