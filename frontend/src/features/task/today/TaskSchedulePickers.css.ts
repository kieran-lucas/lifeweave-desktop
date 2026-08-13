import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { vars } from "../../../design-system/visual/contract.css";
import { duration, easing } from "../../../design-system/visual/motion.css";

const enter = keyframes({
  from: { opacity: 0, transform: "translateY(-9px) scale(.975)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const field = style({
  position: "relative",
  display: "grid",
  gridTemplateRows: "14px 52px",
  alignContent: "start",
  gap: 8,
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: 0,
  background: "transparent",
});

export const label = style({
  color: "#70706D",
  fontSize: 11,
  lineHeight: "14px",
  fontWeight: 650,
});

export const dateField = style({});
export const trigger = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  inlineSize: "100%",
  blockSize: 52,
  boxSizing: "border-box",
  minInlineSize: 0,
  padding: "11px 12px 11px 40px",
  border: "1px solid #CBCBC8",
  borderRadius: 11,
  background: "#FCFCFD",
  color: "#171717",
  fontSize: 13,
  lineHeight: "20px",
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
  textAlign: "start",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": { borderColor: "#8D8D89", background: "#FFFFFF" },
    "&:active:not(:disabled)": { transform: "translateY(1px)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
    "&[aria-expanded=true]": { borderColor: "#111111", background: "#FFFFFF", boxShadow: "0 0 0 3px rgb(17 17 17 / .07)" },
    "&:disabled": { cursor: "not-allowed", opacity: .48 },
  },
});

export const detailDateField = style({
  padding: 0,
  background: "transparent",
});

export const dateTrigger = style({
  paddingInlineEnd: 10,
});
export const triggerGlyph = style({
  position: "absolute",
  insetInlineStart: 12,
  insetBlockStart: 17,
  display: "block",
  color: "#30302E",
  pointerEvents: "none",
});
globalStyle(`${dateTrigger} > span`, { display: "flex", minInlineSize: 0, alignItems: "baseline", justifyContent: "space-between", gap: 8, inlineSize: "100%" });
globalStyle(`${dateTrigger} strong`, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 760 });
globalStyle(`${dateTrigger} small`, { color: "#777777", fontSize: 10, fontWeight: 680, fontVariantNumeric: "tabular-nums" });

