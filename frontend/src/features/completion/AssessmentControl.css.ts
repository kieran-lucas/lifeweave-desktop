import { keyframes, style } from "@vanilla-extract/css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

const settle = keyframes({
  "0%": { transform: "scale(.86)", opacity: 0.62 },
  "62%": { transform: "scale(1.08)", opacity: 1 },
  "100%": { transform: "scale(1)", opacity: 1 },
});

export const anchor = style({
  position: "relative",
  display: "inline-grid",
  placeItems: "center",
  blockSize: 36,
  minInlineSize: 0,
});

export const trigger = style([
  focusRing,
  {
    minWidth: 36,
    height: 36,
    padding: "0 9px",
    minBlockSize: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid rgba(17, 24, 39, .12)",
    borderRadius: 10,
    background: "rgba(255, 255, 255, .72)",
    color: "#555555",
    cursor: "pointer",
    selectors: {
      "&:hover:not(:disabled)": { borderColor: "rgba(17, 24, 39, .28)", backgroundColor: "#fff", color: "#111827" },
      "&:active:not(:disabled)": { transform: "scale(.94)" },
      "&:disabled": { cursor: "not-allowed", opacity: 0.34 },
    },
    transition: `transform ${duration.check} ${easing.standard}, border-color ${duration.check} ${easing.standard}, background-color ${duration.check} ${easing.standard}, color ${duration.check} ${easing.standard}`,
  },
]);

export const label = style({
  maxInlineSize: 86,
  overflow: "hidden",
  ...text.caption,
  fontWeight: 700,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media": {
    "(max-width: 680px)": { display: "none" },
  },
});

/**
 * Progress lives entirely inside this fixed 22px puck. State changes never alter row geometry.
 * The four states are encoded by fill amount and mark shape, so the interaction remains legible
 * without relying on color.
 */
export const ring = style({
  position: "relative",
  width: 22,
  height: 22,
  border: "1.5px solid rgba(17, 24, 39, .46)",
  borderRadius: "var(--radius-full)",
  background: "#fff",
  overflow: "hidden",
  transformOrigin: "center",
  transition: `background ${duration.check} ${easing.standard}, border-color ${duration.check} ${easing.standard}, transform ${duration.check} ${easing.standard}`,
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 3,
      borderRadius: "inherit",
      background: "#111827",
      transformOrigin: "bottom",
      transform: "scaleY(0)",
      transition: "transform 240ms cubic-bezier(.2,.8,.2,1)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      left: 6,
      top: 5,
      width: 7,
      height: 4,
      borderLeft: "2px solid #fff",
      borderBottom: "2px solid #fff",
      transform: "rotate(-45deg) scale(.4)",
      opacity: 0,
      transition: `opacity 150ms ${easing.standard}, transform 220ms cubic-bezier(.2,.9,.2,1)`,
    },
    [`${trigger}[data-state=none] &`]: {
      borderColor: "rgba(17, 24, 39, .38)",
      background: "#fff",
    },
    [`${trigger}[data-state=below] &::before`]: { transform: "scaleY(.34)" },
    [`${trigger}[data-state=met] &::before`]: { transform: "scaleY(.72)" },
    [`${trigger}[data-state=excellent] &`]: {
      borderColor: "#111827",
      background: "#111827",
      animation: `${settle} 300ms cubic-bezier(.2,.9,.2,1) both`,
    },
    [`${trigger}[data-state=excellent] &::before`]: { transform: "scaleY(1)" },
    [`${trigger}[data-state=excellent] &::after`]: {
      opacity: 1,
      transform: "rotate(-45deg) scale(1)",
    },
  },
});

export const rail = style({
  position: "fixed",
  zIndex: "var(--layer-overlay)",
  height: 58,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  alignItems: "stretch",
  gap: 4,
  padding: 5,
  border: "1px solid rgba(17, 24, 39, .12)",
  borderRadius: 16,
  background: "rgba(255,255,255,.985)",
  boxShadow: "0 14px 38px rgba(17, 24, 39, .16), 0 2px 8px rgba(17, 24, 39, .08)",
  transformOrigin: "bottom right",
  animation: `${settle} 170ms cubic-bezier(.2,.9,.2,1) both`,
});

export const option = style({
  minWidth: 0,
  height: 46,
  padding: "5px 4px",
  border: 0,
  borderRadius: 11,
  background: "transparent",
  color: "rgba(17, 24, 39, .64)",
  display: "grid",
  gridTemplateRows: "16px 1fr",
  placeItems: "center",
  gap: 2,
  ...text.caption,
  fontWeight: 650,
  lineHeight: 1,
  cursor: "pointer",
  transition: `background-color ${duration.check} ${easing.standard}, color ${duration.check} ${easing.standard}, transform ${duration.check} ${easing.standard}`,
  selectors: {
    "&:hover": { backgroundColor: "rgba(17,24,39,.055)", color: "#111827" },
    "&:active": { transform: "scale(.95)" },
    "&:focus-visible": { outline: "2px solid #111827", outlineOffset: -2 },
    "&[data-active=true]": { backgroundColor: "rgba(17,24,39,.065)", color: "#111827" },
    "&[aria-selected=true]": { backgroundColor: "#111827", color: "#fff" },
  },
});

export const optionMark = style({
  position: "relative",
  width: 14,
  height: 14,
  border: "1.5px solid currentColor",
  borderRadius: "50%",
  overflow: "hidden",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 2,
      borderRadius: "50%",
      background: "currentColor",
      transformOrigin: "bottom",
      transform: "scaleY(0)",
    },
    [`${option}[data-visual=below] &::before`]: { transform: "scaleY(.34)" },
    [`${option}[data-visual=met] &::before`]: { transform: "scaleY(.72)" },
    [`${option}[data-visual=excellent] &::before`]: { transform: "scaleY(1)" },
  },
});
