import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { splitWorkspace } from "../../app/layout/layout.css";
import { text } from "../../design-system/visual/typography.css";
import { tab as sharedTab } from "../../design-system/primitives/navigation.css";
import { duration, easing } from "../../design-system/visual/motion.css";

const prismFloat = keyframes({
  "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(14deg)", opacity: 0.42 },
  "50%": { transform: "translate3d(-12px, 15px, 0) rotate(19deg)", opacity: 0.66 },
});

const focusSweep = keyframes({
  "0%, 100%": { backgroundPosition: "0% 50%" },
  "50%": { backgroundPosition: "100% 50%" },
});

export const heading = style({ margin: 0, ...text.display, color: "var(--text-primary)", letterSpacing: "-0.045em", textShadow: "0 1px 0 rgba(255,255,255,.82)" });
export const lede = style({ margin: 0, color: "var(--text-muted)", maxInlineSize: "58ch" });
export const createForm = style({
  display: "grid",
  gridTemplateColumns: "minmax(10rem, 1fr) auto",
  alignItems: "center",
  gap: space.control,
  inlineSize: "min(22rem, 100%)",
  minInlineSize: 0,
  padding: 4,
  border: "1px solid rgba(188,204,229,.72)",
  borderRadius: "14px",
  background: "rgba(255,255,255,.62)",
  backdropFilter: "blur(14px)",
  boxShadow: "var(--glow-compact)",
  "@media": { "(max-width: 700px)": { inlineSize: "100%" } },
});
export const portfolios = style({ display: "flex", gap: space.x3, flexWrap: "wrap", borderBottom: "1px solid rgba(191,207,231,.74)" });
export const tab = sharedTab;

export const workspace = style([
  splitWorkspace,
  {
    position: "relative",
    isolation: "isolate",
    vars: { "--lw-split-columns": "minmax(220px, 288px) minmax(0, 1fr)" },
    gap: space.x5,
    padding: "clamp(16px, 2vw, 26px)",
    border: "1px solid rgba(181, 201, 231, 0.72)",
    borderRadius: "26px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,.86), rgba(245,248,255,.72)), radial-gradient(circle at 86% 12%, rgba(120,102,255,.13), transparent 34%), radial-gradient(circle at 8% 92%, rgba(79,179,244,.09), transparent 28%)",
    backdropFilter: "blur(18px) saturate(1.08)",
    boxShadow: "var(--glow-hero), inset 0 1px 0 rgba(255,255,255,.90)",
    selectors: {
      "&::before": {
        content: '""',
        position: "absolute",
        zIndex: 0,
        inlineSize: 210,
        blockSize: 300,
        insetInlineEnd: "5%",
        insetBlockStart: "-105px",
        border: "1px solid rgba(112,132,224,.18)",
        clipPath: "polygon(50% 0, 100% 74%, 52% 100%, 0 72%)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,.52), rgba(115,143,255,.11) 38%, rgba(158,108,255,.10) 68%, rgba(255,255,255,.16))",
        boxShadow: "inset 0 0 28px rgba(255,255,255,.64)",
        filter: "blur(.2px)",
        animation: `${prismFloat} 11s ease-in-out infinite`,
        pointerEvents: "none",
      },
      "&::after": {
        content: '""',
        position: "absolute",
        zIndex: 0,
        inlineSize: 480,
        blockSize: 190,
        insetInlineEnd: "-190px",
        insetBlockEnd: "-90px",
        borderRadius: "50%",
        border: "1px solid rgba(91,123,211,.11)",
        boxShadow: "0 0 0 40px rgba(108,140,221,.025), 0 0 0 78px rgba(152,113,230,.018)",
        transform: "rotate(-11deg)",
        pointerEvents: "none",
      },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { selectors: { "&::before": { animation: "none" } } },
      "(forced-colors: active)": {
        background: "Canvas",
        borderColor: "CanvasText",
        boxShadow: "none",
        selectors: { "&::before": { display: "none" }, "&::after": { display: "none" } },
      },
    },
  },
]);
globalStyle(`${workspace} > *`, { position: "relative", zIndex: 1 });

