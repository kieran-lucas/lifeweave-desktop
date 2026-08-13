import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { vars } from "../../../design-system/visual/contract.css";
import { duration, easing } from "../../../design-system/visual/motion.css";

const enter = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(.975)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const root = style({ position: "relative", display: "grid", gridTemplateRows: "14px 52px", alignContent: "start", gap: 8, minInlineSize: 0 });
export const label = style({ color: "#70706D", fontSize: 11, lineHeight: "14px", fontWeight: 650 });
export const trigger = style({
  position: "relative",
  inlineSize: "100%",
  minBlockSize: 52,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "20px minmax(0,1fr) 10px",
  alignItems: "center",
  gap: 9,
  padding: "10px 12px",
  border: "1px solid #CBCBC8",
  borderRadius: 11,
  background: "#FCFCFD",
  color: "#222222",
  textAlign: "start",
  cursor: "pointer",
  transition: `border-color ${duration.inspectorState} ${easing.standard}, background-color ${duration.inspectorState} ${easing.standard}, box-shadow ${duration.inspectorState} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": { borderColor: "#8D8D89", background: "#FFFFFF", boxShadow: "0 7px 18px rgb(0 0 0 / .055)" },
    "&:active:not(:disabled)": { transform: "translateY(1px)" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
    "&[aria-expanded=true]": { borderColor: "#111111", background: "#FFFFFF", boxShadow: "0 0 0 3px rgb(17 17 17 / .07)" },
    "&:disabled": { cursor: "not-allowed", opacity: .58 },
  },
});
globalStyle(`${trigger} > strong`, { display: "block", overflow: "hidden", color: "#222222", fontSize: 13, lineHeight: "18px", fontWeight: 620, textOverflow: "ellipsis", whiteSpace: "nowrap" });
export const triggerIcon = style({ display: "grid", placeItems: "center", inlineSize: 20, blockSize: 20, color: "#3A3A38" });
export const chevron = style({ justifySelf: "end", inlineSize: 7, blockSize: 7, borderInlineEnd: "1.5px solid #666666", borderBlockEnd: "1.5px solid #666666", transform: "translateY(-2px) rotate(45deg)" });

export const popover = style({
  position: "absolute",
  zIndex: 70,
  insetInlineStart: 0,
  insetBlockEnd: "calc(100% + 7px)",
  inlineSize: "min(430px, calc(100vw - 64px))",
  boxSizing: "border-box",
  padding: 9,
  border: "1px solid #171717",
  borderRadius: 13,
  background: "#FFFFFF",
  boxShadow: "0 2px 5px rgb(0 0 0 / .09), 0 18px 46px rgb(0 0 0 / .18), 0 42px 88px rgb(0 0 0 / .10)",
  animation: `${enter} ${duration.inspector} ${easing.standard} both`,
  transformOrigin: "bottom left",
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
globalStyle(`${popover} > header`, { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "5px 6px 9px" });
globalStyle(`${popover} > header strong`, { color: "#252525", fontSize: 12, lineHeight: "16px", fontWeight: 760 });
globalStyle(`${popover} > header span`, { color: "#898989", fontSize: 9, lineHeight: "12px", fontWeight: 620 });
export const optionGrid = style({ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 4, maxBlockSize: 276, overflowY: "auto", "@media": { "(max-width: 520px)": { gridTemplateColumns: "1fr" } } });
export const option = style({
  minInlineSize: 0,
  minBlockSize: 44,
  display: "grid",
  gridTemplateColumns: "26px minmax(0,1fr) 14px",
  alignItems: "center",
  gap: 7,
  padding: "6px 7px",
  border: "1px solid transparent",
  borderRadius: 9,
  background: "transparent",
  color: "#3A3A3A",
  fontSize: 10,
  lineHeight: "14px",
  fontWeight: 680,
  textAlign: "start",
  cursor: "pointer",
  transition: `background-color ${duration.inspectorState} ${easing.standard}, border-color ${duration.inspectorState} ${easing.standard}, color ${duration.inspectorState} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F5F6F8", borderColor: "#D6D8DB" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -1 },
    "&[aria-selected=true]": { background: "#111111", borderColor: "#111111", color: "#FFFFFF" },
  },
});
globalStyle(`${option} > span:nth-child(2)`, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
export const optionIcon = style({ display: "grid", placeItems: "center", inlineSize: 26, blockSize: 26, border: "1px solid #D9DBDE", borderRadius: 7, background: "#F7F8FA", color: "#292929" });
globalStyle(`${option}[aria-selected="true"] ${optionIcon}`, { borderColor: "#5A5A5A", background: "#2B2B2B", color: "#FFFFFF" });
export const check = style({ visibility: "hidden", color: "currentColor", fontSize: 12, fontWeight: 850 });
globalStyle(`${option}[aria-selected="true"] ${check}`, { visibility: "visible" });
