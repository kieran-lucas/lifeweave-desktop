import { globalStyle, style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { vars } from "../../design-system/visual/contract.css";

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

export const quickCreate = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  alignItems: "center",
  gap: 8,
  padding: 0,
  "@media": {
    "(max-width: 620px)": { gridTemplateColumns: "1fr auto" },
  },
});
globalStyle(`${quickCreate} > input`, {
  minBlockSize: 36,
  minInlineSize: 0,
  paddingInline: 10,
  border: "1px solid #D5D5D5",
  borderRadius: 8,
  outline: 0,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 14,
  fontWeight: 600,
  "@media": {
    "(max-width: 620px)": { gridColumn: "1 / -1" },
  },
});
globalStyle(`${quickCreate} > input::placeholder`, { color: "#999999" });

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

export const titleInput = style({
  inlineSize: "100%",
  minInlineSize: 0,
  padding: 0,
  border: 0,
  borderBottom: "1px solid #BEBEBE",
  outline: 0,
  background: "transparent",
  color: "#111111",
  fontSize: "clamp(26px, 3vw, 36px)",
  lineHeight: 1.08,
  fontWeight: 700,
  letterSpacing: "-.045em",
  selectors: { "&:focus": { borderBottomColor: "#111111" } },
});

export const planContent = style({
  minBlockSize: 0,
  display: "grid",
});

export const factRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px 20px",
  marginBlockStart: 18,
  paddingBlock: "16px 12px",
  borderBlockStart: `1px solid ${vars.color.borderHairline}`,
  selectors: {
    "&[data-editing]": { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  },
  "@media": { "(max-width: 560px)": { selectors: { "&[data-editing]": { gridTemplateColumns: "1fr" } } } },
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

export const factTreeEditor = style({ minInlineSize: 0 });
globalStyle(`${factTreeEditor} > div > label`, {
  color: "#858585",
  fontSize: 9,
  fontWeight: 760,
  letterSpacing: ".08em",
  textTransform: "uppercase",
});

export const factEditor = style({
  display: "grid",
  gap: 6,
  padding: 0,
  color: "#858585",
  fontSize: 9,
  fontWeight: 760,
  letterSpacing: ".08em",
  textTransform: "uppercase",
});
globalStyle(`${factEditor} > input, ${factEditor} > select`, {
  minInlineSize: 0,
  minBlockSize: 34,
  padding: "7px 8px",
  border: "1px solid #D3D3D3",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#222222",
  fontSize: 11,
  textTransform: "none",
  letterSpacing: 0,
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

export { srOnly } from "../../design-system/primitives/utilities.css";
