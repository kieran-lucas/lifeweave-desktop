import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { vars } from "../../../design-system/visual/contract.css";
import { duration, easing } from "../../../design-system/visual/motion.css";

const enter = keyframes({
  from: { opacity: 0, transform: "translateY(-6px) scale(.985)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const field = style({
  position: "relative",
  display: "grid",
  gridTemplateRows: "12px 40px",
  alignContent: "start",
  gap: 5,
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "10px 11px 11px",
  background: vars.color.surfaceRaised,
});

export const label = style({
  color: vars.color.textTertiary,
  fontSize: 9,
  lineHeight: "12px",
  fontWeight: 760,
  letterSpacing: ".09em",
  textTransform: "uppercase",
});

export const trigger = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  inlineSize: "100%",
  blockSize: 40,
  boxSizing: "border-box",
  minInlineSize: 0,
  padding: "7px 9px 7px 36px",
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceSubtle,
  color: vars.color.textPrimary,
  fontSize: 15,
  lineHeight: "20px",
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
  textAlign: "start",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&::before": {
      content: "",
      position: "absolute",
      insetInlineStart: 11,
      insetBlockStart: 11,
      inlineSize: 15,
      blockSize: 15,
      boxSizing: "border-box",
      border: `2px solid ${vars.color.accent}`,
      borderRadius: vars.radius.full,
    },
    "&::after": {
      content: "",
      position: "absolute",
      insetInlineStart: 17.5,
      insetBlockStart: 15,
      inlineSize: 2,
      blockSize: 6,
      borderRadius: vars.radius.full,
      background: vars.color.accent,
      transformOrigin: "50% 100%",
      transform: "rotate(-35deg)",
    },
    "&:hover": { background: vars.color.accentSoft, borderColor: vars.color.accent },
    "&:active": { transform: "scale(.985)" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
    "&[aria-expanded=true]": { background: vars.color.accentSoft, borderColor: vars.color.accent },
  },
});

export const timePopover = style({
  position: "absolute",
  zIndex: 60,
  insetBlockStart: "calc(100% + 8px)",
  insetInlineStart: 0,
  inlineSize: 252,
  padding: 11,
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: vars.radius.surface,
  background: vars.color.surfaceRaised,
  color: vars.color.textPrimary,
  boxShadow: vars.elevation.floating,
  animation: `${enter} ${duration.popover} ${easing.standard} both`,
  transformOrigin: "top left",
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const wheels = style({
  display: "grid",
  gridTemplateColumns: "1fr 14px 1fr",
  alignItems: "end",
  gap: 5,
  padding: "8px 7px",
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.surface,
  background: vars.color.surfaceSubtle,
});
export const wheelGroup = style({ display: "grid", gap: 5, minInlineSize: 0 });
globalStyle(`${wheelGroup} > span`, { color: vars.color.textTertiary, fontSize: 9, lineHeight: "12px", fontWeight: 760, letterSpacing: ".08em", textAlign: "center", textTransform: "uppercase" });
export const timeColon = style({ alignSelf: "center", paddingBlockStart: 17, color: vars.color.textPrimary, fontSize: 18, lineHeight: "36px", fontWeight: 820, textAlign: "center" });

export const wheelFrame = style({
  position: "relative",
  blockSize: 180,
  overflow: "hidden",
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceRaised,
  selectors: {
    "&::before": {
      content: "",
      position: "absolute",
      zIndex: 4,
      insetBlockStart: 0,
      insetInline: 0,
      blockSize: 48,
      background: `linear-gradient(to bottom, ${vars.color.surfaceRaised}, transparent)`,
      pointerEvents: "none",
    },
    "&::after": {
      content: "",
      position: "absolute",
      zIndex: 4,
      insetBlockEnd: 0,
      insetInline: 0,
      blockSize: 48,
      background: `linear-gradient(to top, ${vars.color.surfaceRaised}, transparent)`,
      pointerEvents: "none",
    },
  },
});
export const lockSlot = style({
  position: "absolute",
  zIndex: 2,
  insetInline: 4,
  insetBlockStart: 72,
  blockSize: 36,
  borderRadius: vars.radius.small,
  background: vars.color.accent,
  pointerEvents: "none",
});
export const wheel = style({
  position: "relative",
  zIndex: 3,
  blockSize: "100%",
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollSnapType: "y mandatory",
  scrollbarWidth: "none",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  paddingBlock: 72,
  selectors: {
    "&::-webkit-scrollbar": { display: "none" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -3 },
  },
});
export const wheelOption = style({
  display: "grid",
  placeItems: "center",
  inlineSize: "100%",
  blockSize: 36,
  padding: 0,
  border: 0,
  scrollSnapAlign: "center",
  scrollSnapStop: "always",
  background: "transparent",
  color: vars.color.textTertiary,
  fontSize: 12,
  lineHeight: 1,
  fontWeight: 650,
  fontVariantNumeric: "tabular-nums",
  cursor: "grab",
  transition: `opacity ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&[aria-selected=true]": { color: vars.color.textOnAccent, fontSize: 16, fontWeight: 820, transform: "scale(1.03)" },
    "&:active": { cursor: "grabbing" },
  },
});
export const timeFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  marginBlockStart: 9,
});
globalStyle(`${timeFooter} > button`, {
  minBlockSize: 32,
  paddingInline: 13,
  border: `1px solid ${vars.color.accent}`,
  borderRadius: vars.radius.control,
  background: vars.color.accent,
  color: vars.color.textOnAccent,
  fontSize: 11,
  fontWeight: 780,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
});
globalStyle(`${timeFooter} > button:hover`, { background: vars.color.accentMuted });
globalStyle(`${timeFooter} > button:active`, { transform: "scale(.96)" });
globalStyle(`${timeFooter} > button:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 });
