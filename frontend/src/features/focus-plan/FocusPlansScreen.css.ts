import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { vars } from "../../design-system/visual/contract.css";

const editInstrumentEnter = keyframes({
  from: { opacity: .82, transform: "translateY(7px) scale(.992)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const library = style({
  display: "grid",
  gap: 12,
  minInlineSize: 0,
});

export const libraryHeader = style({
  minBlockSize: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
});

export const libraryTitle = style({
  margin: 0,
  color: "#111111",
  fontSize: "clamp(28px, 3vw, 34px)",
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "-.035em",
});

export const primaryAction = style({
  minBlockSize: 36,
  paddingInline: 14,
  border: "1px solid #111111",
  borderRadius: 8,
  background: "#111111",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 720,
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": { background: "#292929" },
    "&:disabled": { opacity: .42, cursor: "not-allowed" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 3 },
  },
});

export const secondaryAction = style({
  minBlockSize: 36,
  paddingInline: 13,
  border: "1px solid #D3D3D3",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#222222",
  fontSize: 12,
  fontWeight: 680,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "#F3F3F3", borderColor: "#BEBEBE" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
});

export const error = style({
  margin: 0,
  padding: "10px 12px",
  border: "1px solid #BEBEBE",
  borderRadius: 10,
  background: "#F7F7F7",
  color: "#222222",
  fontSize: 12,
});

export const portfolioNav = style({
  display: "flex",
  alignItems: "center",
  gap: 14,
  minInlineSize: 0,
  overflowX: "auto",
  borderBottom: "1px solid #E0E0E0",
});
globalStyle(`${portfolioNav} > button`, {
  position: "relative",
  minBlockSize: 38,
  padding: "0 1px",
  border: 0,
  background: "transparent",
  color: "#858585",
  fontSize: 12,
  fontWeight: 680,
  cursor: "pointer",
});
globalStyle(`${portfolioNav} > button:hover`, { color: "#111111" });
globalStyle(`${portfolioNav} > button[aria-current="page"]`, { color: "#111111" });
globalStyle(`${portfolioNav} > button[aria-current="page"]::after`, {
  content: '""',
  position: "absolute",
  insetInline: 0,
  insetBlockEnd: -1,
  blockSize: 2,
  background: "#111111",
});
globalStyle(`${portfolioNav} > button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });

export const planCollection = style({
  display: "grid",
  minInlineSize: 0,
  borderBlockStart: "1px solid #E4E4E4",
});

export const planRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 42px",
  alignItems: "center",
  gap: 8,
  minBlockSize: 56,
  padding: "4px 2px 4px 0",
  borderBlockEnd: "1px solid #E4E4E4",
  background: "transparent",
  color: "#111111",
  transition: `background-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F7F7F7" },
  },
});

export const planOpen = style({
  alignSelf: "stretch",
  display: "grid",
  alignItems: "center",
  minInlineSize: 0,
  padding: "8px 8px 8px 6px",
  border: 0,
  background: "transparent",
  color: "#111111",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: -2, borderRadius: 8 },
  },
});

