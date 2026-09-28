import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { vars } from "../../../design-system/visual/contract.css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { text } from "../../../design-system/visual/typography.css";

const enter = keyframes({
  from: { opacity: 0, transform: "translateY(-9px) scale(.975)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const field = style({
  position: "relative",
  display: "grid",
  gridTemplateRows: "17px 52px",
  alignContent: "start",
  gap: 8,
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: 0,
  background: "transparent",
});

export const label = style({
  ...text.label,
  color: "#70706D",
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
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
    "&[aria-expanded=true]": { borderColor: vars.color.accentMuted, background: vars.color.surfaceRaised, boxShadow: `0 0 0 3px ${vars.color.accentSoft}` },
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
  maxInlineSize: "calc(100vw - 24px)",
  maxBlockSize: "calc(100vh - 24px)",
  boxSizing: "border-box",
  overflowY: "auto",
  padding: 10,
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: 13,
  background: "#FFFFFF",
  color: "#171717",
  boxShadow: vars.elevation.modal,
  animation: `${enter} ${duration.popover} ${easing.standard} both`,
  transformOrigin: "top left",
  selectors: { '&[data-placement="above"]': { transformOrigin: "bottom left" } },
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
export const calendarHeader = style({ display: "grid", gridTemplateColumns: "32px 1fr 32px", alignItems: "center", gap: 7, paddingBlockEnd: 9 });
globalStyle(`${calendarHeader} strong`, { textAlign: "center", fontSize: 13, lineHeight: "18px", fontWeight: 780, letterSpacing: "-.01em" });
globalStyle(`${calendarHeader} button`, { inlineSize: 32, blockSize: 32, display: "grid", placeItems: "center", padding: 0, border: "1px solid #D5D7DA", borderRadius: 9, background: "#F7F8FA", color: "#171717", fontSize: 21, lineHeight: 1, cursor: "pointer" });
globalStyle(`${calendarHeader} button:hover`, { borderColor: vars.color.accentMuted, background: vars.color.accentSoft, color: vars.color.accent });
globalStyle(`${calendarHeader} button:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 });
export const weekdayRow = style({ display: "grid", gridTemplateColumns: "repeat(7,1fr)", paddingBlock: "4px 6px", color: "#7C7C7C", fontSize: 11, lineHeight: "15px", fontWeight: 760, textAlign: "center", textTransform: "uppercase" });
export const dayGrid = style({ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, padding: 4, border: "1px solid #DDDFE2", borderRadius: 10, background: "#F7F8FA" });
globalStyle(`${dayGrid} > [role="row"]`, { display: "contents" });
globalStyle(`${dayGrid} button`, { position: "relative", inlineSize: "100%", aspectRatio: "1", display: "grid", placeItems: "center", padding: 0, border: "1px solid transparent", borderRadius: 8, background: "transparent", color: "#202020", fontSize: 12.5, lineHeight: 1, fontWeight: 650, fontVariantNumeric: "tabular-nums", cursor: "pointer" });
globalStyle(`${dayGrid} button:hover`, { borderColor: "#AAAAA6", background: "#FFFFFF", color: "#111111" });
globalStyle(`${dayGrid} button:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 1 });
globalStyle(`${dayGrid} button[data-outside]`, { color: "#8D8D8D", opacity: .48 });
globalStyle(`${dayGrid} button[data-today]::after`, { content: "", position: "absolute", insetBlockEnd: 4, insetInlineStart: "calc(50% - 2px)", inlineSize: 4, blockSize: 4, borderRadius: vars.radius.full, background: vars.color.accent });
globalStyle(`${dayGrid} button[aria-selected="true"]`, { borderColor: vars.color.accentMuted, background: vars.color.accentSoft, color: vars.color.textPrimary, fontWeight: 820 });
globalStyle(`${dayGrid} button[aria-selected="true"]::after`, { background: vars.color.accent });
export const calendarFooter = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 2px 0" });
globalStyle(`${calendarFooter} > span`, { overflow: "hidden", color: "#777777", fontSize: 11.5, lineHeight: "16px", fontWeight: 620, textOverflow: "ellipsis", whiteSpace: "nowrap" });
export const calendarFooterActions = style({ display: "flex", alignItems: "center", gap: 5 });
globalStyle(`${calendarFooterActions} > button`, { minBlockSize: 30, paddingInline: 11, border: `1px solid ${vars.color.borderStrong}`, borderRadius: 9, background: vars.color.surfaceRaised, color: vars.color.textPrimary, fontSize: 12.5, fontWeight: 780, cursor: "pointer" });
globalStyle(`${calendarFooterActions} > button:hover`, { borderColor: vars.color.accentMuted, background: vars.color.accentSoft, color: vars.color.accent });
globalStyle(`${calendarFooterActions} > button:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 });

export const timePopover = style({
  position: "absolute",
  zIndex: 60,
  insetBlockStart: "calc(100% + 8px)",
  insetInlineStart: 0,
  inlineSize: 272,
  maxInlineSize: "calc(100vw - 24px)",
  maxBlockSize: "calc(100vh - 24px)",
  boxSizing: "border-box",
  overflowY: "auto",
  padding: 13,
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: 16,
  background: vars.color.surfaceRaised,
  color: vars.color.textPrimary,
  boxShadow: vars.elevation.modal,
  animation: `${enter} ${duration.inspector} ${easing.standard} both`,
  transformOrigin: "top left",
  selectors: { '&[data-placement="above"]': { transformOrigin: "bottom left" } },
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const timeHeader = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "2px 3px 9px" });
globalStyle(`${timeHeader} > span`, { color: vars.color.textTertiary, fontSize: 11, lineHeight: "15px", fontWeight: 760, letterSpacing: ".08em", textTransform: "uppercase" });
globalStyle(`${timeHeader} > strong`, { color: vars.color.textPrimary, fontSize: 15, lineHeight: "20px", fontWeight: 820, fontVariantNumeric: "tabular-nums" });

export const wheels = style({
  display: "grid",
  gridTemplateColumns: "1fr 14px 1fr",
  alignItems: "end",
  gap: 5,
  padding: "10px 9px",
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceSubtle,
});
export const wheelGroup = style({ display: "grid", gap: 5, minInlineSize: 0 });
globalStyle(`${wheelGroup} > span`, { color: vars.color.textTertiary, fontSize: 11, lineHeight: "15px", fontWeight: 760, letterSpacing: ".08em", textAlign: "center", textTransform: "uppercase" });
export const timeColon = style({ alignSelf: "center", paddingBlockStart: 17, color: vars.color.textPrimary, fontSize: 18, lineHeight: "36px", fontWeight: 820, textAlign: "center" });

export const wheelFrame = style({
  position: "relative",
  blockSize: 203,
  overflow: "hidden",
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceRaised,
  contain: "layout paint",
});
export const lockSlot = style({
  borderRadius: vars.radius.small,
  background: vars.color.accent,
  pointerEvents: "none",
});
export const wheel = style({
  blockSize: "100%",
  cursor: 'url("/cursors/grab-cursor.cur"), grab',
  touchAction: "none",
  overscrollBehavior: "contain",
});
globalStyle(`${wheel} [data-rwp]`, { cursor: 'url("/cursors/grab-cursor.cur"), grab', touchAction: "none" });
globalStyle(`${wheel} [data-rwp]:active`, { cursor: 'url("/cursors/grabbing-cursor.cur"), grabbing' });
globalStyle(`${wheel} [data-rwp]:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -3 });
globalStyle(`${wheel} [data-rwp-highlight-wrapper]`, { insetInlineStart: 4, inlineSize: "calc(100% - 8px)" });
globalStyle(`${wheel} [data-rwp-option]`, { fontSize: 15 });
export const wheelOption = style({
  color: vars.color.textTertiary,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums lining-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
  letterSpacing: ".015em",
});
export const wheelSelected = style({
  color: vars.color.textOnAccent,
  fontSize: 15,
  fontWeight: 780,
  fontVariantNumeric: "tabular-nums lining-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
  letterSpacing: ".015em",
});
export const timeFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  marginBlockStart: 9,
});
globalStyle(`${timeFooter} > span`, { marginInlineEnd: "auto", color: "#777777", fontSize: 11.5, lineHeight: "16px", fontWeight: 620 });
globalStyle(`${timeFooter} > button`, {
  minBlockSize: 32,
  paddingInline: 13,
  border: `1px solid ${vars.color.accent}`,
  borderRadius: vars.radius.control,
  background: vars.color.accent,
  color: "#FFFFFF",
  fontSize: 13.5,
  fontWeight: 780,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
});
globalStyle(`${timeFooter} > button:hover`, { background: vars.color.accentMuted });
globalStyle(`${timeFooter} > button:active`, { transform: "scale(.96)" });
globalStyle(`${timeFooter} > button:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 });
