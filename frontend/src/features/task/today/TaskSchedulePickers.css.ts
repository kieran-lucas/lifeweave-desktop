import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { duration, easing } from "../../../design-system/visual/motion.css";

const enter = keyframes({
  from: { opacity: 0, transform: "translateY(-5px) scale(.985)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const field = style({
  position: "relative",
  display: "grid",
  gap: 4,
  minInlineSize: 0,
  padding: "9px 11px",
  background: "#FFFFFF",
});

export const label = style({
  color: "#777777",
  fontSize: 8,
  lineHeight: "11px",
  fontWeight: 760,
  letterSpacing: ".08em",
  textTransform: "uppercase",
});

export const trigger = style({
  minInlineSize: 0,
  minBlockSize: 25,
  padding: "2px 4px",
  border: "1px solid transparent",
  borderRadius: 7,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 12,
  fontWeight: 680,
  fontVariantNumeric: "tabular-nums",
  textAlign: "start",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "var(--accent-soft)", borderColor: "#C8D7FA" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
    "&[aria-expanded=true]": { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent-muted)" },
  },
});

export const popover = style({
  position: "absolute",
  zIndex: 60,
  insetBlockStart: "calc(100% + 8px)",
  insetInlineStart: 0,
  padding: 10,
  border: "1px solid #C9D5EA",
  borderRadius: 13,
  background: "#FFFFFF",
  color: "#111111",
  inlineSize: 236,
  boxShadow: "0 14px 34px rgba(15, 23, 42, .16)",
  animation: `${enter} ${duration.popover} ${easing.standard} both`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
export const wheels = style({ display: "grid", gridTemplateColumns: "1fr 12px 1fr", alignItems: "end", gap: 3 });
export const wheelGroup = style({
  display: "grid",
  gap: 5,
  minInlineSize: 0,
});
globalStyle(`${wheelGroup} > span`, { color: "#7A8494", fontSize: 8, fontWeight: 750, letterSpacing: ".06em", textAlign: "center", textTransform: "uppercase" });
export const timeColon = style({ alignSelf: "center", paddingBlockStart: 13, color: "#111111", fontSize: 18, fontWeight: 760, textAlign: "center" });
export const wheelFrame = style({ position: "relative", blockSize: 144, overflow: "hidden", borderBlock: "1px solid #E1E6EF", background: "#F8FAFD" });
export const lockSlot = style({
  position: "absolute",
  zIndex: 2,
  insetInline: 0,
  insetBlockStart: 52,
  blockSize: 38,
  borderBlock: "1px solid var(--accent)",
  background: "var(--accent-soft)",
  pointerEvents: "none",
});
export const wheel = style({
  position: "relative",
  zIndex: 3,
  blockSize: "100%",
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollSnapType: "y mandatory",
  scrollBehavior: "smooth",
  scrollbarWidth: "none",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  paddingBlock: 53,
  selectors: { "&::-webkit-scrollbar": { display: "none" }, "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 } },
});
export const wheelOption = style({
  display: "grid",
  placeItems: "center",
  inlineSize: "100%",
  blockSize: 38,
  padding: 0,
  border: 0,
  scrollSnapAlign: "center",
  background: "transparent",
  color: "#697386",
  fontSize: 14,
  fontWeight: 620,
  fontVariantNumeric: "tabular-nums",
  cursor: "grab",
  transition: `opacity ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&[aria-selected=true]": { color: "#111111", fontSize: 17, fontWeight: 780 },
    "&:active": { cursor: "grabbing" },
  },
});
export const timeFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  marginBlockStart: 9,
  paddingBlockStart: 9,
  borderBlockStart: "1px solid #E1E6EF",
});
globalStyle(`${timeFooter} > button`, { minBlockSize: 29, paddingInline: 11, border: "1px solid var(--accent)", borderRadius: 8, background: "var(--accent)", color: "#FFFFFF", fontSize: 10, fontWeight: 720, cursor: "pointer" });
globalStyle(`${timeFooter} > button:hover`, { background: "#1D4ED8", borderColor: "#1D4ED8" });
globalStyle(`${timeFooter} > button:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 1 });
