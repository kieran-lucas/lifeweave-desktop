import { keyframes, style } from "@vanilla-extract/css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { vars } from "../../design-system/visual/contract.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

const markSettle = keyframes({
  "0%": { transform: "scale(.82)", opacity: 0.64 },
  "100%": { transform: "scale(1)", opacity: 1 },
});

const railEnter = keyframes({
  "0%": { transform: "translateY(4px) scale(.985)", opacity: 0 },
  "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
});

const lowSettle = keyframes({
  "0%": { transform: "translateY(1px) scale(.9)", opacity: 0.72 },
  "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
});

const doneSettle = keyframes({
  "0%": { transform: "translateY(1px) scale(.84)", opacity: 0.68 },
  "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
});

export const anchor = style({
  position: "relative",
  display: "inline-grid",
  placeItems: "center",
  blockSize: 30,
  minInlineSize: 0,
});

export const trigger = style([
  focusRing,
  {
    width: 72,
    height: 30,
    padding: "0 7px",
    minBlockSize: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-control)",
    background: "var(--surface-raised)",
    color: "var(--text-muted)",
    boxShadow: "0 1px 2px rgba(0, 0, 0, .04)",
    cursor: "pointer",
    selectors: {
      "&:hover:not(:disabled)": {
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--surface-hover)",
        color: "var(--text-primary)",
        boxShadow: "var(--glow-compact)",
        transform: "translateY(-1px)",
      },
      "&:active:not(:disabled)": { transform: "translateY(1px) scale(.98)", boxShadow: "none" },
      "&:disabled": { cursor: "not-allowed", opacity: 0.34 },
    },
    transition: `transform ${duration.check} ${easing.standard}, border-color ${duration.check} ${easing.standard}, background-color ${duration.check} ${easing.standard}, color ${duration.check} ${easing.standard}`,
  },
]);

export const label = style({
  inlineSize: 34,
  minInlineSize: 34,
  overflow: "hidden",
  ...text.caption,
  fontWeight: 700,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

/**
 * A compact flat circle paired with a persistent text label, so state never relies on colour alone.
 */
export const ring = style({
  position: "relative",
  inlineSize: 17,
  minInlineSize: 17,
  blockSize: 17,
  aspectRatio: "1 / 1",
  flex: "0 0 17px",
  border: 0,
  borderRadius: "50%",
  background: vars.assessmentCircle.none,
  color: "var(--surface-raised)",
  overflow: "hidden",
  transformOrigin: "center",
  transition: `transform ${duration.check} ${easing.standard}`,
  selectors: {
    [`${trigger}[data-state=none] &`]: { background: vars.assessmentCircle.none },
    [`${trigger}[data-state=below] &`]: {
      background: vars.assessmentCircle.low,
      animation: `${lowSettle} ${duration.check} ${easing.standard} both`,
    },
    [`${trigger}[data-state=met] &`]: {
      background: vars.assessmentCircle.done,
      animation: `${doneSettle} ${duration.check} ${easing.standard} both`,
    },
    [`${trigger}[data-state=excellent] &`]: {
      background: vars.assessmentCircle.great,
      animation: `${markSettle} ${duration.check} ${easing.standard} both`,
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
    "(forced-colors: active)": {
      border: "1px solid CanvasText",
      background: "Canvas",
      boxShadow: "none",
      color: "CanvasText",
    },
  },
});

export const rail = style({
  position: "fixed",
  zIndex: "var(--layer-overlay)",
  minHeight: 58,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  alignItems: "stretch",
  gap: 4,
  padding: 5,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-floating)",
  background: "var(--surface-raised)",
  boxShadow: "var(--elevation-floating)",
  transformOrigin: "bottom right",
  animation: `${railEnter} ${duration.popover} ${easing.standard} both`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const option = style({
  minWidth: 0,
  minHeight: 46,
  padding: "5px 4px",
  border: 0,
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "var(--text-muted)",
  display: "grid",
  gridTemplateRows: "16px 1fr",
  placeItems: "center",
  gap: 2,
  ...text.caption,
  fontWeight: 650,
  lineHeight: 1.15,
  cursor: "pointer",
  transition: `background-color ${duration.check} ${easing.standard}, color ${duration.check} ${easing.standard}, transform ${duration.check} ${easing.standard}`,
  selectors: {
    "&:hover": { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)", transform: "translateY(-1px)" },
    "&:active": { transform: "translateY(1px) scale(.98)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
    "&[data-active=true]": { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" },
    "&[aria-selected=true]": { backgroundColor: "var(--text-primary)", color: "var(--surface-raised)" },
  },
});

export const optionMark = style({
  position: "relative",
  inlineSize: 15,
  blockSize: 15,
  aspectRatio: "1 / 1",
  border: 0,
  borderRadius: "50%",
  background: vars.assessmentCircle.none,
  overflow: "hidden",
  color: "var(--surface-raised)",
  selectors: {
    [`${option}[data-visual=none] &`]: { background: vars.assessmentCircle.none },
    [`${option}[data-visual=below] &`]: { background: vars.assessmentCircle.low },
    [`${option}[data-visual=met] &`]: { background: vars.assessmentCircle.done },
    [`${option}[data-visual=excellent] &`]: { background: vars.assessmentCircle.great },
  },
  "@media": {
    "(forced-colors: active)": {
      border: "1px solid CanvasText",
      background: "Canvas",
      boxShadow: "none",
      color: "CanvasText",
    },
  },
});
