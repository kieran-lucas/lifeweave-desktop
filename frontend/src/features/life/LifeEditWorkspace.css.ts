import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { focusRing, srOnly } from "../../design-system/primitives/utilities.css";
import { vars } from "../../design-system/visual/contract.css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const workspace = style({
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr)",
  gridTemplateRows: "minmax(0,1fr) auto",
  gap: 8,
  alignItems: "stretch",
  blockSize: "100%",
  minBlockSize: 0,
  minInlineSize: 0,
  selectors: {
    '&[data-editor-open="true"]': { gridTemplateColumns: "minmax(0,1fr) minmax(240px,280px)" },
  },
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
export const positioner = style({ position: "absolute", inlineSize: "var(--life-node-width, 196px)", transform: "translate(var(--life-x),var(--life-y))" });
export const nodeShell = style({ position: "relative" });
const revealActions = keyframes({
  from: { opacity: 0, transform: "translateX(-50%) translateY(-4px) scale(.98)" },
  to: { opacity: 1, transform: "translateX(-50%) translateY(0) scale(1)" },
});
const revealActionsAbove = keyframes({
  from: { opacity: 0, transform: "translateX(-50%) translateY(4px) scale(.98)" },
  to: { opacity: 1, transform: "translateX(-50%) translateY(0) scale(1)" },
});
export const nodeActions = style({
  position: "absolute",
  zIndex: 6,
  insetInlineStart: "50%",
  insetBlockStart: "calc(100% + 7px)",
  inlineSize: "max-content",
  minInlineSize: 188,
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
  transform: "translateX(-50%)",
  transformOrigin: "top center",
  animation: `${revealActions} ${duration.popover} ${easing.standard} both`,
  selectors: {
    '&[data-placement="above"]': {
      insetBlockStart: "auto",
      insetBlockEnd: "calc(100% + 7px)",
      transformOrigin: "bottom center",
      animation: `${revealActionsAbove} ${duration.popover} ${easing.standard} both`,
    },
    "&::before": {
      content: "",
      position: "absolute",
      zIndex: -1,
      insetBlockStart: -5,
      insetInlineStart: "calc(50% - 5px)",
      inlineSize: 9,
      blockSize: 9,
      borderBlockStart: `1px solid ${vars.color.borderHairline}`,
      borderInlineStart: `1px solid ${vars.color.borderHairline}`,
      background: vars.color.surfaceRaised,
      transform: "rotate(45deg)",
    },
    '&[data-placement="above"]::before': {
      insetBlockStart: "auto",
      insetBlockEnd: -5,
      borderBlockStart: 0,
      borderInlineStart: 0,
      borderBlockEnd: `1px solid ${vars.color.borderHairline}`,
      borderInlineEnd: `1px solid ${vars.color.borderHairline}`,
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
    minBlockSize: 62,
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
export const compactTitle = style({ display: "block", whiteSpace: "normal", overflowWrap: "anywhere", fontSize: 11, lineHeight: "15px", fontWeight: 680 });
export const compactMeta = style({ display: "block", marginBlockStart: 2, color: "#8B8B8B", fontSize: 8, lineHeight: "11px" });
globalStyle(`${nodeCard}[aria-pressed="true"] ${compactMeta}`, { color: vars.color.textSecondary });

export const inspector = style({
  gridRow: "1",
  display: "grid",
  gap: 12,
  minBlockSize: 0,
  maxBlockSize: "100%",
  overflowY: "auto",
  padding: "4px 2px 24px 18px",
  borderInlineStart: "1px solid #E2E2E2",
  background: "transparent",
});

export const inspectorTitle = style({ margin: 0, color: "#222222", fontSize: 15, lineHeight: "20px", fontWeight: 720, letterSpacing: "-.018em" });
export const instructions = style({ margin: 0, color: "#909090", fontSize: 9, lineHeight: 1.45 });
export const field = style({ display: "grid", gap: 5, color: "#777777", fontSize: 9, lineHeight: "12px", fontWeight: 710, letterSpacing: ".025em" });
export const input = style([
  focusRing,
  {
    inlineSize: "100%",
    minInlineSize: 0,
    minBlockSize: 35,
    boxSizing: "border-box",
    padding: "7px 8px",
    border: "1px solid #D3D3D3",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#222222",
    font: "inherit",
    fontSize: 10,
    letterSpacing: 0,
    selectors: { "&:focus": { borderColor: "#111111" } },
  },
]);

export const actions = style({ display: "flex", gap: 6, flexWrap: "wrap" });

export const button = style({
  minBlockSize: 32,
  paddingInline: 9,
  border: "1px solid #D2D2D2",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#444444",
  fontSize: 9,
  fontWeight: 690,
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": { borderColor: "#AFAFAF", color: "#111111", background: "#F5F5F5" },
    "&:disabled": { opacity: .36, cursor: "default" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
  },
});
export const closeInspector = style([button, { minInlineSize: 32, paddingInline: 7 }]);

export const destructive = style([
  button,
  { color: "#555555", selectors: { "&:hover:not(:disabled)": { borderColor: "#111111", background: "#111111", color: "#FFFFFF" } } },
]);

export const archived = style({ display: "grid", gap: 8, paddingBlockStart: 10, borderBlockStart: "1px solid #E4E4E4" });
export const archivedList = style({ listStyle: "none", display: "grid", gap: 4, maxBlockSize: 160, overflow: "auto", margin: 0, padding: 0 });
export const archivedRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 10 });
export const status = style({ gridColumn: "1 / -1", minBlockSize: 20, color: "#777777", fontSize: 9 });
export { srOnly };

globalStyle(`${links} path`, { stroke: "#B6B6B4", strokeWidth: 1.15, fill: "none" });
globalStyle(`${workspace} textarea`, { resize: "vertical" });
globalStyle(`${inspector} > ${actions}, ${inspector} > section`, { borderBlockStart: "1px solid #E5E5E5", paddingBlockStart: 10 });
