import { style, styleVariants } from "@vanilla-extract/css";

// Side-effect import: a primitive must carry its own palette. Without this these classes
// resolve `var(--accent)` against whatever happened to load first, and the control
// gallery caught the consequence — the primary button rendered white-on-white.
import "../visual/theme.css";
import { duration, easing, reduced } from "../visual/motion.css";
import { text } from "../visual/typography.css";

/**
 * The button system.
 *
 * `app/layout/layout.css.ts` gives every native `button` and `select` its geometry and a low-chrome
 * material at element specificity, so nothing in the product renders as a raw Windows control. That
 * is a *floor*, not a system: it cannot express that Save and Delete are different, or that a
 * toolbar button and a page's primary action are different.
 *
 * This file is that system. A component opts into a variant; the element rule underneath keeps
 * working for anything that has not opted in yet, because these classes are more specific.
 *
 * Every variant carries the full state matrix — rest, hover, active, focus-visible, disabled — plus
 * forced colors. A variant that only changes colour on hover is not finished.
 */

/* The shared skeleton: geometry, type and motion. Variants supply only colour and emphasis. */
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
  /*
   * Only the properties that actually change are transitioned. `transition: all` is prohibited by
   * ADR 0045 §8: it animates layout properties too, which turns a hover into per-frame layout work.
   */
  transition:
    `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
    `color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, ` +
    `transform ${duration.press} ${easing.standard}`,
  selectors: {
    /*
     * Press is a 1px settle, not a scale. Scaling text resamples every glyph for the duration of
     * the press, which reads as a blur on the exact element the user is looking at.
     */
    "&:active:not(:disabled)": { transform: "translateY(1px)" },
    "&:focus-visible": {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: 2,
    },
    "&:disabled": { cursor: "not-allowed", opacity: 0.5, transform: "none" },
  },
  "@media": {
    /* Reduced motion keeps the tonal change and drops the travel — ADR 0045 §6. */
    "(prefers-reduced-motion: reduce)": {
      transition: `background-color ${reduced.duration} linear, border-color ${reduced.duration} linear, color ${reduced.duration} linear`,
      selectors: { "&:active:not(:disabled)": { transform: "none" } },
    },
    "(forced-colors: active)": { borderColor: "ButtonText" },
  },
});

export const button = styleVariants({
  /** The one action a surface most wants the user to take. At most one per view. */
  primary: [
    base,
    {
      background: "var(--accent)",
      borderColor: "var(--accent)",
      color: "var(--accent-contrast)",
      selectors: {
        "&:hover:not(:disabled)": {
          background: "color-mix(in srgb, var(--accent) 88%, var(--text-primary))",
          borderColor: "color-mix(in srgb, var(--accent) 88%, var(--text-primary))",
        },
        "&:active:not(:disabled)": {
          background: "color-mix(in srgb, var(--accent) 78%, var(--text-primary))",
        },
      },
    },
  ],

  /** The default. Reads as a control without competing with the primary action. */
  secondary: [
    base,
    {
      background: "var(--glass-surface-strong)",
      borderColor: "var(--glass-border)",
      color: "var(--text-primary)",
      selectors: {
        "&:hover:not(:disabled)": {
          background: "var(--surface)",
          borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border-subtle))",
        },
        "&:active:not(:disabled)": { background: "var(--active-background)" },
      },
    },
  ],

  /** No container until touched. For dense rows and toolbars, where borders would stack up. */
  ghost: [
    base,
    {
      background: "transparent",
      borderColor: "transparent",
      color: "var(--text-muted)",
      selectors: {
        "&:hover:not(:disabled)": {
          background: "var(--active-background)",
          color: "var(--text-primary)",
        },
        "&:active:not(:disabled)": {
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        },
      },
    },
  ],

  /**
   * Destructive. Red is used because comprehension genuinely benefits — this is the one place the
   * blue identity yields, and it yields only on the action itself, never on the surrounding surface.
   */
  destructive: [
    base,
    {
      background: "transparent",
      borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)",
      color: "var(--danger)",
      selectors: {
        "&:hover:not(:disabled)": {
          background: "color-mix(in srgb, var(--danger) 8%, transparent)",
          borderColor: "var(--danger)",
        },
      },
    },
  ],
});

/**
 * Icon-only. Square, so the optical centre of a 20px glyph sits in the middle of the target, and
 * never smaller than 32px regardless of how small the glyph looks — ADR 0045 §7 forbids a premium
 * style that depends on a 10px hit area.
 */
export const iconButton = style([
  base,
  { minWidth: 32, width: 32, height: 32, padding: 0, borderRadius: "var(--radius-control)" },
]);

/** A denser button for inline row actions, where 32px would dominate a 21px line. */
export const compact = style({ minHeight: 26, padding: "2px 9px", fontSize: 12.5, borderRadius: "var(--radius-small)" });
