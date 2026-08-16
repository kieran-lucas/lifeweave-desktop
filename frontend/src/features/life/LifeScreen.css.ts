import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { duration, easing, reduced } from "../../design-system/visual/motion.css";
import { vars } from "../../design-system/visual/contract.css";

export const lifeFrame = style({
  blockSize: "100%",
  minBlockSize: 0,
  gap: 0,
  paddingBlockEnd: 0,
});

export const workspace = style({
  inlineSize: "100%",
  blockSize: "100%",
  display: "grid",
  gridTemplateColumns: "15% minmax(0, 1fr)",
  minBlockSize: 0,
  overflow: "hidden",
  "@media": {
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
      overflow: "hidden",
    },
  },
});

export const navigator = style({
  minInlineSize: 0,
  display: "grid",
  gridTemplateRows: "auto auto auto auto auto minmax(0,1fr) auto",
  alignContent: "start",
  overflow: "hidden",
  borderInlineEnd: "1px solid #E1E1E1",
  background: "rgba(247, 247, 245, .58)",
  "@media": {
    "(max-width: 760px)": {
      maxBlockSize: 360,
      borderInlineEnd: 0,
      borderBlockEnd: "1px solid #E1E1E1",
    },
  },
});

export const navigatorHeader = style({
  minBlockSize: 52,
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 7,
  padding: "8px 10px",
  borderBottom: "1px solid #E2E2E0",
});

const quietControl = {
  minBlockSize: 32,
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: "#666666",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": { background: "#EAEAE7", color: "#111111" },
    "&:active:not(:disabled)": { transform: "scale(.96)" },
    "&:disabled": { opacity: .3, cursor: "default" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
} as const;

export const backButton = style({
  ...quietControl,
  inlineSize: 32,
  display: "grid",
  placeItems: "center",
  padding: 0,
});

export const navigatorLabel = style({
  color: "#222222",
  fontSize: 15,
  lineHeight: "20px",
  fontWeight: 730,
  letterSpacing: "-.01em",
  overflowWrap: "anywhere",
  whiteSpace: "normal",
});

export const editButton = style({
  ...quietControl,
  paddingInline: 8,
  fontSize: 12,
  fontWeight: 720,
  selectors: {
    ...quietControl.selectors,
    '&[aria-pressed="true"]': { background: "#111111", color: "#FFFFFF" },
  },
});

export const breadcrumb = style({
  minBlockSize: 34,
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 12px",
  flexWrap: "wrap",
  color: "#A1A1A1",
  fontSize: 11,
  lineHeight: "15px",
  overflowWrap: "anywhere",
});
globalStyle(`${breadcrumb} > span`, { display: "inline-flex", alignItems: "center", gap: 4 });
globalStyle(`${breadcrumb} button`, {
  padding: 0,
  border: 0,
  background: "transparent",
  color: "#777777",
  font: "inherit",
  cursor: "pointer",
});
globalStyle(`${breadcrumb} button:hover`, { color: "#111111" });
globalStyle(`${breadcrumb} button[aria-current="page"]`, { color: "#111111", fontWeight: 720 });
globalStyle(`${breadcrumb} button:focus-visible`, { outline: "1.5px solid #111111", outlineOffset: 2 });

export const branchIdentity = style({
  display: "grid",
  gridTemplateColumns: "34px minmax(0,1fr)",
  alignItems: "center",
  gap: 9,
  padding: "12px 12px 14px",
  borderBottom: "1px solid #E2E2E0",
});
globalStyle(`${branchIdentity} > div`, { display: "grid", gap: 1, minInlineSize: 0 });
globalStyle(`${branchIdentity} > div > span`, { color: "#999999", fontSize: 10, fontWeight: 720, letterSpacing: ".07em", textTransform: "uppercase" });
globalStyle(`${branchIdentity} > div > strong`, { color: "#222222", fontSize: 14, lineHeight: "19px", fontWeight: 680, overflowWrap: "anywhere", whiteSpace: "normal" });

export const icon = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 34,
  blockSize: 34,
  flex: "0 0 34px",
  border: "1px solid #D5D5D3",
  borderRadius: 10,
  background: "#FFFFFF",
  color: "#333333",
});
export const iconGlyph = style({
  display: "block",
  fontSize: 17,
  lineHeight: 1,
  selectors: {
    '&[data-size="medium"]': { fontSize: 20 },
    '&[data-size="large"]': { fontSize: 26 },
  },
});

