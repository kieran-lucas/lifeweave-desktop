import { globalStyle, style } from "@vanilla-extract/css";
import { duration, easing } from "../../../design-system/visual/motion.css";

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
  padding: "8px 14px 7px 0",
  color: "#929292",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
});
globalStyle(`${timeRail} > strong, ${timeRail} > span`, {
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
  gridTemplateColumns: "minmax(0, 1fr) auto 20px",
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
    "&:hover": { background: "#F6F6F4" },
    "&:active": { transform: "scale(.994)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: -2 },
  },
  "@media": {
    "(max-width: 680px)": { gridTemplateColumns: "minmax(0,1fr) auto 18px" },
  },
});

export const taskCopy = style({ display: "grid", alignContent: "start", gap: 3, minInlineSize: 0 });
globalStyle(`${taskCopy} > strong`, {
  color: "#202020",
  fontSize: 13,
  lineHeight: "17px",
  fontWeight: 670,
  letterSpacing: "-.012em",
  overflowWrap: "anywhere",
  whiteSpace: "normal",
});

export const taskDescription = style({
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


export const assessmentSlot = style({
  justifySelf: "end",
  alignSelf: "center",
});

globalStyle(`${agendaItem}[data-completed=true] ${taskCopy} > strong`, {
  textDecoration: "line-through",
  textDecorationThickness: "1.5px",
});

/* Progressive task composer ------------------------------------------------ */
export const composer = style({
  display: "grid",
  gap: 18,
  minInlineSize: 0,
  color: "#111111",
});

export const composerHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
});
globalStyle(`${composerHeader} > div`, { display: "grid", gap: 2 });
globalStyle(`${composerHeader} > div > span`, { color: "#929292", fontSize: 9, lineHeight: "12px", fontWeight: 760, letterSpacing: ".1em", textTransform: "uppercase" });
globalStyle(`${composerHeader} h2`, { margin: 0, color: "#222222", fontSize: 15, lineHeight: "20px", fontWeight: 700, letterSpacing: "-.015em" });

export const closeButton = style({
  inlineSize: 30,
  blockSize: 30,
  padding: 0,
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: "#777777",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
  selectors: { "&:hover": { background: "#F1F1F1", color: "#111111" }, "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 } },
});

export const composerError = style({
  margin: 0,
  padding: "8px 10px",
  border: "1px solid #C8C8C8",
  borderRadius: 8,
  background: "#F6F6F6",
  color: "#333333",
  fontSize: 11,
});

export const titleField = style({
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "8px 0 12px",
  border: 0,
  borderBottom: "1px solid #D8D8D8",
  outline: 0,
  background: "transparent",
  color: "#111111",
  fontSize: "clamp(22px, 3vw, 30px)",
  lineHeight: 1.18,
  fontWeight: 620,
  letterSpacing: "-.035em",
  selectors: {
    "&::placeholder": { color: "#B0B0B0" },
    "&:focus": { borderBottomColor: "#111111", boxShadow: "none" },
  },
});
globalStyle(`${titleField}:focus, ${titleField}:focus-visible`, { outline: "none !important", boxShadow: "none !important" });

export const scheduleBar = style({
  display: "grid",
  gridTemplateColumns: "1.3fr .9fr .9fr",
  alignItems: "stretch",
  gap: 1,
  overflow: "visible",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
  background: "var(--border-subtle)",
  "@media": { "(max-width: 520px)": { gridTemplateColumns: "1fr" } },
});
export const scheduleDateField = style({
  position: "relative",
  display: "grid",
  gridTemplateRows: "12px 40px",
  alignContent: "start",
  gap: 5,
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "10px 11px 11px",
  borderStartStartRadius: "var(--radius-surface)",
  borderEndStartRadius: "var(--radius-surface)",
  background: "var(--surface-raised)",
});
globalStyle(`${scheduleDateField} > span`, { color: "var(--text-tertiary)", fontSize: 9, lineHeight: "12px", fontWeight: 760, letterSpacing: ".09em", textTransform: "uppercase" });
globalStyle(`${scheduleDateField} > input`, { minInlineSize: 0, blockSize: 40, boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", outline: 0, background: "var(--surface-subtle)", color: "var(--text-primary)", colorScheme: "light", fontSize: 13, lineHeight: "20px", fontWeight: 720, fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1, "lnum" 1', cursor: "pointer", transition: "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease" });
globalStyle(`${scheduleDateField} > input:hover`, { background: "var(--accent-soft)", borderColor: "var(--accent)" });
globalStyle(`${scheduleDateField} > input:active`, { transform: "scale(.985)" });
globalStyle(`${scheduleDateField} > input:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 2, borderColor: "var(--accent)" });
globalStyle(`${scheduleDateField} > input::-webkit-calendar-picker-indicator`, { inlineSize: 16, blockSize: 16, cursor: "pointer" });
globalStyle(`${scheduleBar} > div:last-child`, { borderStartEndRadius: "var(--radius-surface)", borderEndEndRadius: "var(--radius-surface)" });
globalStyle(`${scheduleBar} > div:last-child > [role=dialog]`, { insetInlineStart: "auto", insetInlineEnd: 0, transformOrigin: "top right" });

export const detailsPanel = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 12,
  paddingBlock: "16px 2px",
  borderBlockStart: "1px solid #E4E4E4",
  "@media": { "(max-width: 620px)": { gridTemplateColumns: "1fr" } },
});

export const detailField = style({
  display: "grid",
  alignContent: "start",
  gap: 7,
  minInlineSize: 0,
  color: "#777777",
  fontSize: 11,
  lineHeight: "15px",
  fontWeight: 710,
  letterSpacing: ".035em",
});
export const detailFieldWide = style([detailField, { gridColumn: "1 / -1" }]);
export const fieldLabel = style({ color: "#777777", fontSize: 11, lineHeight: "15px", fontWeight: 710 });
globalStyle(`${detailsPanel} input, ${detailsPanel} select, ${detailsPanel} textarea`, {
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  minBlockSize: 40,
  padding: "9px 10px",
  border: "1px solid #D6D6D6",
  borderRadius: 9,
  outline: 0,
  background: "#FAFAFA",
  color: "#222222",
  fontSize: 13,
  lineHeight: "19px",
  fontWeight: 500,
  letterSpacing: 0,
});
globalStyle(`${detailsPanel} textarea`, { minBlockSize: 132, resize: "vertical", lineHeight: 1.55 });
globalStyle(`${detailsPanel} input:focus, ${detailsPanel} select:focus, ${detailsPanel} textarea:focus`, { borderColor: "#111111", background: "#FFFFFF" });

export const composerFooter = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  paddingBlockStart: 14,
  borderBlockStart: "1px solid #E4E4E4",
});
export const footerSpacer = style({ flex: 1 });

const footerButton = {
  minBlockSize: 36,
  paddingInline: 12,
  borderRadius: 9,
  fontSize: 11,
  fontWeight: 700,
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
  border: "1px solid #D4D4D4",
  background: "#FFFFFF",
  color: "#444444",
  selectors: { ...footerButton.selectors, "&:hover:not(:disabled)": { background: "#F2F2F2" } },
});
export const saveButton = style({
  ...footerButton,
  border: "1px solid #111111",
  background: "#111111",
  color: "#FFFFFF",
  selectors: { ...footerButton.selectors, "&:hover:not(:disabled)": { background: "#2A2A2A" } },
});
export const deleteButton = style({
  ...footerButton,
  border: 0,
  background: "transparent",
  color: "#8A8A8A",
  selectors: { ...footerButton.selectors, "&:hover:not(:disabled)": { background: "#F2F2F2", color: "#222222" } },
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