export const datePopover = style({
  position: "absolute",
  zIndex: 70,
  insetBlockStart: "calc(100% + 8px)",
  insetInlineStart: 0,
  inlineSize: 308,
  boxSizing: "border-box",
  padding: 10,
  border: "1px solid #171717",
  borderRadius: 13,
  background: "#FFFFFF",
  color: "#171717",
  boxShadow: "0 18px 48px rgb(0 0 0 / .18), 0 3px 10px rgb(0 0 0 / .07)",
  animation: `${enter} ${duration.popover} ${easing.standard} both`,
  transformOrigin: "top left",
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
globalStyle(`${detailDateField} > ${datePopover}`, { insetBlockStart: "auto", insetBlockEnd: "calc(100% + 8px)", transformOrigin: "bottom left" });
export const calendarHeader = style({ display: "grid", gridTemplateColumns: "32px 1fr 32px", alignItems: "center", gap: 7, paddingBlockEnd: 9 });
globalStyle(`${calendarHeader} strong`, { textAlign: "center", fontSize: 13, lineHeight: "18px", fontWeight: 780, letterSpacing: "-.01em" });
globalStyle(`${calendarHeader} button`, { inlineSize: 32, blockSize: 32, display: "grid", placeItems: "center", padding: 0, border: "1px solid #D5D7DA", borderRadius: 9, background: "#F7F8FA", color: "#171717", fontSize: 21, lineHeight: 1, cursor: "pointer" });
globalStyle(`${calendarHeader} button:hover`, { borderColor: "#111111", background: "#111111", color: "#FFFFFF" });
globalStyle(`${calendarHeader} button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });
export const weekdayRow = style({ display: "grid", gridTemplateColumns: "repeat(7,1fr)", paddingBlock: "4px 6px", color: "#7C7C7C", fontSize: 9, lineHeight: "12px", fontWeight: 760, textAlign: "center", textTransform: "uppercase" });
export const dayGrid = style({ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, padding: 4, border: "1px solid #DDDFE2", borderRadius: 10, background: "#F7F8FA" });
globalStyle(`${dayGrid} > [role="row"]`, { display: "contents" });
globalStyle(`${dayGrid} button`, { position: "relative", inlineSize: "100%", aspectRatio: "1", display: "grid", placeItems: "center", padding: 0, border: "1px solid transparent", borderRadius: 8, background: "transparent", color: "#202020", fontSize: 11, lineHeight: 1, fontWeight: 650, fontVariantNumeric: "tabular-nums", cursor: "pointer" });
globalStyle(`${dayGrid} button:hover`, { borderColor: "#AAAAA6", background: "#FFFFFF", color: "#111111" });
globalStyle(`${dayGrid} button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 1 });
globalStyle(`${dayGrid} button[data-outside]`, { color: "#8D8D8D", opacity: .48 });
globalStyle(`${dayGrid} button[data-today]::after`, { content: "", position: "absolute", insetBlockEnd: 4, insetInlineStart: "calc(50% - 2px)", inlineSize: 4, blockSize: 4, borderRadius: vars.radius.full, background: "#111111" });
globalStyle(`${dayGrid} button[aria-selected="true"]`, { borderColor: "#111111", background: "#111111", color: "#FFFFFF", fontWeight: 820, boxShadow: "0 2px 7px rgb(0 0 0 / .20)" });
globalStyle(`${dayGrid} button[aria-selected="true"]::after`, { background: "#FFFFFF" });
export const calendarFooter = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 2px 0" });
globalStyle(`${calendarFooter} > span`, { overflow: "hidden", color: "#777777", fontSize: 9, lineHeight: "13px", fontWeight: 620, textOverflow: "ellipsis", whiteSpace: "nowrap" });
export const calendarFooterActions = style({ display: "flex", alignItems: "center", gap: 5 });
globalStyle(`${calendarFooterActions} > button`, { minBlockSize: 30, paddingInline: 11, border: "1px solid #111111", borderRadius: 9, background: "#FFFFFF", color: "#111111", fontSize: 10, fontWeight: 780, cursor: "pointer" });
globalStyle(`${calendarFooterActions} > button:hover`, { background: "#111111", color: "#FFFFFF" });
globalStyle(`${calendarFooterActions} > button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });

export const timePopover = style({
  position: "absolute",
  zIndex: 60,
  insetBlockStart: "calc(100% + 8px)",
  insetInlineStart: 0,
  inlineSize: 272,
  padding: 13,
  border: "1px solid #171717",
  borderRadius: 16,
  background: "#FFFFFF",
  color: "#171717",
  boxShadow: "0 2px 5px rgb(0 0 0 / .09), 0 18px 46px rgb(0 0 0 / .18), 0 42px 88px rgb(0 0 0 / .10)",
  animation: `${enter} ${duration.inspector} ${easing.standard} both`,
  transformOrigin: "top left",
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const timeHeader = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "2px 3px 9px" });
globalStyle(`${timeHeader} > span`, { color: "#777777", fontSize: 9, lineHeight: "12px", fontWeight: 760, letterSpacing: ".08em", textTransform: "uppercase" });
globalStyle(`${timeHeader} > strong`, { color: "#111111", fontSize: 15, lineHeight: "20px", fontWeight: 820, fontVariantNumeric: "tabular-nums" });

export const wheels = style({
  display: "grid",
  gridTemplateColumns: "1fr 14px 1fr",
  alignItems: "end",
  gap: 5,
  padding: "10px 9px",
  border: "1px solid #CECECA",
  borderRadius: 13,
  background: "#F1F1EE",
  boxShadow: "inset 0 1px 0 rgb(255 255 255 / .95)",
});
export const wheelGroup = style({ display: "grid", gap: 5, minInlineSize: 0 });
globalStyle(`${wheelGroup} > span`, { color: "#777777", fontSize: 9, lineHeight: "12px", fontWeight: 760, letterSpacing: ".08em", textAlign: "center", textTransform: "uppercase" });
export const timeColon = style({ alignSelf: "center", paddingBlockStart: 17, color: "#111111", fontSize: 18, lineHeight: "36px", fontWeight: 820, textAlign: "center" });

export const wheelFrame = style({
  position: "relative",
  blockSize: 200,
  overflow: "hidden",
  border: "1px solid #BEBEB9",
  borderRadius: 11,
  background: "#FFFFFF",
  boxShadow: "inset 0 1px 3px rgb(0 0 0 / .07), 0 1px 0 rgb(255 255 255 / .9)",
  contain: "layout paint",
});
export const lockSlot = style({
  position: "absolute",
  zIndex: 2,
  insetInline: 4,
  insetBlockStart: 80,
  blockSize: 40,
  borderRadius: 9,
  background: "#111111",
  boxShadow: "inset 0 1px 0 rgb(255 255 255 / .10), 0 3px 9px rgb(0 0 0 / .18)",
  pointerEvents: "none",
});
export const wheel = style({
  position: "relative",
  zIndex: 3,
  blockSize: "100%",
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollSnapType: "y mandatory",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  paddingBlock: 80,
  scrollPaddingBlock: 80,
  selectors: {
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: -3 },
  },
});
export const wheelOption = style({
  display: "grid",
  placeItems: "center",
  inlineSize: "100%",
  blockSize: 40,
  padding: 0,
  border: 0,
  scrollSnapAlign: "center",
  scrollSnapStop: "always",
  background: "transparent",
  color: "#696966",
  fontSize: 15,
  lineHeight: "20px",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums lining-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
  letterSpacing: ".015em",
  cursor: "grab",
  transform: "none",
  transition: `color ${duration.inspectorState} ${easing.standard}, font-weight ${duration.inspectorState} ${easing.standard}`,
  selectors: {
    "&[aria-selected=true]": { color: "#FFFFFF", fontWeight: 780, transform: "none" },
    "&:hover": { transform: "none" },
    "&:active": { cursor: "grabbing", transform: "none" },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});
export const timeFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  marginBlockStart: 9,
});
globalStyle(`${timeFooter} > span`, { marginInlineEnd: "auto", color: "#777777", fontSize: 9, lineHeight: "12px", fontWeight: 620 });
globalStyle(`${timeFooter} > button`, {
  minBlockSize: 32,
  paddingInline: 13,
  border: "1px solid #111111",
  borderRadius: vars.radius.control,
  background: "#111111",
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 780,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
});
globalStyle(`${timeFooter} > button:hover`, { background: "#2A2A2A" });
globalStyle(`${timeFooter} > button:active`, { transform: "scale(.96)" });
globalStyle(`${timeFooter} > button:focus-visible`, { outline: "2px solid #111111", outlineOffset: 2 });