export const navigatorTools = style({
  padding: "7px",
  borderBottom: "1px solid #E2E2E0",
  selectors: { "&:empty": { display: "none" } },
});

export const navigatorToolButton = style({
  ...quietControl,
  inlineSize: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 9px",
  color: "#555555",
  fontSize: 12,
  lineHeight: "17px",
  fontWeight: 680,
  textAlign: "left",
  selectors: {
    ...quietControl.selectors,
    '&[aria-pressed="true"]': { background: "#E3E3E0", color: "#111111" },
  },
});

export const childHeader = style({
  minBlockSize: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px 4px",
  color: "#8A8A8A",
  fontSize: 10,
  fontWeight: 720,
  letterSpacing: ".08em",
  textTransform: "uppercase",
});
globalStyle(`${childHeader} > strong`, { color: "#555555", fontVariantNumeric: "tabular-nums" });

export const nodeList = style({
  listStyle: "none",
  minBlockSize: 0,
  overflowY: "auto",
  display: "grid",
  alignContent: "start",
  gap: 2,
  margin: 0,
  padding: "4px 7px 10px",
});

export const nodeRow = style({
  inlineSize: "100%",
  minBlockSize: 48,
  display: "grid",
  gridTemplateColumns: "34px minmax(0,1fr)",
  alignItems: "center",
  gap: 8,
  padding: "6px 7px",
  border: 0,
  borderRadius: 10,
  background: "transparent",
  color: "#222222",
  textAlign: "left",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": { background: "#EAEAE7" },
    "&:active:not(:disabled)": { transform: "scale(.985)" },
    "&:disabled": { opacity: .5, cursor: "wait" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: -2 },
  },
});

export const nodeRowCopy = style({ display: "grid", gap: 1, minInlineSize: 0 });
globalStyle(`${nodeRowCopy} > strong`, { color: "#282828", fontSize: 13, lineHeight: "18px", fontWeight: 650, overflowWrap: "break-word", wordBreak: "normal", whiteSpace: "normal" });
globalStyle(`${nodeRowCopy} > small`, { overflow: "hidden", color: "#929292", fontSize: 11, lineHeight: "15px", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const rowArrow = style({ display: "none" });

export const noChildren = style({ margin: "8px 12px", color: "#999999", fontSize: 12, lineHeight: 1.45 });

export const paging = style({
  minBlockSize: 38,
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 5,
  padding: "5px 8px",
  borderTop: "1px solid #E2E2E0",
  color: "#8A8A8A",
  fontSize: 9,
  fontVariantNumeric: "tabular-nums",
});
globalStyle(`${paging} > button`, { minBlockSize: 28, border: 0, borderRadius: 7, background: "transparent", color: "#666666", fontSize: 9, fontWeight: 680, cursor: "pointer" });
globalStyle(`${paging} > button:last-child`, { justifySelf: "end" });
globalStyle(`${paging} > button:hover:not(:disabled)`, { background: "#EAEAE7", color: "#111111" });
globalStyle(`${paging} > button:disabled`, { opacity: .28, cursor: "default" });

export const canvas = style({
  minInlineSize: 0,
  minBlockSize: 0,
  overflowY: "auto",
  background: "transparent",
  selectors: {
    '&[data-life-mode="edit"]': {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
  },
});

export const notice = style({
  margin: 16,
  padding: "8px 10px",
  border: "1px solid #DEDEDE",
  borderRadius: 8,
  background: "#F8F8F8",
  color: "#666666",
  fontSize: 10,
});

const canvasEnter = keyframes({
  from: { opacity: 0.2, transform: "translateX(22px)" },
  to: { opacity: 1, transform: "translateX(0)" },
});

const canvasFade = keyframes({
  from: { opacity: 0.64 },
  to: { opacity: 1 },
});

const canvasMotion = {
  animation: `${canvasEnter} ${duration.traversal} ${easing.standard} both`,
  transformOrigin: "center",
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: `${canvasFade} ${reduced.duration} ${reduced.easing} both`,
      transform: "none",
    },
  },
} as const;

export const branchCanvas = style({
  ...canvasMotion,
  inlineSize: "100%",
  boxSizing: "border-box",
  padding: "clamp(32px, 6vw, 70px) clamp(22px, 5vw, 64px) 48px",
});

export const editCanvas = style({
  ...canvasMotion,
  inlineSize: "100%",
  blockSize: "100%",
  flex: "1 1 auto",
  minBlockSize: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 12,
  overflow: "hidden",
  padding: "clamp(12px, 2vh, 18px) clamp(12px, 2vw, 24px) 12px",
});

export const treeHeader = style({
  minInlineSize: 0,
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 18,
  paddingInline: 2,
});
globalStyle(`${treeHeader} > div`, { minInlineSize: 0 });
globalStyle(`${treeHeader} > p`, {
  margin: "0 0 2px",
  color: "#8A8A8A",
  fontSize: 9,
  lineHeight: "13px",
  whiteSpace: "nowrap",
});

export const treeTitle = style({
  margin: 0,
  color: "#111111",
  fontSize: "clamp(24px, 3vw, 32px)",
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "-.045em",
});

export const readerCanvas = style({
  ...canvasMotion,
  inlineSize: "100%",
  boxSizing: "border-box",
  // The reading column keeps the page's own horizontal rhythm; the header centres inside it and is
  // free to be narrower than the document below.
  padding: "clamp(26px, 4.6vh, 52px) clamp(18px, 5%, 76px) 48px",
});

export const canvasEyebrow = style({
  marginBlockEnd: 8,
  color: "#8C8C8C",
  fontSize: 9,
  lineHeight: "12px",
  fontWeight: 760,
  letterSpacing: ".12em",
  textTransform: "uppercase",
});
globalStyle(`${treeHeader} ${canvasEyebrow}`, { marginBlockEnd: 4 });

export const branchHeroIcon = style({ marginBlockEnd: 18 });

globalStyle(`${branchHeroIcon} ${icon}`, { inlineSize: 48, blockSize: 48, borderRadius: 13 });

export const canvasTitle = style({
  maxInlineSize: "17ch",
  margin: 0,
  color: "#111111",
  fontSize: "clamp(34px, 5.2vw, 60px)",
  lineHeight: .99,
  fontWeight: 700,
  letterSpacing: "-.055em",
  overflowWrap: "anywhere",
});

export const branchDescription = style({
  maxInlineSize: "60ch",
  margin: "18px 0 0",
  color: "#4F4F4F",
  fontSize: 15,
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
});
export const branchDescriptionMuted = style([branchDescription, { color: "#999999" }]);

export const branchFacts = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 160px))",
  gap: 0,
  marginBlock: "34px 42px",
  borderBlock: "1px solid #E5E5E5",
});
globalStyle(`${branchFacts} > div`, { display: "grid", gap: 3, padding: "14px 14px 14px 0" });
globalStyle(`${branchFacts} > div + div`, { paddingInlineStart: 14, borderInlineStart: "1px solid #E5E5E5" });
globalStyle(`${branchFacts} span`, { color: "#969696", fontSize: 9, fontWeight: 720, letterSpacing: ".07em", textTransform: "uppercase" });
globalStyle(`${branchFacts} strong`, { color: "#333333", fontSize: 12, fontWeight: 660 });

