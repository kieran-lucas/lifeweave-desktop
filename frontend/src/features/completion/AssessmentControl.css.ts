import { globalStyle, keyframes, style } from "@vanilla-extract/css";
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
  "0%": { transform: "translateY(1px) scale(.9) rotate(-7deg)", opacity: 0.72 },
  "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
});

const doneSettle = keyframes({
  "0%": { transform: "translateY(1px) scale(.84) rotate(7deg)", opacity: 0.68 },
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
    minWidth: 30,
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
  maxInlineSize: 58,
  overflow: "hidden",
  ...text.caption,
  fontWeight: 700,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media": {
    "(max-width: 680px)": { display: "none" },
  },
});

export const checkMark = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  zIndex: 1,
  fill: "none",
  opacity: 0,
  transform: "scale(.72)",
  transformOrigin: "center",
  transition: `opacity ${duration.check} ${easing.standard}, transform ${duration.check} ${easing.standard}`,
});

export const lowBackdrop = style({
  fill: "none",
  stroke: "var(--text-primary)",
  strokeWidth: 4.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  opacity: 0,
});

export const lowStroke = style({
  fill: "none",
  stroke: "var(--surface-raised)",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  opacity: 0,
});

export const doneBackdrop = style({
  fill: "none",
  stroke: "var(--text-primary)",
  strokeWidth: 4.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  opacity: 0,
});

export const doneStroke = style({
  fill: "none",
  stroke: "var(--surface-raised)",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  opacity: 0,
});

export const greatBackdrop = style({
  fill: "var(--text-primary)",
  opacity: 0,
});

export const greatStroke = style({
  fill: "var(--surface-raised)",
  opacity: 0,
});

/**
 * A compact, borderless material orb. Colour, label and interior glyph all carry state so the
 * assessment remains understandable without relying on colour alone.
 */
export const ring = style({
  position: "relative",
  width: 17,
  height: 17,
  border: 0,
  borderRadius: "50%",
  background: vars.assessmentOrb.none,
  color: "var(--surface-raised)",
  overflow: "hidden",
  transformOrigin: "center",
  boxShadow: "inset -2px -3px 5px rgba(0,0,0,.24), inset 2px 2px 3px rgba(255,255,255,.32), 0 2px 4px rgba(0,0,0,.17)",
  transition: `transform ${duration.check} ${easing.standard}, box-shadow ${duration.check} ${easing.standard}`,
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      width: "43%",
      height: "27%",
      insetInlineStart: "18%",
      insetBlockStart: "12%",
      borderRadius: "50%",
      background: "rgba(255,255,255,.74)",
      transform: "rotate(-18deg)",
      opacity: .8,
    },
    "&::after": {
      content: '""',
      position: "absolute",
      insetInline: "20%",
      insetBlockEnd: "7%",
      blockSize: "15%",
      borderRadius: "50%",
      background: "rgba(0,0,0,.18)",
      opacity: .65,
    },
    [`${trigger}[data-state=none] &`]: { background: vars.assessmentOrb.none },
    [`${trigger}[data-state=below] &`]: {
      background: vars.assessmentOrb.low,
      animation: `${lowSettle} ${duration.check} ${easing.standard} both`,
    },
    [`${trigger}[data-state=met] &`]: {
      background: vars.assessmentOrb.done,
      animation: `${doneSettle} ${duration.check} ${easing.standard} both`,
    },
    [`${trigger}[data-state=excellent] &`]: {
      background: vars.assessmentOrb.great,
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
  width: 15,
  height: 15,
  border: 0,
  borderRadius: "50%",
  background: vars.assessmentOrb.none,
  overflow: "hidden",
  color: "var(--surface-raised)",
  boxShadow: "inset -2px -2px 4px rgba(0,0,0,.22), inset 1px 1px 2px rgba(255,255,255,.32), 0 1px 3px rgba(0,0,0,.14)",
  selectors: {
    [`${option}[data-visual=none] &`]: { background: vars.assessmentOrb.none },
    [`${option}[data-visual=below] &`]: { background: vars.assessmentOrb.low },
    [`${option}[data-visual=met] &`]: { background: vars.assessmentOrb.done },
    [`${option}[data-visual=excellent] &`]: { background: vars.assessmentOrb.great },
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

globalStyle(`${trigger}[data-state=below] ${ring} ${checkMark}, ${trigger}[data-state=met] ${ring} ${checkMark}, ${trigger}[data-state=excellent] ${ring} ${checkMark}`, {
  opacity: 1,
  transform: "scale(1)",
});
globalStyle(`${option}[data-visual=below] ${optionMark} ${checkMark}, ${option}[data-visual=met] ${optionMark} ${checkMark}, ${option}[data-visual=excellent] ${optionMark} ${checkMark}`, {
  color: "var(--surface-raised)",
  opacity: 1,
  transform: "scale(1)",
});

globalStyle(`${trigger}[data-state=below] ${lowBackdrop}, ${trigger}[data-state=below] ${lowStroke}, ${option}[data-visual=below] ${lowBackdrop}, ${option}[data-visual=below] ${lowStroke}`, {
  opacity: 1,
});

globalStyle(`${trigger}[data-state=met] ${doneBackdrop}, ${trigger}[data-state=met] ${doneStroke}, ${option}[data-visual=met] ${doneBackdrop}, ${option}[data-visual=met] ${doneStroke}`, {
  opacity: 1,
});

globalStyle(`${trigger}[data-state=excellent] ${greatBackdrop}, ${trigger}[data-state=excellent] ${greatStroke}, ${option}[data-visual=excellent] ${greatBackdrop}, ${option}[data-visual=excellent] ${greatStroke}`, {
  opacity: 1,
});
