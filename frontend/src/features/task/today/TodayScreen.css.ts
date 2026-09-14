import { globalStyle, style } from "@vanilla-extract/css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { vars } from "../../../design-system/visual/contract.css";

export const dayShell = style({
  inlineSize: "100%",
  display: "grid",
  gap: 20,
  minInlineSize: 0,
});

export const masthead = style({
  minBlockSize: 88,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 22,
  paddingInline: 4,
});

export const headingBlock = style({ display: "grid", gap: 2, minInlineSize: 0 });
export const kicker = style({
  color: "#8A8A8A",
  fontSize: 9,
  lineHeight: "13px",
  fontWeight: 760,
  letterSpacing: ".12em",
  textTransform: "uppercase",
});
export const dayTitle = style({
  margin: 0,
  color: "#111111",
  fontSize: "clamp(38px, 5vw, 58px)",
  lineHeight: .98,
  fontWeight: 700,
  letterSpacing: "-.058em",
});
export const daySummary = style({
  margin: "6px 0 0",
  color: "#777777",
  fontSize: 11,
  lineHeight: "15px",
  fontVariantNumeric: "tabular-nums",
});

export const planButton = style({
  minBlockSize: 38,
  paddingInline: 15,
  border: "1px solid #111111",
  borderRadius: 10,
  background: "#111111",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 720,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#2B2B2B" },
    "&:active": { transform: "scale(.97)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 3 },
  },
});

export const inlineError = style({
  margin: 0,
  padding: "9px 11px",
  border: "1px solid #C9C9C9",
  borderRadius: 9,
  background: "#F7F7F7",
  color: "#333333",
  fontSize: 11,
});

export const agenda = style({
  minInlineSize: 0,
  paddingBlock: 4,
});

export const agendaList = style({
  listStyle: "none",
  display: "grid",
  gap: 0,
  margin: 0,
  padding: 0,
  borderBlockStart: "1px solid #E1E1E1",
});

export const agendaItem = style({
  display: "grid",
  gridTemplateColumns: "74px minmax(0, 1fr)",
  minInlineSize: 0,
  borderBlockEnd: "1px solid #E5E5E5",
  "@media": { "(max-width: 620px)": { gridTemplateColumns: "58px minmax(0,1fr)" } },
});

export const timeRail = style({
  display: "grid",
  gridTemplateRows: "15px 15px",
  justifyItems: "end",
  alignContent: "start",
  gap: 2,
  minBlockSize: 52,
  boxSizing: "border-box",
  padding: "9px 14px 6px 0",
  color: "#929292",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
});
export const timeValue = style({});
globalStyle(`${timeValue}`, {
  display: "block",
  inlineSize: "5ch",
  textAlign: "center",
  color: "#555555",
  fontSize: 11,
  lineHeight: "15px",
  fontWeight: 600,
  fontKerning: "none",
});

export const taskRow = style({
  minBlockSize: 52,
  minInlineSize: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 20px",
  alignItems: "start",
  alignSelf: "stretch",
  gap: 8,
  padding: "8px 8px 7px 7px",
  border: 0,
  borderRadius: 10,
  background: "transparent",
  color: "#222222",
  cursor: "default",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F4F6F8" },
    "&:active": { transform: "scale(.994)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: -2 },
  },
  "@media": {
    "(max-width: 680px)": { gridTemplateColumns: "minmax(0,1fr) 18px" },
  },
});

export const taskCopy = style({ display: "grid", alignContent: "start", gap: 3, minInlineSize: 0 });
export const taskTitleLine = style({
  display: "flex",
  alignItems: "flex-end",
  flexWrap: "wrap",
  columnGap: "1ch",
  rowGap: 3,
  minInlineSize: 0,
});
globalStyle(`${taskTitleLine} > strong`, {
  minInlineSize: 0,
  flex: "0 1 auto",
  color: "#202020",
  fontSize: 13,
  lineHeight: "17px",
  fontWeight: 670,
  letterSpacing: "-.012em",
  overflowWrap: "anywhere",
  whiteSpace: "normal",
});

export const taskDescription = style({
  maxInlineSize: "80%",
  margin: "2px 0 0",
  paddingInlineStart: 9,
  borderInlineStart: "2px solid var(--border-strong)",
  color: "var(--text-primary)",
  fontSize: 12,
  lineHeight: "18px",
  fontWeight: 500,
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
});

