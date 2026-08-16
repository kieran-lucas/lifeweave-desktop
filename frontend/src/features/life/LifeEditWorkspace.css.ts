import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { focusRing, srOnly } from "../../design-system/primitives/utilities.css";
import { vars } from "../../design-system/visual/contract.css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const workspace = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr)",
  gridTemplateRows: "minmax(0,1fr) auto",
  gap: 8,
  alignItems: "stretch",
  blockSize: "100%",
  minBlockSize: 0,
  minInlineSize: 0,
});

export const canvasViewport = style({
  position: "relative",
  minInlineSize: 0,
  minBlockSize: 0,
  blockSize: "100%",
  overflow: "hidden",
  overscrollBehavior: "contain",
  border: "1px solid #D8D8D8",
  borderRadius: 14,
  backgroundColor: "#FAFAF8",
  backgroundImage: "var(--paint-grain-fine)",
  cursor: "grab",
  touchAction: "none",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
    '&[data-panning="true"]': { cursor: "grabbing", userSelect: "none" },
  },
});

export const canvas = style({ position: "relative", minInlineSize: "100%", minBlockSize: 480 });
export const links = style({ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" });
export const positioner = style({ position: "absolute", zIndex: 1, inlineSize: "var(--life-node-width, 196px)", transform: "translate(var(--life-x),var(--life-y))", selectors: { '&[data-menu-open="true"]': { zIndex: 10 } } });
export const nodeShell = style({ position: "relative" });
const revealActions = keyframes({
  from: { opacity: 0, transform: "scale(.97)" },
  to: { opacity: 1, transform: "scale(1)" },
});
const revealInspector = keyframes({
  from: { opacity: 0, transform: "translateY(7px) scale(.985)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});
export const nodeActions = style({
  position: "absolute",
  zIndex: 9,
  insetInlineStart: 0,
  insetBlockStart: "100%",
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 3,
  padding: 5,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.floating,
  background: vars.color.surfaceRaised,
  boxShadow: vars.elevation.floating,
  color: vars.color.textPrimary,
  transformOrigin: "top center",
  animation: `${revealActions} ${duration.popover} ${easing.standard} both`,
  selectors: {
    '&[data-action-count="1"]': {
      insetInlineStart: "50%",
      inlineSize: "max-content",
      minInlineSize: 116,
      translate: "-50% 0",
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
    "(forced-colors: active)": { borderColor: "CanvasText", background: "Canvas", boxShadow: "none" },
  },
});
export const nodeAction = style([
  focusRing,
  {
    minBlockSize: 36,
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    gap: 7,
    paddingInline: 9,
    border: 0,
    borderRadius: vars.radius.control,
    background: "transparent",
    color: vars.color.textPrimary,
    whiteSpace: "nowrap",
    fontSize: 10,
    lineHeight: "14px",
    fontWeight: 680,
    cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
    selectors: { "&:hover": { background: vars.color.surfaceHover, color: vars.color.accent }, "&:active": { background: vars.color.accentSoft } },
    "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
  },
]);
export const nodeActionIcon = style({
  inlineSize: 22,
  blockSize: 22,
  display: "inline-grid",
  placeItems: "center",
  flex: "0 0 22px",
  borderRadius: vars.radius.full,
  background: vars.color.accentSoft,
  color: vars.color.accent,
  fontSize: 16,
  lineHeight: 1,
  fontWeight: 500,
  "@media": { "(forced-colors: active)": { border: "1px solid ButtonText", background: "ButtonFace", color: "ButtonText" } },
});

export const nodeCard = style([
  focusRing,
  {
    inlineSize: "100%",
    minBlockSize: 64,
    display: "grid",
    gridTemplateColumns: "28px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
    padding: "8px 9px",
    border: "1px solid #D1D1CF",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    backgroundImage: "var(--paint-grain-fine)",
    color: "#222222",
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 130ms ease, color 130ms ease, border-color 130ms ease, transform 100ms ease",
    selectors: {
      "&[aria-pressed=true]": { borderColor: vars.color.accent, backgroundColor: vars.color.accentSoft, color: vars.color.textPrimary },
      "&:hover:not([aria-pressed=true])": { borderColor: "#A9A9A6", backgroundColor: "#F4F4F1" },
      "&:active": { transform: "scale(.985)" },
    },
    "@media": {
      "(forced-colors: active)": {
        selectors: { "&[aria-pressed=true]": { borderColor: "Highlight", background: "Canvas", color: "CanvasText", outline: "2px solid Highlight" } },
      },
    },
  },
]);

export const nodeIcon = style({
  inlineSize: 28,
  blockSize: 28,
  display: "inline-grid",
  placeItems: "center",
  fontSize: 18,
  lineHeight: 1,
});
export const nodeContent = style({ minInlineSize: 0, display: "grid", gap: 3 });
export const nodeMetaRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minInlineSize: 0 });
export const compactTitle = style({ display: "block", whiteSpace: "normal", overflowWrap: "anywhere", fontSize: 11, lineHeight: "15px", fontWeight: 680 });
export const compactMeta = style({ display: "block", color: "#8B8B8B", fontSize: 8, lineHeight: "11px" });
globalStyle(`${nodeCard}[aria-pressed="true"] ${compactMeta}`, { color: vars.color.textSecondary });

export const confidenceBadge = style({
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  minBlockSize: 15,
  paddingInline: 5,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.full,
  background: vars.color.surfaceSubtle,
  color: vars.color.textSecondary,
  fontSize: 8,
  lineHeight: "13px",
  fontWeight: 720,
  letterSpacing: ".01em",
  selectors: {
    '&[data-level="leaning"]': { borderColor: vars.color.accentMuted, color: vars.color.accent },
    '&[data-level="committed"]': { borderColor: vars.color.success, color: vars.color.textPrimary },
    '&[data-level="core"]': { borderColor: vars.color.accent, background: vars.color.accentSoft, color: vars.color.textPrimary },
  },
  "@media": { "(forced-colors: active)": { borderColor: "CanvasText", background: "Canvas", color: "CanvasText" } },
});
export const confidenceMark = style({ display: "inline-flex", alignItems: "end", gap: 1, blockSize: 7 });
export const confidencePip = style({
  display: "block",
  inlineSize: 2,
  blockSize: 7,
  borderRadius: 1,
  background: "currentColor",
  opacity: .2,
  selectors: { '&[data-active="true"]': { opacity: 1 } },
});

export const inspector = style({
  position: "absolute",
  zIndex: 8,
  insetBlockStart: "var(--life-inspector-y, 14px)",
  insetInlineStart: "var(--life-inspector-x, 14px)",
  inlineSize: "min(400px, calc(100% - 28px))",
  maxBlockSize: "calc(100% - 28px)",
  boxSizing: "border-box",
  display: "grid",
  alignContent: "start",
  gap: 0,
  minBlockSize: 0,
  overflowY: "auto",
  padding: "16px 17px 18px",
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: 16,
  background: "rgba(255, 255, 255, .97)",
  boxShadow: "0 18px 54px rgba(0, 0, 0, .16), 0 4px 14px rgba(0, 0, 0, .07)",
  backdropFilter: "blur(14px)",
  animation: `${revealInspector} ${duration.popover} ${easing.standard} both`,
  "@media": {
    "(max-width: 620px)": { inlineSize: "calc(100% - 20px)", maxBlockSize: "calc(100% - 20px)", padding: 15 },
    "(prefers-reduced-motion: reduce)": { animation: "none" },
    "(forced-colors: active)": { borderColor: "CanvasText", background: "Canvas", boxShadow: "none", backdropFilter: "none" },
  },
});

export const inspectorHeader = style({ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "start", gap: 14, paddingBlockEnd: 14, borderBlockEnd: "1px solid #E8E8E6" });
export const inspectorEyebrow = style({ margin: "0 0 3px", color: "#929292", fontSize: 10, lineHeight: "14px", fontWeight: 760, letterSpacing: ".09em", textTransform: "uppercase" });
export const inspectorTitle = style({ margin: 0, color: "#1E1E1E", fontSize: 19, lineHeight: "25px", fontWeight: 730, letterSpacing: "-.025em", overflowWrap: "anywhere" });
export const instructions = style({ margin: "3px 0 0", color: "#838383", fontSize: 12, lineHeight: "17px" });
export const editorSection = style({ display: "grid", gap: 12, paddingBlock: "15px 5px" });
export const fieldGrid = style({ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, "@media": { "(max-width: 420px)": { gridTemplateColumns: "1fr" } } });
export const field = style({ display: "grid", gap: 6, color: "#5F5F5F", fontSize: 12, lineHeight: "16px", fontWeight: 690, letterSpacing: ".01em" });
export const confidenceFieldset = style({
  display: "grid",
  gap: 7,
  margin: 0,
  padding: 0,
  border: 0,
  color: vars.color.textSecondary,
  fontSize: 11,
  lineHeight: "15px",
});
export const confidenceLegend = style({ padding: 0, color: vars.color.textPrimary, fontSize: 12, lineHeight: "16px", fontWeight: 720 });
export const confidenceHelp = style({ margin: 0 });
export const confidenceOptions = style({ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, "@media": { "(max-width: 420px)": { gridTemplateColumns: "1fr" } } });
export const confidenceOption = style({
  minInlineSize: 0,
  display: "grid",
  gridTemplateColumns: "auto 24px minmax(0,1fr)",
  alignItems: "start",
  gap: 7,
  padding: 8,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: 9,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  cursor: "pointer",
  transition: `border-color ${duration.state} ${easing.standard}, background-color ${duration.state} ${easing.standard}`,
  selectors: {
    '&[data-selected="true"]': { borderColor: vars.color.accent, background: vars.color.accentSoft, color: vars.color.textPrimary },
    "&:hover": { borderColor: vars.color.borderStrong },
    "&:focus-within": { outline: `2px solid ${vars.color.accent}`, outlineOffset: 2 },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" }, "(forced-colors: active)": { selectors: { '&[data-selected="true"]': { borderColor: "Highlight", background: "Canvas", color: "CanvasText" } } } },
});
export const confidenceRadio = style({ margin: "3px 0 0", accentColor: vars.color.accent });
export const confidenceOptionTitle = style({ display: "block", color: "inherit", fontSize: 11, lineHeight: "15px" });
export const confidenceOptionDescription = style({ display: "block", marginBlockStart: 2, color: vars.color.textSecondary, fontSize: 9, lineHeight: "13px", fontWeight: 500 });
export const confidenceOptionMark = style({
  inlineSize: 22,
  blockSize: 22,
  display: "grid",
  placeItems: "center",
  borderRadius: vars.radius.full,
  background: vars.color.surfaceSubtle,
  color: vars.color.textPrimary,
  fontSize: 10,
  fontWeight: 760,
});
export const input = style([
  focusRing,
  {
    inlineSize: "100%",
    minInlineSize: 0,
    minBlockSize: 40,
    boxSizing: "border-box",
    padding: "9px 10px",
    border: "1px solid #D3D3D3",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#222222",
    font: "inherit",
    fontSize: 13,
    lineHeight: "18px",
    letterSpacing: 0,
    selectors: { "&:focus": { borderColor: "#111111" } },
  },
]);

export const actions = style({ display: "flex", gap: 8, flexWrap: "wrap" });

export const button = style({
  minBlockSize: 36,
  paddingInline: 11,
  border: "1px solid #D2D2D2",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#444444",
  fontSize: 12,
  fontWeight: 690,
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": { borderColor: "#AFAFAF", color: "#111111", background: "#F5F5F5" },
    "&:disabled": { opacity: .36, cursor: "default" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
});
export const closeInspector = style([
  focusRing,
  {
    inlineSize: 36,
    blockSize: 36,
    flex: "0 0 36px",
    display: "grid",
    placeItems: "center",
    padding: 0,
    border: 0,
    borderRadius: vars.radius.full,
    background: "transparent",
    color: "#727272",
    cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": { background: "#EFEFED", color: "#111111" },
      "&:active": { background: "#E4E4E1", transform: "scale(.92)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
      "(forced-colors: active)": { border: "1px solid ButtonText", background: "ButtonFace", color: "ButtonText" },
    },
  },
]);

export const destructive = style([
  button,
  { color: "#555555", selectors: { "&:hover:not(:disabled)": { borderColor: "#111111", background: "#111111", color: "#FFFFFF" } } },
]);

export const disclosure = style({ borderBlockStart: "1px solid #E8E8E6" });
globalStyle(`${disclosure} > summary`, { minBlockSize: 44, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#3F3F3F", fontSize: 12, lineHeight: "17px", fontWeight: 700, cursor: "pointer", listStyle: "none" });
globalStyle(`${disclosure} > summary::-webkit-details-marker`, { display: "none" });
globalStyle(`${disclosure} > summary::after`, { content: '"+"', color: "#909090", fontSize: 17, fontWeight: 400 });
globalStyle(`${disclosure}[open] > summary::after`, { content: '"−"' });
globalStyle(`${disclosure} > summary:hover`, { color: "#111111" });
globalStyle(`${disclosure} > summary:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });
export const disclosureBody = style({ display: "grid", gap: 10, paddingBlock: "2px 14px" });
export const subsectionTitle = style({ margin: 0, color: "#4A4A4A", fontSize: 12, lineHeight: "17px", fontWeight: 700 });
export const archived = style({ display: "grid", gap: 8, paddingBlockStart: 10, borderBlockStart: "1px solid #E8E8E6" });
export const archivedList = style({ listStyle: "none", display: "grid", gap: 4, maxBlockSize: 160, overflow: "auto", margin: 0, padding: 0 });
export const archivedRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, lineHeight: "17px" });
export const status = style({ gridColumn: "1 / -1", minBlockSize: 20, color: "#777777", fontSize: 9 });
export { srOnly };

globalStyle(`${links} path`, { stroke: "#B6B6B4", strokeWidth: 1.15, fill: "none" });
globalStyle(`${workspace} textarea`, { resize: "vertical" });