export const scoreButton = style({
  inlineSize: 36,
  blockSize: 36,
  display: "inline-grid",
  placeItems: "center",
  justifySelf: "end",
  padding: 0,
  border: "1px solid #C8C8C8",
  borderRadius: "50%",
  background: "#FFFFFF",
  color: "#555555",
  fontSize: 12,
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
  cursor: "pointer",
  transition: `border-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { borderColor: "#111111" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
    '&[data-score-band="low"]': { borderColor: "#E15759", color: "#A33133" },
    '&[data-score-band="developing"]': { borderColor: "#F28E2B", color: "#9A510B" },
    '&[data-score-band="strong"]': { borderColor: "#4E79A7", color: "#385F87" },
    '&[data-score-band="excellent"]': { borderColor: "#59A14F", color: "#397832" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
    "(forced-colors: active)": { borderColor: "ButtonText", background: "Canvas", color: "ButtonText" },
  },
});

export const planCopy = style({ display: "grid", gap: 3, minInlineSize: 0 });
export const planTitleLine = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minInlineSize: 0,
});
globalStyle(`${planTitleLine} > strong`, {
  minInlineSize: 0,
  overflow: "hidden",
  color: "#171717",
  fontSize: 15,
  lineHeight: "20px",
  fontWeight: 680,
  letterSpacing: "-.015em",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
globalStyle(`${planTitleLine} > strong[data-completed]`, {
  textDecoration: "line-through",
  textDecorationThickness: "1.5px",
});
export const activeBadge = style({
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  minBlockSize: 22,
  paddingInline: 8,
  border: `1px solid color-mix(in srgb, ${vars.assessmentCircle.done} 36%, transparent)`,
  borderRadius: vars.radius.full,
  background: `color-mix(in srgb, ${vars.assessmentCircle.done} 10%, ${vars.color.surfaceRaised})`,
  color: vars.assessmentCircle.done,
  fontSize: 9.5,
  lineHeight: "14px",
  fontWeight: 760,
  letterSpacing: ".035em",
  textTransform: "uppercase",
  selectors: {
    "&::before": {
      content: '""',
      inlineSize: 6,
      blockSize: 6,
      borderRadius: "50%",
      background: vars.assessmentCircle.done,
      boxShadow: `0 0 0 3px color-mix(in srgb, ${vars.assessmentCircle.done} 13%, transparent)`,
    },
  },
  "@media": {
    "(forced-colors: active)": {
      borderColor: "ButtonText",
      background: "Canvas",
      color: "ButtonText",
      selectors: { "&::before": { background: "ButtonText", boxShadow: "none" } },
    },
  },
});
globalStyle(`${planCopy} > small`, {
  overflow: "hidden",
  color: "#777777",
  fontSize: 11,
  lineHeight: "15px",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const document = style({
  inlineSize: "100%",
  display: "grid",
  gap: 0,
  minInlineSize: 0,
  color: "#111111",
});

export const documentHeader = style({
  minBlockSize: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});

export const backButton = style({
  minBlockSize: 34,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 4px",
  border: 0,
  borderRadius: 6,
  background: "transparent",
  color: "#666666",
  fontSize: 12,
  fontWeight: 650,
  cursor: "pointer",
  selectors: {
    "&:hover": { color: "#111111", background: "#F4F4F4" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
});

export const documentActions = style({ display: "flex", alignItems: "center", gap: 7 });

export const hero = style({
  display: "grid",
  gap: "clamp(12px, 2vw, 18px)",
  paddingBlock: "10px 14px",
});

export const heroIdentity = style({
  display: "grid",
  gap: 5,
  minInlineSize: 0,
});

export const lifecycle = style({
  justifySelf: "start",
  color: "#666666",
  fontSize: 10,
  lineHeight: "12px",
  fontWeight: 760,
  letterSpacing: ".09em",
  textTransform: "uppercase",
  selectors: {
    '&[data-lifecycle="active"]': {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 9px",
      border: `1px solid color-mix(in srgb, ${vars.assessmentCircle.done} 34%, transparent)`,
      borderRadius: vars.radius.full,
      background: `color-mix(in srgb, ${vars.assessmentCircle.done} 9%, ${vars.color.surfaceRaised})`,
      color: vars.assessmentCircle.done,
    },
    '&[data-lifecycle="active"]::before': {
      content: '""',
      inlineSize: 6,
      blockSize: 6,
      borderRadius: "50%",
      background: vars.assessmentCircle.done,
    },
  },
});

export const documentTitle = style({
  maxInlineSize: "28ch",
  margin: 0,
  color: "#111111",
  fontSize: "clamp(26px, 3vw, 36px)",
  lineHeight: 1.08,
  fontWeight: 700,
  letterSpacing: "-.045em",
  overflowWrap: "anywhere",
  selectors: {
    "&[data-completed]": { textDecoration: "line-through", textDecorationThickness: "1.5px" },
  },
});

export const planContent = style({
  minBlockSize: 0,
  display: "grid",
  gap: 8,
});

export const factRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px 20px",
  marginBlockStart: 18,
  paddingBlock: "16px 12px",
  borderBlockStart: `1px solid ${vars.color.borderHairline}`,
});
globalStyle(`${factRow} > div`, { display: "flex", alignItems: "baseline", gap: 7 });
globalStyle(`${factRow} > div > span`, { color: "#777777", fontSize: 10, fontWeight: 760, letterSpacing: ".08em", textTransform: "uppercase" });
globalStyle(`${factRow} > div > strong`, { color: "#222222", fontSize: 13, lineHeight: "19px", fontWeight: 680 });

export const dateFact = style({
  display: "grid !important",
  alignItems: "start !important",
  gap: "4px !important",
  minInlineSize: 118,
  paddingInlineEnd: 6,
  fontVariantNumeric: "tabular-nums",
});

export const archiveAction = style({
  minBlockSize: 34,
  paddingInline: 9,
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: "#8A8A8A",
  fontSize: 11,
  fontWeight: 650,
  cursor: "pointer",
  selectors: { "&:hover": { background: "#F2F2F2", color: "#222222" }, "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 } },
});

export const planEditorFrame = style({ minBlockSize: "100%" });

export const planEditor = style({
  inlineSize: "min(100%, 900px)",
  minBlockSize: "100%",
  minInlineSize: 0,
  marginInline: "auto",
  display: "grid",
  gridTemplateRows: "auto auto auto",
  overflow: "visible",
  border: "1px solid #BDBDB9",
  borderRadius: 17,
  background: "#FFFFFF",
  boxShadow: "0 3px 10px rgb(0 0 0 / .10), 0 26px 70px rgb(0 0 0 / .12)",
  animation: `${editInstrumentEnter} ${duration.route} ${easing.standard} both`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
    "(max-width: 620px)": { borderRadius: 13 },
  },
});

export const planEditorHeader = style({
  position: "relative",
  zIndex: 8,
  minBlockSize: 88,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  padding: "18px 28px",
  borderRadius: "16px 16px 0 0",
  background: "#111111",
  color: "#FFFFFF",
});
globalStyle(`${planEditorHeader} > h1`, { margin: 0, color: "#FFFFFF", fontSize: 26, lineHeight: "32px", fontWeight: 720, letterSpacing: "-.035em" });
globalStyle(`${planEditorHeader} > button`, {
  position: "relative",
  inlineSize: 42,
  minInlineSize: 42,
  blockSize: 42,
  padding: 0,
  border: "1px solid #3A3A3A",
  borderRadius: 11,
  background: "#1D1D1D",
  color: "#FFFFFF",
  cursor: "pointer",
});
globalStyle(`${planEditorHeader} > button > span::before, ${planEditorHeader} > button > span::after`, {
  content: "",
  position: "absolute",
  insetInlineStart: 14,
  insetBlockStart: 20,
  inlineSize: 14,
  blockSize: 1.5,
  background: "currentColor",
});
globalStyle(`${planEditorHeader} > button > span::before`, { transform: "rotate(45deg)" });
globalStyle(`${planEditorHeader} > button > span::after`, { transform: "rotate(-45deg)" });
globalStyle(`${planEditorHeader} > button:hover`, { borderColor: "#5A5A5A", background: "#292929" });
globalStyle(`${planEditorHeader} > button:focus-visible`, { outline: "2px solid #FFFFFF", outlineOffset: 3 });

export const planEditorScroll = style({
  minBlockSize: 0,
  overflow: "visible",
  background: "#FFFFFF",
});
globalStyle(`${planEditorScroll} [data-task-combobox-popover]`, {
  insetBlockStart: "auto",
  insetBlockEnd: "calc(100% + 7px)",
  transformOrigin: "bottom left",
});

export const planEditorSection = style({
  display: "grid",
  gap: 14,
  padding: "21px 28px 23px",
  borderBlockEnd: "1px solid #DEDEDA",
});

export const planEditorIntro = style({
  padding: "27px 28px 25px",
  borderBlockEnd: "1px solid #DEDEDA",
});

export const planEditorSectionHeading = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minInlineSize: 0,
});
globalStyle(`${planEditorSectionHeading} > h2`, { margin: 0, color: "#181818", fontSize: 12, lineHeight: "17px", fontWeight: 760 });
globalStyle(`${planEditorSectionHeading} > span`, {
  inlineSize: 28,
  blockSize: 28,
  flex: "0 0 28px",
  display: "grid",
  placeItems: "center",
  border: "1px solid #D8D8D4",
  borderRadius: 8,
  background: "#F6F6F3",
  color: "#383836",
});
globalStyle(`${planEditorSectionHeading} > span > svg`, { display: "block" });

export const planEditorBody = style({ display: "grid", gap: 16, minInlineSize: 0 });
export const planTitleField = style({ display: "grid", gap: 7, minInlineSize: 0, color: "#70706D", fontSize: 11, lineHeight: "14px", fontWeight: 650 });
globalStyle(`${planTitleField} > input`, {
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "4px 0 8px",
  border: "0 !important",
  borderRadius: "0 !important",
  borderBlockEnd: "1px solid #C8C8C4",
  outline: 0,
  background: "transparent",
  boxShadow: "none !important",
  color: "#111111",
  fontSize: "clamp(22px, 3vw, 30px)",
  lineHeight: 1.14,
  fontWeight: 700,
  letterSpacing: "-.035em",
});
globalStyle(`${planTitleField} > input:focus, ${planTitleField} > input:focus-visible`, { borderBlockEndColor: "#111111 !important", outline: "none !important", boxShadow: "none !important" });

export const planOutcomeField = style({ display: "grid", gap: 8, minInlineSize: 0, color: "#70706D", fontSize: 11, lineHeight: "14px", fontWeight: 650 });

export const planEditorGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  alignItems: "start",
  gap: "16px 14px",
  minInlineSize: 0,
  overflow: "visible",
  "@media": { "(max-width: 620px)": { gridTemplateColumns: "1fr" } },
});

export const planStatusField = style({ display: "grid", gridTemplateRows: "14px 52px", alignContent: "start", gap: 8, minInlineSize: 0, color: "#70706D", fontSize: 11, lineHeight: "14px", fontWeight: 650 });
globalStyle(`${planStatusField} > span`, { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 });
globalStyle(`${planStatusField} > span > small`, { color: "#92928E", fontSize: 9, lineHeight: "12px", fontWeight: 620 });
export const planStatusControl = style({
  inlineSize: "100%",
  minInlineSize: 0,
  blockSize: 52,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  boxSizing: "border-box",
  padding: 3,
  gap: 2,
  border: "1px solid #CBCBC8",
  borderRadius: 11,
  background: "#FAFAF8",
});
globalStyle(`${planStatusControl} > label`, { position: "relative", minInlineSize: 0, display: "grid", cursor: "pointer" });
globalStyle(`${planStatusControl} input`, { position: "absolute", inlineSize: 1, blockSize: 1, margin: 0, opacity: 0, pointerEvents: "none" });
globalStyle(`${planStatusControl} label > span`, {
  minInlineSize: 0,
  display: "grid",
  placeItems: "center",
  paddingInline: 4,
  overflow: "hidden",
  border: "1px solid transparent",
  borderRadius: 8,
  color: "#6A6A67",
  fontSize: 10,
  lineHeight: "16px",
  fontWeight: 690,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
});
globalStyle(`${planStatusControl} label:hover > span`, { background: "#ECECE8", color: "#222222" });
globalStyle(`${planStatusControl} input:checked + span`, { background: "#111111", color: "#FFFFFF", boxShadow: "0 2px 6px rgb(0 0 0 / .16)" });
globalStyle(`${planStatusControl} input:focus-visible + span`, { outline: "2px solid #111111", outlineOffset: 2 });
globalStyle(`${planStatusControl} input:disabled + span`, { cursor: "not-allowed", opacity: .56 });

export const planEditorFooter = style({
  position: "relative",
  zIndex: 8,
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
  padding: "17px 28px 18px",
  borderBlockStart: "1px solid #DEDEDA",
  borderRadius: "0 0 16px 16px",
  background: "#FFFFFF",
});

export { srOnly } from "../../design-system/primitives/utilities.css";
