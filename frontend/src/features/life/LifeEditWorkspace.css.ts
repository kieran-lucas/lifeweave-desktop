import { globalStyle, style } from "@vanilla-extract/css";
import { focusRing } from "../../design-system/primitives/utilities.css";

export const workspace = style({
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(230px,280px)",
  gap: 18,
  alignItems: "start",
  minInlineSize: 0,
  "@media": { "(max-width: 820px)": { gridTemplateColumns: "1fr" } },
});

export const canvasViewport = style({
  position: "relative",
  minInlineSize: 0,
  minBlockSize: 500,
  overflow: "auto",
  border: "1px solid #D8D8D8",
  borderRadius: 14,
  backgroundColor: "#FAFAF8",
  backgroundImage: "var(--paint-grain-fine)",
  scrollbarGutter: "stable",
});

export const canvas = style({ position: "relative", minInlineSize: "100%", minBlockSize: 480 });
export const links = style({ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" });
export const positioner = style({ position: "absolute", inlineSize: 164, transform: "translate(var(--life-x),var(--life-y))" });
export const dndOwner = style({ position: "relative" });

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
    cursor: "grab",
    transition: "background-color 130ms ease, color 130ms ease, border-color 130ms ease, transform 100ms ease",
    selectors: {
      "&[aria-pressed=true]": { borderColor: "#111111", backgroundColor: "#111111", color: "#FFFFFF" },
      "&:hover:not([aria-pressed=true])": { borderColor: "#A9A9A6", backgroundColor: "#F4F4F1" },
      "&:active": { cursor: "grabbing", transform: "scale(.985)" },
    },
    "@media": {
      "(forced-colors: active)": {
        selectors: { "&[aria-pressed=true]": { borderColor: "Highlight", background: "Highlight", color: "HighlightText" } },
      },
    },
  },
]);

export const compactTitle = style({ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 11, lineHeight: "15px", fontWeight: 680 });
export const compactMeta = style({ display: "block", marginBlockStart: 2, color: "#8B8B8B", fontSize: 8, lineHeight: "11px" });
globalStyle(`${nodeCard}[aria-pressed="true"] ${compactMeta}`, { color: "rgba(255,255,255,.68)" });

export const dropBefore = style({
  position: "absolute",
  insetInline: 0,
  insetBlockStart: -7,
  blockSize: 10,
  border: 0,
  background: "transparent",
  selectors: { "&[data-over=true]": { background: "#111111" } },
});

export const inspector = style({
  position: "sticky",
  insetBlockStart: 0,
  display: "grid",
  gap: 12,
  maxBlockSize: "calc(100dvh - 184px)",
  overflowY: "auto",
  padding: "4px 2px 24px 18px",
  borderInlineStart: "1px solid #E2E2E2",
  background: "transparent",
  scrollbarGutter: "stable",
  "@media": {
    "(max-width: 820px)": {
      position: "static",
      maxBlockSize: "none",
      overflowY: "visible",
      padding: "18px 0 0",
      borderInlineStart: 0,
      borderBlockStart: "1px solid #E2E2E2",
    },
  },
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

export const destructive = style([
  button,
  { color: "#555555", selectors: { "&:hover:not(:disabled)": { borderColor: "#111111", background: "#111111", color: "#FFFFFF" } } },
]);

export const archived = style({ display: "grid", gap: 8, paddingBlockStart: 10, borderBlockStart: "1px solid #E4E4E4" });
export const archivedList = style({ listStyle: "none", display: "grid", gap: 4, maxBlockSize: 160, overflow: "auto", margin: 0, padding: 0 });
export const archivedRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 10 });
export const status = style({ gridColumn: "1 / -1", minBlockSize: 20, color: "#777777", fontSize: 9 });
export const overlay = style({ inlineSize: 164, padding: 9, border: "2px solid #111111", borderRadius: 10, background: "#FFFFFF", color: "#111111", fontSize: 10, fontWeight: 720, boxShadow: "0 10px 26px rgba(0,0,0,.12)" });
export const preview = style({ stroke: "#111111", strokeWidth: 2, strokeDasharray: "5 4", fill: "none" });

globalStyle(`${links} path`, { stroke: "#B6B6B4", strokeWidth: 1.15, fill: "none" });
globalStyle(`${workspace} textarea`, { resize: "vertical" });
globalStyle(`${inspector} > ${actions}, ${inspector} > section`, { borderBlockStart: "1px solid #E5E5E5", paddingBlockStart: 10 });
