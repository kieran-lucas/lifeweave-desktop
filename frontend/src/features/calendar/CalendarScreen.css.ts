import { style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { vars } from "../../design-system/visual/contract.css";

export const calendarShell = style({
  inlineSize: "100%",
  minInlineSize: 0,
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 22,
  color: vars.color.textPrimary,
});

export const masthead = style({
  minBlockSize: 74,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 24,
  paddingInline: 4,
});

export const headingBlock = style({
  display: "grid",
  gap: 3,
  minInlineSize: 0,
});

export const kicker = style({
  color: vars.color.textTertiary,
  fontSize: 11,
  lineHeight: "16px",
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
});

export const monthTitle = style({
  margin: 0,
  color: vars.color.textPrimary,
  fontSize: "clamp(28px, 3.2vw, 42px)",
  lineHeight: 1.04,
  fontWeight: 720,
  letterSpacing: "-.045em",
});

export const commandBar = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: 3,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: 12,
  background: vars.color.surfaceRaised,
  boxShadow: "0 2px 8px rgba(31, 48, 75, .045)",
});

const command = {
  minBlockSize: 34,
  border: 0,
  borderRadius: 9,
  background: "transparent",
  color: vars.color.textSecondary,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover, color: vars.color.textPrimary },
    "&:active": { transform: "scale(.96)" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
} as const;

export const iconAction = style({
  ...command,
  inlineSize: 34,
  display: "inline-grid",
  placeItems: "center",
  padding: 0,
});

export const todayAction = style({
  ...command,
  paddingInline: 11,
  fontSize: 12,
  fontWeight: 700,
});

export const statusMessage = style({
  margin: 0,
  padding: "10px 12px",
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceSubtle,
  color: vars.color.textSecondary,
  fontSize: 13,
});

export const monthCanvas = style({
  minInlineSize: 0,
  overflow: "hidden",
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.surface,
  backgroundColor: vars.color.surfaceRaised,
  boxShadow: "0 10px 32px rgba(31, 48, 75, .07), 0 2px 6px rgba(31, 48, 75, .035)",
});

export const weekdays = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  minBlockSize: 38,
  alignItems: "center",
  borderBottom: `1px solid ${vars.color.borderHairline}`,
  background: vars.color.surface,
  color: vars.color.textTertiary,
  textAlign: "center",
  fontSize: 10,
  lineHeight: "14px",
  fontWeight: 760,
  letterSpacing: ".1em",
  textTransform: "uppercase",
});

export const week = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  minBlockSize: 94,
  selectors: {
    "&:not(:last-child)": { borderBottom: `1px solid ${vars.color.borderHairline}` },
  },
});

export const cell = style({
  minInlineSize: 0,
  minBlockSize: 94,
  selectors: {
    "&:not(:first-child)": { borderInlineStart: `1px solid ${vars.color.borderHairline}` },
  },
});

export const cellButton = style({
  position: "relative",
  inlineSize: "100%",
  blockSize: "100%",
  minBlockSize: 94,
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  alignItems: "start",
  gap: 6,
  padding: "9px 10px 8px",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
  color: vars.color.textPrimary,
  textAlign: "left",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&[data-outside]": { color: vars.color.textDisabled },
    "&:hover": { background: vars.color.surfaceHover },
    "&[data-selected]": { background: vars.color.surfaceSelected, color: vars.color.textPrimary, boxShadow: `inset 0 0 0 1.5px ${vars.color.selectionEdge}` },
    "&:focus-visible": { zIndex: 2, outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -3 },
  },
});

export const dayNumber = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 27,
  blockSize: 27,
  borderRadius: "50%",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 720,
  fontVariantNumeric: "tabular-nums",
  selectors: {
    [`${cellButton}[data-today] &`]: {
      boxShadow: `inset 0 0 0 1.5px ${vars.color.accent}`,
      color: vars.color.accentMuted,
    },
  },
});

export const daySignal = style({
  alignSelf: "end",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minInlineSize: 0,
  color: vars.color.textTertiary,
  selectors: {
    [`${cellButton}[data-selected] &`]: { color: vars.color.accentMuted },
  },
});

export const taskCount = style({
  minInlineSize: 34,
  fontSize: 11,
  lineHeight: "14px",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  letterSpacing: ".01em",
});

export const attentionDot = style({
  inlineSize: 5,
  blockSize: 5,
  borderRadius: "50%",
  background: "currentColor",
});

export const openCue = style({
  alignSelf: "end",
  color: vars.color.accentMuted,
  fontSize: 9,
  lineHeight: "12px",
  fontWeight: 700,
  letterSpacing: ".04em",
  textTransform: "uppercase",
});
