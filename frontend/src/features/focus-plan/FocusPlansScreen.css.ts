import { globalStyle, style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";

const focusOutline = {
  selectors: {
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
} as const;

export const library = style({
  display: "grid",
  gap: 24,
  minInlineSize: 0,
});

export const libraryHeader = style({
  minBlockSize: 76,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 20,
  paddingInline: 3,
});

export const libraryTitle = style({
  margin: 0,
  color: "#111111",
  fontSize: "clamp(34px, 4vw, 50px)",
  lineHeight: .98,
  fontWeight: 720,
  letterSpacing: "-.055em",
});

export const primaryAction = style({
  minBlockSize: 36,
  paddingInline: 14,
  border: "1px solid #111111",
  borderRadius: 10,
  background: "#111111",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 720,
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,.12)",
  transition: `transform ${duration.press} ${easing.standard}, background-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": { background: "#292929", transform: "translateY(-1px)", boxShadow: "0 6px 16px rgba(0,0,0,.14)" },
    "&:active:not(:disabled)": { transform: "translateY(1px) scale(.99)", boxShadow: "none" },
    "&:disabled": { opacity: .42, cursor: "not-allowed" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 3 },
  },
});

export const secondaryAction = style({
  minBlockSize: 36,
  paddingInline: 13,
  border: "1px solid #D3D3D3",
  borderRadius: 10,
  background: "#FFFFFF",
  color: "#222222",
  fontSize: 12,
  fontWeight: 680,
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F3F3F3", borderColor: "#BEBEBE", transform: "translateY(-1px)", boxShadow: "0 5px 14px rgba(0,0,0,.08)" },
    "&:active": { transform: "translateY(1px) scale(.99)", boxShadow: "none" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
});

export const quickCreate = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  alignItems: "center",
  gap: 8,
  padding: 8,
  border: "1px solid #D5D5D5",
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "0 10px 30px rgba(0,0,0,.05)",
  "@media": {
    "(max-width: 620px)": { gridTemplateColumns: "1fr auto" },
  },
});
globalStyle(`${quickCreate} > input`, {
  minBlockSize: 40,
  minInlineSize: 0,
  paddingInline: 10,
  border: 0,
  outline: 0,
  background: "transparent",
  color: "#111111",
  fontSize: 15,
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
  gap: 18,
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
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "center",
  gap: 14,
  minBlockSize: 68,
  padding: "11px 8px",
  border: 0,
  borderBlockEnd: "1px solid #E4E4E4",
  background: "transparent",
  color: "#111111",
  textAlign: "left",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, padding-inline ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F7F7F7", paddingInline: 12, transform: "translateX(2px)" },
    "&:active": { transform: "translateX(2px) scale(.997)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: -2 },
  },
});

export const planCopy = style({ display: "grid", gap: 3, minInlineSize: 0 });
globalStyle(`${planCopy} > strong`, {
  overflow: "hidden",
  color: "#171717",
  fontSize: 15,
  lineHeight: "20px",
  fontWeight: 680,
  letterSpacing: "-.015em",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
  minBlockSize: 54,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  borderBottom: "1px solid #E3E3E3",
});

export const backButton = style({
  minBlockSize: 34,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "0 7px 0 4px",
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: "#666666",
  fontSize: 12,
  fontWeight: 680,
  cursor: "pointer",
  selectors: {
    "&:hover": { color: "#111111", background: "#F4F4F4" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
});

export const documentActions = style({ display: "flex", alignItems: "center", gap: 7 });

export const hero = style({
  display: "grid",
  gap: "clamp(22px, 4vw, 36px)",
  paddingBlock: "clamp(20px, 3vw, 32px) 28px",
  borderBottom: "1px solid #E3E3E3",
});

export const heroIdentity = style({
  display: "grid",
  gap: 9,
  minInlineSize: 0,
});

export const lifecycle = style({
  justifySelf: "start",
  padding: "4px 8px",
  border: "1px solid #D5D5D5",
  borderRadius: 999,
  color: "#666666",
  fontSize: 9,
  lineHeight: "12px",
  fontWeight: 760,
  letterSpacing: ".09em",
  textTransform: "uppercase",
});

export const documentTitle = style({
  maxInlineSize: "28ch",
  margin: 0,
  color: "#111111",
  fontSize: "clamp(27px, 3.4vw, 40px)",
  lineHeight: 1.04,
  fontWeight: 700,
  letterSpacing: "-.045em",
  overflowWrap: "anywhere",
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
  fontSize: "clamp(27px, 3.4vw, 40px)",
  lineHeight: 1.08,
  fontWeight: 700,
  letterSpacing: "-.045em",
  selectors: { "&:focus": { borderBottomColor: "#111111" } },
});

export const planContent = style({
  minBlockSize: 0,
  display: "grid",
  paddingInlineStart: "clamp(14px, 2vw, 20px)",
  borderInlineStart: "2px solid #D8D8D8",
});

export const factRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 0,
  borderBottom: "1px solid #E3E3E3",
  "@media": { "(max-width: 680px)": { gridTemplateColumns: "1fr" } },
});
globalStyle(`${factRow} > div`, { display: "grid", gap: 5, padding: "18px 16px 18px 0" });
globalStyle(`${factRow} > div:not(:first-child)`, { paddingInlineStart: 16, borderInlineStart: "1px solid #E3E3E3" });
globalStyle(`${factRow} > div > span`, { color: "#8A8A8A", fontSize: 9, fontWeight: 760, letterSpacing: ".09em", textTransform: "uppercase" });
globalStyle(`${factRow} > div > strong`, { color: "#333333", fontSize: 12, fontWeight: 650 });

export const factEditor = style({
  display: "grid",
  gap: 6,
  padding: "14px 12px",
  borderInlineStart: "1px solid #E3E3E3",
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

export const criteriaSection = style({ paddingBlock: "26px 30px", borderBottom: "1px solid #E3E3E3" });
export const linkedSection = style({ paddingBlock: "26px 30px", borderBottom: "1px solid #E3E3E3" });

export const sectionHeading = style({
  display: "block",
  marginBlockEnd: 14,
});
globalStyle(`${sectionHeading} > h2`, { margin: 0, color: "#222222", fontSize: 14, lineHeight: "20px", fontWeight: 720, letterSpacing: "-.012em" });

export const criteriaList = style({ listStyle: "none", display: "grid", gap: 0, margin: 0, padding: 0 });
globalStyle(`${criteriaList} > li`, { display: "grid", gridTemplateColumns: "36px minmax(0,1fr)", gap: 10, paddingBlock: 12, borderBottom: "1px solid #ECECEC" });
globalStyle(`${criteriaList} > li > span`, { color: "#A3A3A3", fontSize: 9, lineHeight: "19px", fontWeight: 720 });
globalStyle(`${criteriaList} > li > p`, { margin: 0, color: "#333333", fontSize: 14, lineHeight: 1.45 });

export const criteriaEditor = style({
  inlineSize: "100%",
  minBlockSize: 130,
  boxSizing: "border-box",
  resize: "vertical",
  padding: 12,
  border: "1px solid #D3D3D3",
  borderRadius: 10,
  outline: 0,
  background: "#FAFAFA",
  color: "#222222",
  lineHeight: 1.55,
  selectors: { "&:focus": { borderColor: "#111111", background: "#FFFFFF" } },
});

export const missingContent = style({ margin: 0, color: "#999999", fontSize: 13 });

export const documentFooter = style({
  minBlockSize: 72,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
});

export const startDateEditor = style({ display: "flex", alignItems: "center", gap: 8, color: "#777777", fontSize: 10, fontWeight: 700 });
globalStyle(`${startDateEditor} > input`, { minBlockSize: 32, paddingInline: 7, border: "1px solid #D3D3D3", borderRadius: 8, background: "#FFFFFF" });

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

/* Linked work is deliberately list-like, not a nested card dashboard. */
export const linkedMeta = style({ margin: "0 0 12px", color: "#858585", fontSize: 11 });
export const linkedList = style({ listStyle: "none", display: "grid", gap: 0, margin: 0, padding: 0 });
export const linkedRow = style([
  focusOutline,
  {
    inlineSize: "100%",
    minBlockSize: 54,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 16,
    padding: "10px 8px",
    border: 0,
    borderBottom: "1px solid #ECECEC",
    background: "transparent",
    color: "#222222",
    textAlign: "left",
    cursor: "pointer",
    selectors: { "&:hover": { background: "#F8F8F8" } },
  },
]);
export const linkedCopy = style({ display: "grid", gap: 2, minInlineSize: 0 });
globalStyle(`${linkedCopy} > strong`, { overflow: "hidden", fontSize: 13, fontWeight: 670, textOverflow: "ellipsis", whiteSpace: "nowrap" });
globalStyle(`${linkedCopy} > span`, { color: "#858585", fontSize: 10 });
export const linkedArrow = style({ color: "#A0A0A0", fontSize: 13 });

/* Compatibility styles retained for the non-primary ReviewsPanel. */
export const muted = style({ margin: 0, color: "#858585", fontSize: 11, lineHeight: 1.45 });
export const fieldset = style({ display: "grid", gap: 12, border: "1px solid #E1E1E1", borderRadius: 10, padding: 12, margin: 0 });
export const input = style({ minBlockSize: 36, padding: "7px 9px", border: "1px solid #D3D3D3", borderRadius: 8, background: "#FFFFFF", color: "#222222" });
export const textarea = style([input, { minBlockSize: 88, resize: "vertical" }]);
export const actions = style({ display: "flex", gap: 8, flexWrap: "wrap" });
export const planList = style({ listStyle: "none", display: "grid", gap: 6, margin: 0, padding: 0 });
export const planButton = style([
  focusOutline,
  {
    inlineSize: "100%",
    display: "grid",
    gap: 2,
    padding: "9px 10px",
    border: "1px solid #E2E2E2",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#222222",
    textAlign: "left",
    cursor: "pointer",
  },
]);
globalStyle(`${planButton} > strong`, { fontSize: 12, fontWeight: 680 });
globalStyle(`${planButton} > span`, { color: "#858585", fontSize: 10 });

export { srOnly } from "../../design-system/primitives/utilities.css";