export const documentBody = style({
  inlineSize: "100%",
  maxInlineSize: "none",
  // The header closes with its own hairline; this is the quiet distance from that rule to the
  // first line of the document.
  paddingBlock: "30px 28px",
  overflowAnchor: "none",
});
globalStyle(`${documentBody} > *`, {
  minBlockSize: "clamp(500px, 68vh, 820px)",
  overflowAnchor: "none",
});

export const contextDisclosure = style({ borderBlockStart: `1px solid ${vars.color.borderHairline}` });
globalStyle(`${contextDisclosure} > summary`, {
  minBlockSize: 42,
  display: "inline-flex",
  alignItems: "center",
  paddingInline: 2,
  color: vars.color.textTertiary,
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
  listStyle: "none",
});
globalStyle(`${contextDisclosure} > summary::-webkit-details-marker`, { display: "none" });
globalStyle(`${contextDisclosure} > summary:hover`, { color: vars.color.textPrimary });
globalStyle(`${contextDisclosure} > summary:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 });
globalStyle(`${contextDisclosure} > section`, { marginBlockStart: 12, paddingBlockStart: 18, borderBlockStart: `1px solid ${vars.color.borderHairline}` });
globalStyle(`${contextDisclosure} > section:first-of-type`, { borderBlockStart: 0 });

export const contextSection = style({
  display: "grid",
  gap: 24,
  paddingBlock: "12px 8px 24px",
});

globalStyle(`${contextSection} > section`, { paddingBlockStart: 22, borderBlockStart: "1px solid #ECECEC" });
globalStyle(`${contextSection} > section:first-child`, { paddingBlockStart: 0, borderBlockStart: 0 });

globalStyle(`${canvas} button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });
