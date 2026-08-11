import { style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const calendarShell = style({
  inlineSize: "100%",
  minInlineSize: 0,
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 22,
  color: "#111111",
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
  color: "#777777",
  fontSize: 11,
  lineHeight: "16px",
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
});

export const monthTitle = style({
  margin: 0,
  color: "#111111",
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
  border: "1px solid #D9D9D9",
  borderRadius: 12,
  background: "#FFFFFF",
});

const command = {
  minBlockSize: 34,
  border: 0,
  borderRadius: 9,
  background: "transparent",
  color: "#343434",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F1F1F1", color: "#111111" },
    "&:active": { transform: "scale(.96)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
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
  border: "1px solid #D8D8D8",
  borderRadius: 10,
  background: "#FAFAFA",
  color: "#333333",
  fontSize: 13,
});

export const monthCanvas = style({
  minInlineSize: 0,
  overflow: "hidden",
  border: "1px solid #D8D8D8",
  borderRadius: 18,
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "0 14px 40px rgba(0, 0, 0, .055)",
});

export const weekdays = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  minBlockSize: 38,
  alignItems: "center",
  borderBottom: "1px solid #DEDEDE",
  background: "#FAFAFA",
  color: "#777777",
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
    "&:not(:last-child)": { borderBottom: "1px solid #E3E3E3" },
  },
});

export const cell = style({
  minInlineSize: 0,
  minBlockSize: 94,
  selectors: {
    "&:not(:first-child)": { borderInlineStart: "1px solid #E3E3E3" },
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
  background: "transparent",
  color: "#222222",
  textAlign: "left",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&[data-outside]": { color: "#B3B3B3" },
    "&:hover": { background: "#F7F7F7" },
    "&[data-selected]": { background: "#111111", color: "#FFFFFF" },
    "&:focus-visible": { zIndex: 2, outline: "2px solid #111111", outlineOffset: -3 },
    "&[data-selected]:focus-visible": { outlineColor: "#FFFFFF" },
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
      boxShadow: "inset 0 0 0 1.5px currentColor",
    },
  },
});

export const daySignal = style({
  alignSelf: "end",
  display: "grid",
  gridTemplateColumns: "auto minmax(16px, 1fr) auto",
  alignItems: "center",
  gap: 6,
  minInlineSize: 0,
  color: "#656565",
  selectors: {
    [`${cellButton}[data-selected] &`]: { color: "rgba(255,255,255,.74)" },
  },
});

export const taskCount = style({
  minInlineSize: 12,
  fontSize: 10,
  lineHeight: "12px",
  fontWeight: 780,
  fontVariantNumeric: "tabular-nums",
});

export const activityLine = style({
  blockSize: 2,
  borderRadius: 2,
  background: "currentColor",
  opacity: 0.26,
  transformOrigin: "left center",
  selectors: {
    [`${daySignal}[data-intensity=low] &`]: { transform: "scaleX(.32)" },
    [`${daySignal}[data-intensity=medium] &`]: { transform: "scaleX(.64)" },
    [`${daySignal}[data-intensity=high] &`]: { transform: "scaleX(1)" },
  },
});

export const attentionDot = style({
  inlineSize: 5,
  blockSize: 5,
  borderRadius: "50%",
  background: "currentColor",
});

export const openCue = style({
  alignSelf: "end",
  color: "rgba(255,255,255,.76)",
  fontSize: 9,
  lineHeight: "12px",
  fontWeight: 700,
  letterSpacing: ".04em",
  textTransform: "uppercase",
});
