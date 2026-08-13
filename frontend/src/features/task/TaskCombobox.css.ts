import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { duration, easing } from "../../design-system/visual/motion.css";

const listEnter = keyframes({
  from: { opacity: 0, transform: "translateY(-3px) scale(.985)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const root = style({
  position: "relative",
  gap: 8,
  minInlineSize: 0,
  selectors: {
    "&::after": {
      content: "",
      position: "absolute",
      zIndex: 2,
      insetInlineEnd: 16,
      insetBlockStart: 44,
      inlineSize: 6,
      blockSize: 6,
      borderInlineEnd: "1.5px solid #666663",
      borderBlockEnd: "1.5px solid #666663",
      transform: "rotate(45deg)",
      pointerEvents: "none",
    },
  },
});

globalStyle(`${root} > label`, {
  color: "#70706D",
  fontSize: 11,
  lineHeight: "14px",
  fontWeight: 650,
});

export const archived = style({
  position: "absolute",
  insetBlockStart: 0,
  insetInlineEnd: 0,
  color: "#777773",
  fontSize: 9,
  lineHeight: "14px",
  fontWeight: 650,
});

export const input = style({
  inlineSize: "100%",
  minInlineSize: 0,
  blockSize: 52,
  minBlockSize: 52,
  boxSizing: "border-box",
  padding: "11px 68px 11px 12px",
  overflow: "hidden",
  border: "1px solid #CBCBC8",
  borderRadius: 11,
  outline: 0,
  background: "#FCFCFD",
  color: "#222222",
  font: "inherit",
  fontSize: 12,
  lineHeight: "18px",
  fontWeight: 620,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: `border-color ${duration.inspectorState} ${easing.standard}, background-color ${duration.inspectorState} ${easing.standard}, box-shadow ${duration.inspectorState} ${easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": { borderColor: "#8D8D89", background: "#FFFFFF" },
    "&:focus": { borderColor: "#111111", background: "#FFFFFF", boxShadow: "0 0 0 3px rgb(17 17 17 / .07)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
    "&:disabled": { cursor: "not-allowed", opacity: .52 },
    "&::placeholder": { color: "#858585", opacity: 1 },
  },
});

export const clear = style({
  position: "absolute",
  insetBlockStart: 36,
  insetInlineEnd: 34,
  zIndex: 4,
  inlineSize: 24,
  minInlineSize: 24,
  blockSize: 24,
  minBlockSize: 24,
  padding: 0,
  overflow: "hidden",
  border: 0,
  borderRadius: 7,
  background: "transparent",
  color: "transparent",
  fontSize: 0,
  cursor: "pointer",
  transition: `background-color ${duration.inspectorState} ${easing.standard}`,
  selectors: {
    "&::before": {
      content: "",
      position: "absolute",
      insetInlineStart: 8,
      insetBlockStart: 11,
      inlineSize: 8,
      blockSize: 1,
      background: "#666663",
      transform: "rotate(45deg)",
    },
    "&::after": {
      content: "",
      position: "absolute",
      insetInlineStart: 8,
      insetBlockStart: 11,
      inlineSize: 8,
      blockSize: 1,
      background: "#666663",
      transform: "rotate(-45deg)",
    },
    "&:hover": { background: "#E8E8E5" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 1 },
  },
});

export const popover = style({
  position: "absolute",
  insetInline: 0,
  insetBlockStart: "calc(100% + 7px)",
  zIndex: "var(--layer-overlay)",
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: 7,
  border: "1px solid #1C1C1C",
  borderRadius: 13,
  background: "#FFFFFF",
  boxShadow: "0 3px 8px rgb(0 0 0 / .10), 0 20px 54px rgb(0 0 0 / .18)",
  animation: `${listEnter} ${duration.inspector} ${easing.standard} both`,
  transformOrigin: "top left",
  "@media": {
    "screen and (max-width: 65rem)": {
      insetBlockStart: "auto",
      insetBlockEnd: "calc(100% + 7px)",
      transformOrigin: "bottom left",
    },
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const treeHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  minBlockSize: 38,
  padding: "3px 5px 8px",
  borderBlockEnd: "1px solid #E2E2DF",
});

globalStyle(`${treeHeader} > button`, {
  display: "grid",
  placeItems: "center",
  inlineSize: 30,
  minInlineSize: 30,
  blockSize: 30,
  padding: 0,
  border: "1px solid #D4D4D1",
  borderRadius: 8,
  background: "#F7F7F5",
  color: "#222222",
  fontSize: 15,
  cursor: "pointer",
});
globalStyle(`${treeHeader} > button:hover`, { borderColor: "#9A9A96", background: "#EEEEEB" });
globalStyle(`${treeHeader} > button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });
globalStyle(`${treeHeader} > strong`, {
  minInlineSize: 0,
  overflow: "hidden",
  color: "#1E1E1E",
  fontSize: 11,
  lineHeight: "15px",
  fontWeight: 730,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const listbox = style({
  inlineSize: "100%",
  minInlineSize: 0,
  maxBlockSize: "15rem",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  margin: 0,
  padding: 0,
  overflowY: "auto",
  listStyle: "none",
});

export const option = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  minBlockSize: 40,
  padding: "8px 10px",
  border: "1px solid transparent",
  borderRadius: 8,
  color: "#242424",
  cursor: "pointer",
  minInlineSize: 0,
  transition: `background-color ${duration.inspectorState} ${easing.standard}, border-color ${duration.inspectorState} ${easing.standard}, color ${duration.inspectorState} ${easing.standard}`,
  selectors: {
    "&[data-has-children]": { paddingInlineEnd: 32 },
    "&[data-has-children]::after": {
      content: "",
      position: "absolute",
      insetInlineEnd: 13,
      insetBlockStart: "calc(50% - 4px)",
      inlineSize: 6,
      blockSize: 6,
      borderInlineEnd: "1.5px solid currentColor",
      borderBlockEnd: "1.5px solid currentColor",
      transform: "rotate(-45deg)",
    },
    "&[data-active=true]": { borderColor: "#C4C7CA", background: "#F5F6F8" },
    "&[aria-selected=true]": { borderColor: "#111111", background: "#111111", color: "#FFFFFF" },
    "&:hover": { borderColor: "#D3D5D8", background: "#F5F6F8" },
    "&[aria-selected=true]:hover": { borderColor: "#111111", background: "#292929" },
  },
});

export const optionTitle = style({
  minInlineSize: 0,
  overflow: "hidden",
  fontSize: 11,
  lineHeight: "15px",
  fontWeight: 660,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const optionMeta = style({
  maxInlineSize: 130,
  overflow: "hidden",
  color: "#7A7A76",
  fontSize: 9,
  lineHeight: "13px",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
globalStyle(`${option}[aria-selected="true"] ${optionMeta}`, { color: "#D3D3D3" });

export const empty = style({ padding: "10px", color: "#777773", fontSize: 10, lineHeight: "14px" });

globalStyle(`${clear}:focus-visible, ${treeHeader} > button:focus-visible`, {
  outlineColor: "CanvasText",
});
