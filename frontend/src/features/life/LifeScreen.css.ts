import { globalStyle, style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const workspace = style({
  display: "grid",
  gridTemplateColumns: "minmax(228px, 292px) minmax(0, 1fr)",
  minBlockSize: "min(720px, calc(100vh - 112px))",
  maxBlockSize: "calc(100vh - 88px)",
  overflow: "hidden",
  border: "1px solid #D8D8D8",
  borderRadius: 18,
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "0 16px 46px rgba(0,0,0,.055)",
  "@media": {
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
      maxBlockSize: "none",
      overflow: "visible",
    },
  },
});

export const navigator = style({
  minInlineSize: 0,
  display: "grid",
  gridTemplateRows: "auto auto auto auto minmax(0,1fr) auto",
  alignContent: "start",
  overflow: "hidden",
  borderInlineEnd: "1px solid #E1E1E1",
  background: "#F7F7F5",
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
  gridTemplateColumns: "32px 1fr auto",
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
  overflow: "hidden",
  color: "#222222",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 730,
  letterSpacing: "-.01em",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const editButton = style({
  ...quietControl,
  paddingInline: 8,
  fontSize: 10,
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
  overflowX: "auto",
  color: "#A1A1A1",
  fontSize: 9,
  lineHeight: "12px",
  whiteSpace: "nowrap",
  scrollbarWidth: "none",
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
  gridTemplateColumns: "36px minmax(0,1fr)",
  alignItems: "center",
  gap: 9,
  padding: "12px 12px 14px",
  borderBottom: "1px solid #E2E2E0",
});
globalStyle(`${branchIdentity} > div`, { display: "grid", gap: 1, minInlineSize: 0 });
globalStyle(`${branchIdentity} > div > span`, { color: "#999999", fontSize: 9, fontWeight: 720, letterSpacing: ".07em", textTransform: "uppercase" });
globalStyle(`${branchIdentity} > div > strong`, { overflow: "hidden", color: "#222222", fontSize: 13, lineHeight: "17px", fontWeight: 680, textOverflow: "ellipsis", whiteSpace: "nowrap" });

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

export const childHeader = style({
  minBlockSize: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px 4px",
  color: "#8A8A8A",
  fontSize: 9,
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
  scrollbarGutter: "stable",
});

export const nodeRow = style({
  inlineSize: "100%",
  minBlockSize: 48,
  display: "grid",
  gridTemplateColumns: "34px minmax(0,1fr) 18px",
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
globalStyle(`${nodeRow} ${icon}`, { inlineSize: 30, blockSize: 30, borderRadius: 8, background: "#FCFCFC" });

export const nodeRowCopy = style({ display: "grid", gap: 1, minInlineSize: 0 });
globalStyle(`${nodeRowCopy} > strong`, { overflow: "hidden", color: "#282828", fontSize: 11, lineHeight: "15px", fontWeight: 650, textOverflow: "ellipsis", whiteSpace: "nowrap" });
globalStyle(`${nodeRowCopy} > small`, { overflow: "hidden", color: "#929292", fontSize: 9, lineHeight: "12px", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const rowArrow = style({ color: "#A7A7A7", transition: `transform ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`, selectors: { [`${nodeRow}:hover &`]: { color: "#333333", transform: "translateX(2px)" } } });

export const noChildren = style({ margin: "8px 12px", color: "#999999", fontSize: 10, lineHeight: 1.45 });

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
  background: "#FFFFFF",
  scrollbarGutter: "stable",
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

export const branchCanvas = style({
  maxInlineSize: 820,
  marginInline: "auto",
  padding: "clamp(32px, 6vw, 70px) clamp(22px, 5vw, 64px) 48px",
});

export const editCanvas = style({
  maxInlineSize: 940,
  marginInline: "auto",
  padding: "clamp(28px, 5vw, 58px) clamp(18px, 4vw, 48px) 48px",
});

export const readerCanvas = style({
  maxInlineSize: 800,
  marginInline: "auto",
  padding: "clamp(34px, 6vw, 72px) clamp(24px, 5vw, 62px) 56px",
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

export const readerHeader = style({
  display: "grid",
  justifyItems: "start",
  gap: 10,
  paddingBlockEnd: 30,
  borderBottom: "1px solid #E5E5E5",
});
globalStyle(`${readerHeader} ${icon}`, { inlineSize: 42, blockSize: 42, borderRadius: 12 });

export const readerTitle = style({
  maxInlineSize: "18ch",
  margin: "4px 0 0",
  color: "#111111",
  fontSize: "clamp(36px, 5vw, 58px)",
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "-.055em",
  overflowWrap: "anywhere",
});

export const readerDescription = style({
  maxInlineSize: "62ch",
  margin: 0,
  color: "#5A5A5A",
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
});

export const documentBody = style({
  paddingBlock: "34px 42px",
  borderBottom: "1px solid #E5E5E5",
});

export const contextSection = style({
  display: "grid",
  gap: 24,
  paddingBlock: "32px 8px",
});

globalStyle(`${contextSection} > section`, { paddingBlockStart: 22, borderBlockStart: "1px solid #ECECEC" });
globalStyle(`${contextSection} > section:first-child`, { paddingBlockStart: 0, borderBlockStart: 0 });

globalStyle(`${canvas} button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });
