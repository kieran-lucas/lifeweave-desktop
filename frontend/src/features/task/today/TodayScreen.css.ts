import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { vars } from "../../../design-system/visual/contract.css";

const composerEnter = keyframes({
  from: { opacity: 0, transform: "translateY(14px) scale(.982)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

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
export const composerSurface = style({
  padding: "0 !important",
  overflowX: "hidden",
  overflowY: "auto",
  border: "1px solid #171717 !important",
  borderRadius: "18px !important",
  background: "#F8F9FA !important",
  boxShadow: "0 2px 7px rgb(0 0 0 / .14), 0 26px 72px rgb(0 0 0 / .24), 0 58px 130px rgb(0 0 0 / .14) !important",
  animation: `${composerEnter} ${duration.route} ${easing.standard} both !important`,
  isolation: "isolate",
  "@media": {
    "(forced-colors: active)": {
      borderColor: "CanvasText !important",
      background: "Canvas !important",
      boxShadow: "none !important",
    },
    "(prefers-reduced-motion: reduce)": { animation: "none !important" },
  },
});

export const composer = style({
  display: "flex",
  flexDirection: "column",
  minInlineSize: 0,
  color: "#111111",
});

export const composerHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 24,
  padding: "24px 28px 23px",
  background: "#111111",
  color: "#FFFFFF",
  boxShadow: "inset 0 -1px 0 rgb(255 255 255 / .12)",
  "@media": {
    "(forced-colors: active)": {
      borderBlockEnd: "1px solid CanvasText",
      background: "Canvas",
      color: "CanvasText",
    },
  },
});
export const composerHeadingCopy = style({ display: "grid", gap: 4, minInlineSize: 0 });
globalStyle(`${composerHeadingCopy} h2`, { margin: 0, color: "#FFFFFF", fontSize: 26, lineHeight: "31px", fontWeight: 750, letterSpacing: "-.035em" });

export const closeButton = style({
  inlineSize: 36,
  blockSize: 36,
  display: "grid",
  placeItems: "center",
  flex: "0 0 36px",
  padding: 0,
  border: "1px solid #3B3B3B",
  borderRadius: 10,
  background: "#1B1B1B",
  color: "#D7D7D7",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { borderColor: "#6A6A6A", background: "#2B2B2B", color: "#FFFFFF" },
    "&:active": { transform: "scale(.94)" },
    "&:focus-visible": { outline: "2px solid #FFFFFF", outlineOffset: 3 },
  },
  "@media": { "(forced-colors: active)": { borderColor: "ButtonText", background: "ButtonFace", color: "ButtonText" } },
});
globalStyle(`${closeButton} > span`, {
  position: "relative",
  inlineSize: 15,
  blockSize: 15,
});
globalStyle(`${closeButton} > span::before, ${closeButton} > span::after`, {
  content: "",
  position: "absolute",
  insetInlineStart: 7,
  insetBlockStart: 1,
  inlineSize: 1.5,
  blockSize: 13,
  borderRadius: 2,
  background: "currentColor",
});
globalStyle(`${closeButton} > span::before`, { transform: "rotate(45deg)" });
globalStyle(`${closeButton} > span::after`, { transform: "rotate(-45deg)" });

export const composerError = style({
  margin: "18px 28px 0",
  padding: "10px 12px",
  border: "1px solid #111111",
  borderRadius: 10,
  background: "#F3F3F1",
  color: "#1E1E1E",
  fontSize: 11,
  lineHeight: "16px",
});

export const composerSection = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "start",
  rowGap: 14,
  padding: "21px 28px 23px",
  borderBlockEnd: "1px solid #E5E7EA",
  background: "#FCFCFD",
  transition: `background-color ${duration.inspectorState} ${easing.standard}`,
  selectors: { "&:focus-within": { background: "#FFFFFF" } },
  "@container": {
    "(max-width: 610px)": {
      padding: "19px 22px 21px",
    },
  },
});

export const composerIntro = style([composerSection, { rowGap: 0 }]);

export const sectionBody = style({
  gridColumn: "1",
  display: "grid",
  gap: 14,
  minInlineSize: 0,
});