export const listPanel = style({
  padding: 6,
  border: "1px solid rgba(190,205,229,.72)",
  borderRadius: "17px",
  background: "rgba(250,252,255,.68)",
  backdropFilter: "blur(14px)",
  boxShadow: "var(--glow-crystal)",
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
  scrollbarGutter: "stable",
  "@media": { "(max-width: 700px)": { maxHeight: "none" } },
});
export const planList = style({ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 3 });

export const planButton = style({
  position: "relative",
  overflow: "hidden",
  width: "100%",
  display: "grid",
  gap: 4,
  textAlign: "left",
  padding: "12px 11px",
  border: "1px solid transparent",
  borderRadius: "12px",
  background: "rgba(255,255,255,.48)",
  color: "inherit",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "linear-gradient(110deg, rgba(248,250,255,.96), rgba(235,241,255,.84))", borderColor: "rgba(130,156,225,.30)", transform: "translateY(-1px)", boxShadow: "var(--glow-hover)" },
    '&[aria-current="true"]': {
      background: "linear-gradient(125deg, rgba(77,111,255,.97), rgba(111,90,235,.92))",
      borderColor: "rgba(255,255,255,.64)",
      color: "#FFFFFF",
      boxShadow: "0 14px 34px rgba(78,91,214,.24), inset 0 1px 0 rgba(255,255,255,.30)",
    },
    '&[aria-current="true"]::after': {
      content: '""',
      position: "absolute",
      inset: 0,
      background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,.22) 45%, transparent 68%)",
      backgroundSize: "220% 100%",
      animation: `${focusSweep} 6s ease-in-out infinite`,
      pointerEvents: "none",
    },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" }, '&[aria-current="true"]::after': { animation: "none" } } },
    "(forced-colors: active)": { selectors: { '&[aria-current="true"]': { background: "Highlight", color: "HighlightText", boxShadow: "none" }, '&[aria-current="true"]::after': { display: "none" } } },
  },
});
globalStyle(`${planButton} > strong`, { position: "relative", zIndex: 1, ...text.row, fontWeight: 680, letterSpacing: "-0.012em" });
globalStyle(`${planButton} > span`, { position: "relative", zIndex: 1, ...text.metadata, color: "var(--text-muted)" });
globalStyle(`${planButton}[aria-current="true"] > span`, { color: "rgba(255,255,255,.78)" });

export const detailPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x5,
  minInlineSize: 0,
  padding: "clamp(18px, 2.4vw, 30px)",
  border: "1px solid rgba(190,205,229,.72)",
  borderRadius: "19px",
  background: "rgba(255,255,255,.76)",
  backdropFilter: "blur(16px)",
  boxShadow: "var(--glow-crystal-strong)",
});
export const detailHeader = style({
  position: "relative",
  display: "grid",
  gap: 4,
  minInlineSize: 0,
  paddingBlockEnd: space.x4,
  borderBlockEnd: "1px solid rgba(185,202,229,.72)",
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      insetInlineStart: 0,
      insetBlockEnd: -1,
      inlineSize: 88,
      blockSize: 2,
      borderRadius: 999,
      background: "linear-gradient(90deg, var(--accent), var(--accent-violet), transparent)",
      boxShadow: "var(--glow-dot)",
    },
  },
});
globalStyle(`${detailHeader} h2`, { ...text.objectTitle, margin: 0, fontSize: "clamp(1.45rem, 2vw, 1.9rem)", letterSpacing: "-0.03em", color: "var(--text-primary)" });
export const kicker = style({ ...text.eyebrow, margin: 0, color: "var(--accent-muted)", textTransform: "uppercase", letterSpacing: "0.08em" });
export const muted = style({ ...text.metadata, color: "var(--text-muted)", margin: 0 });