export const taskMeta = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  minInlineSize: 0,
  overflow: "hidden",
  color: "#8A8A8A",
  fontSize: 9,
  lineHeight: "12px",
  whiteSpace: "nowrap",
});
globalStyle(`${taskMeta}:empty`, { display: "none" });
globalStyle(`${taskMeta} > span`, { flex: "0 0 auto" });
globalStyle(`${taskMeta} > button`, {
  maxInlineSize: 150,
  overflow: "hidden",
  padding: 0,
  border: 0,
  background: "transparent",
  color: "#747474",
  font: "inherit",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "pointer",
});
globalStyle(`${taskMeta} > button:hover`, { color: "#111111", textDecoration: "underline" });
globalStyle(`${taskMeta} > button:focus-visible`, { outline: "1.5px solid #111111", outlineOffset: 2 });

export const priorityBadge = style({
  inlineSize: "fit-content",
  blockSize: 18,
  minInlineSize: 0,
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-end",
  justifyContent: "flex-start",
  flex: "0 0 auto",
  gap: 4,
  boxSizing: "border-box",
  paddingInline: 5,
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: vars.radius.full,
  background: vars.color.surfaceSubtle,
  color: vars.color.textPrimary,
  fontSize: 9.5,
  lineHeight: "12px",
  fontWeight: 760,
  letterSpacing: ".025em",
  whiteSpace: "nowrap",
  "@media": {
    "(forced-colors: active)": {
      borderColor: "CanvasText",
      background: "Canvas",
      color: "CanvasText",
      forcedColorAdjust: "none",
    },
  },
});

export const priorityMeter = style({
  inlineSize: 11,
  blockSize: 10,
  display: "block",
  flex: "0 0 11px",
  overflow: "visible",
});
globalStyle(`${priorityMeter} > rect`, {
  fill: "currentColor",
  opacity: .2,
});
globalStyle(`${priorityBadge}[data-priority="low"] ${priorityMeter} > rect:nth-child(1)`, { opacity: .7 });
globalStyle(`${priorityBadge}[data-priority="medium"] ${priorityMeter} > rect:nth-child(-n+2)`, { opacity: .7 });
globalStyle(`${priorityBadge}[data-priority="high"] ${priorityMeter} > rect`, { opacity: .7 });

export const priorityText = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "stretch",
  opacity: .9,
});


export const assessmentSlot = style({
  justifySelf: "end",
  alignSelf: "center",
});

globalStyle(`${agendaItem}[data-completed=true] ${taskTitleLine} > strong`, {
  textDecoration: "line-through",
  textDecorationThickness: "1.5px",
});

/* Progressive task composer ------------------------------------------------ */
/* Timer surfaces remain compact and subordinate to the agenda. */
export const timerStrip = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  minBlockSize: 46,
  padding: "7px 9px",
  border: "1px solid #D8D8D8",
  borderRadius: 11,
  background: "#FAFAFA",
});
export const timerRunning = style({ padding: "3px 6px", borderRadius: 6, background: "#111111", color: "#FFFFFF", fontSize: 8, fontWeight: 760, letterSpacing: ".07em", textTransform: "uppercase" });
export const timerTitle = style({ color: "#222222", fontSize: 11, fontWeight: 680 });
export const timerDate = style({ color: "#888888", fontSize: 9 });
export const timerCounter = style({ marginInlineStart: "auto", color: "#222222", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" });
export const timerTotal = style({ color: "#888888", fontSize: 9, fontVariantNumeric: "tabular-nums" });
export const timerStop = style({ minBlockSize: 30, paddingInline: 9, border: "1px solid #111111", borderRadius: 8, background: "#111111", color: "#FFFFFF", fontSize: 9, fontWeight: 700, cursor: "pointer" });
export const timerDiscard = style({ minBlockSize: 30, paddingInline: 9, border: "1px solid #D0D0D0", borderRadius: 8, background: "#FFFFFF", color: "#666666", fontSize: 9, fontWeight: 650, cursor: "pointer" });

export { srOnly } from "../../../design-system/primitives/utilities.css";