export const sectionHeading = style({
  gridColumn: "1",
  display: "flex",
  alignItems: "center",
  gap: 8,
  minBlockSize: 20,
  minInlineSize: 0,
});
globalStyle(`${sectionHeading} h3`, { margin: 0, color: "#2C2C2B", fontSize: 12, lineHeight: "16px", fontWeight: 740, letterSpacing: 0 });
export const sectionIcon = style({
  inlineSize: 28,
  blockSize: 28,
  display: "grid",
  placeItems: "center",
  flex: "0 0 28px",
  border: "1px solid #D9DBDE",
  borderRadius: 8,
  background: "#F7F8FA",
  color: "#383836",
});
globalStyle(`${sectionIcon} > svg`, { display: "block" });
export const titleFieldWrap = style({
  display: "grid",
  gap: 7,
  minInlineSize: 0,
});
globalStyle(`${titleFieldWrap} > span`, { color: "#70706D", fontSize: 11, lineHeight: "14px", fontWeight: 650 });
export const titleField = style({
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "4px 0 8px",
  border: "0 !important",
  borderRadius: "0 !important",
  outline: 0,
  background: "transparent",
  backgroundImage: "none !important",
  boxShadow: "none !important",
  color: "#111111",
  fontSize: "clamp(22px, 3vw, 30px)",
  lineHeight: 1.14,
  fontWeight: 700,
  letterSpacing: "-.035em",
  transition: `border-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&::placeholder": { color: "#A8A8A4" },
    "&:focus": { boxShadow: "none" },
  },
});
globalStyle(`${titleField}:focus, ${titleField}:focus-visible`, { outline: "none !important", boxShadow: "none !important" });

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  alignItems: "start",
  gap: "16px 14px",
  overflow: "visible",
  "@media": { "(max-width: 620px)": { gridTemplateColumns: "1fr" } },
} as const;

export const scheduleBar = style({
  ...formGrid,
});
globalStyle(`${scheduleBar} > *`, { gridColumn: "span 2", "@media": { "(max-width: 620px)": { gridColumn: "1 / -1" } } });
globalStyle(`${scheduleBar} > div:last-child > [role=dialog]`, { insetInlineStart: "auto", insetInlineEnd: 0, transformOrigin: "top right" });

export const detailsPanel = style({
  ...formGrid,
});
globalStyle(`${detailsPanel} > *`, { gridColumn: "span 3", "@media": { "(max-width: 620px)": { gridColumn: "1 / -1" } } });
globalStyle(`${detailsPanel} [data-task-combobox-popover]`, {
  insetBlockStart: "auto",
  insetBlockEnd: "calc(100% + 7px)",
  transformOrigin: "bottom left",
});

export const detailField = style({
  display: "grid",
  alignContent: "start",
  gap: 8,
  minInlineSize: 0,
  color: "#70706D",
  fontSize: 11,
  lineHeight: "14px",
  fontWeight: 650,
});
export const detailFieldWide = style([detailField, { gridColumn: "1 / -1" }]);
globalStyle(`${detailsPanel} > ${detailFieldWide}`, { gridColumn: "1 / -1" });
export const fieldLabel = style({ color: "#70706D", fontSize: 11, lineHeight: "14px", fontWeight: 650 });
export const choiceField = style({
  display: "grid",
  gridTemplateRows: "14px 52px",
  alignContent: "start",
  gap: 8,
  minInlineSize: 0,
  margin: 0,
  padding: 0,
  border: 0,
});
globalStyle(`${choiceField} > ${fieldLabel}`, { display: "block", inlineSize: "100%", margin: 0, padding: 0 });
export const choiceGrid = style({
  display: "grid",
  gap: 3,
  blockSize: 52,
  boxSizing: "border-box",
  padding: 3,
  border: "1px solid #D2D4D7",
  borderRadius: 11,
  background: "#F5F6F8",
  boxShadow: "inset 0 1px 2px rgb(0 0 0 / .045)",
  selectors: {
    '&[data-columns="3"]': { gridTemplateColumns: "repeat(3,minmax(0,1fr))" },
    '&[data-columns="4"]': { gridTemplateColumns: "repeat(4,minmax(0,1fr))" },
  },
});
export const choiceButton = style({
  minInlineSize: 0,
  minBlockSize: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: 4,
  border: "1px solid transparent",
  borderRadius: 8,
  background: "transparent",
  color: "#696969",
  fontSize: 11,
  lineHeight: "14px",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#FFFFFF", color: "#222222" },
    "&:active": { transform: "scale(.97)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 1 },
    "&[aria-pressed=true]": { borderColor: "#111111", background: "#111111", color: "#FFFFFF", boxShadow: "0 2px 6px rgb(0 0 0 / .16)" },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});
globalStyle(`${choiceButton} > strong`, { minInlineSize: 0, fontSize: "inherit", fontWeight: 700, whiteSpace: "nowrap" });
globalStyle(`${detailsPanel} input, ${detailsPanel} select, ${detailsPanel} textarea, ${composerSection} textarea, ${composerIntro} textarea`, {
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  minBlockSize: 52,
  padding: "11px 12px",
  border: "1px solid #D2D4D7",
  borderRadius: 11,
  outline: 0,
  background: "#FCFCFD",
  color: "#222222",
  fontSize: 13,
  lineHeight: "19px",
  fontWeight: 500,
  letterSpacing: 0,
  textTransform: "none",
  transition: `border-color ${duration.state} ${easing.standard}, background-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
});
globalStyle(`${composerSection} textarea, ${composerIntro} textarea`, { minBlockSize: 144, resize: "vertical", lineHeight: 1.58 });
globalStyle(`${detailsPanel} input:focus, ${detailsPanel} select:focus, ${detailsPanel} textarea:focus, ${composerSection} textarea:focus, ${composerIntro} textarea:focus`, { borderColor: "#111111", background: "#FFFFFF", boxShadow: "0 0 0 3px rgb(17 17 17 / .07)" });

export const composerFooter = style({
  position: "sticky",
  insetBlockEnd: 0,
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "17px 28px 18px",
  borderBlockStart: "1px solid #E1E3E6",
  background: "#FCFCFD",
  boxShadow: "0 -12px 30px rgb(0 0 0 / .045)",
});
export const footerSpacer = style({ flex: 1 });

const footerButton = {
  minBlockSize: 40,
  paddingInline: 15,
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 760,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:active:not(:disabled)": { transform: "scale(.97)" },
    "&:disabled": { opacity: .42, cursor: "not-allowed" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
} as const;

export const cancelButton = style({
  ...footerButton,
  border: "1px solid #C9C9C6",
  background: "#FFFFFF",
  color: "#444444",
  selectors: { ...footerButton.selectors, "&:hover:not(:disabled)": { background: "#F2F2F2" } },
});
export const saveButton = style({
  ...footerButton,
  border: "1px solid #111111",
  background: "#111111",
  color: "#FFFFFF",
  minInlineSize: 116,
  selectors: { ...footerButton.selectors, "&:hover:not(:disabled)": { background: "#2A2A2A" } },
});
export const deleteButton = style({
  ...footerButton,
  border: "1px solid transparent",
  background: "transparent",
  color: "#727272",
  selectors: { ...footerButton.selectors, "&:hover:not(:disabled)": { borderColor: "#C9C9C6", background: "#F2F2F0", color: "#111111" } },
});

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