export const brief = style({ display: "grid", gap: space.x4, border: 0, padding: 0, margin: 0, minInlineSize: 0 });
export const field = style({ display: "grid", gap: 7, minInlineSize: 0, color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 680, letterSpacing: "0.025em" });
export const input = style({
  width: "100%",
  boxSizing: "border-box",
  minInlineSize: 0,
  minBlockSize: 39,
  padding: "9px 11px",
  border: "1px solid rgba(185,202,229,.80)",
  borderRadius: "11px",
  outline: 0,
  background: "rgba(250,252,255,.82)",
  color: "var(--text-primary)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.88)",
  transition: `border-color ${duration.state} ${easing.standard}, background-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { borderColor: "rgba(119,145,216,.52)" },
    "&:focus": { borderColor: "var(--accent)", background: "#FFFFFF", boxShadow: "0 0 0 3px rgba(78,111,255,.10), inset 0 1px 0 rgba(255,255,255,.9)" },
  },
});
export const createInput = style([input, { inlineSize: "100%", border: 0, background: "transparent", boxShadow: "none", selectors: { "&:focus": { boxShadow: "none", background: "transparent" } } }]);
export const outcome = style([
  input,
  {
    minHeight: "126px",
    resize: "vertical",
    fontSize: "1.02rem",
    lineHeight: 1.62,
    fontWeight: 520,
    background: "linear-gradient(145deg, rgba(252,253,255,.94), rgba(239,244,255,.82))",
    borderColor: "rgba(145,166,224,.48)",
    boxShadow: "var(--glow-crystal)",
  },
]);
export const criteria = style([input, { minHeight: "96px", resize: "vertical", lineHeight: 1.55 }]);
export const twoColumns = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: space.x3, "@media": { "(max-width: 700px)": { gridTemplateColumns: "1fr" } } });
export const actions = style({ display: "flex", gap: space.x2, flexWrap: "wrap" });

globalStyle(`${actions} > button:first-child`, { boxShadow: "var(--glow-primary)" });

export const advanced = style({
  border: "1px solid rgba(190,205,229,.68)",
  borderRadius: "12px",
  padding: space.x2,
  background: "rgba(247,250,255,.56)",
});
globalStyle(`${advanced} > summary`, { cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 680, listStylePosition: "inside" });
export const advancedBody = style({ display: "grid", gap: space.x3, padding: space.x3, paddingBlockEnd: 0 });
export const advancedActions = style({ display: "flex", gap: space.x2, flexWrap: "wrap", alignItems: "center" });

export const error = style({ color: "var(--danger)", padding: "9px 11px", border: "1px solid rgba(217,78,114,.40)", borderRadius: "var(--radius-control)", backgroundColor: "rgba(255,240,244,.90)", boxShadow: "var(--glow-danger)" });
export const emptyState = style({ display: "grid", gap: 7, alignSelf: "center", maxInlineSize: "28rem", color: "var(--text-muted)", textAlign: "center", padding: "clamp(32px, 8vh, 72px) 20px" });
globalStyle(`${emptyState} > strong`, { color: "var(--text-primary)", fontSize: "1rem" });

/* Compatibility styles for the retained but no-longer-primary ReviewsPanel. */
export const fieldset = style({ display: "grid", gap: space.x3, border: 0, borderBlockStart: "1px solid var(--border-subtle)", padding: `${space.x3} 0 0`, margin: 0 });
export const textarea = style([input, { minHeight: "94px", resize: "vertical" }]);

globalStyle(`${detailPanel} > section`, { borderBlockStart: "1px solid rgba(190,205,229,.70)", paddingBlockStart: space.x4 });
globalStyle(`${detailPanel} > section > h3`, { ...text.sectionTitle, margin: `0 0 ${space.x2}`, color: "var(--text-primary)" });
globalStyle(`ol${planList} > li`, { paddingBlock: space.x3, borderBlockEnd: "1px solid var(--border-subtle)" });
globalStyle(`ol${planList} article h4`, { margin: 0 });
globalStyle(`ol${planList} article p`, { margin: `${space.x2} 0 0`, maxInlineSize: "68ch" });

export { srOnly } from "../../design-system/primitives/utilities.css";
