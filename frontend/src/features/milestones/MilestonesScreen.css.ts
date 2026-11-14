import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../design-system/visual/contract.css";
import { text } from "../../design-system/visual/typography.css";
import { duration, easing, reduced } from "../../design-system/visual/motion.css";

const reveal = keyframes({ from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } });
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const entrance = { animation: `${reveal} ${duration.traversal} ${easing.standard}`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: `${fade} ${reduced.duration} ${easing.standard}` } } };

export const header = style({ flexWrap: "wrap", alignItems: "center", minBlockSize: 56 });
export const toolbar = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, minWidth: 0 });
export const rangeLabel = style({ ...text.metadata, color: vars.color.textSecondary, marginInlineEnd: "auto", fontVariantNumeric: "tabular-nums" });
export const viewport = style({
  position: "relative", overflowX: "auto", overflowY: "hidden", minWidth: 0,
  borderBlockStart: `1px solid ${vars.color.borderHairline}`, overscrollBehavior: "contain",
  overflowAnchor: "none", touchAction: "pan-x", cursor: "grab", scrollbarWidth: "none",
  selectors: { "&::-webkit-scrollbar": { display: "none" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
    '&[data-dragging="true"]': { cursor: "grabbing", userSelect: "none" } },
});
export const canvas = style({ position: "relative", minHeight: 264, ...entrance });
export const month = style({ position: "absolute", top: 28, ...text.metadata, color: vars.color.textSecondary,
  textAlign: "center", boxSizing: "border-box", pointerEvents: "none", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" });
export const year = style({ position: "absolute", bottom: "calc(100% + 2px)", insetInline: 0, fontSize: 10, color: vars.color.textTertiary });
export const tick = style({ position: "absolute", top: 83, height: 12, width: 1, background: vars.color.borderHairline, pointerEvents: "none" });
export const baseline = style({ position: "absolute", top: 95, height: 2, background: vars.color.borderStrong, pointerEvents: "none" });
export const progress = style([baseline, { background: vars.color.accent, opacity: 0.4 }]);
export const today = style({ position: "absolute", top: 66, height: 44, borderInlineStart: `2px solid ${vars.color.accent}`,
  color: vars.color.accent, pointerEvents: "none", zIndex: 2 });
export const todayLabel = style({ position: "absolute", bottom: "100%", left: 6, whiteSpace: "nowrap", ...text.metadata, fontSize: 11, fontWeight: 600 });
export const connectors = style({ position: "absolute", inset: 0, pointerEvents: "none", color: vars.color.borderStrong });
export const marker = style({ position: "absolute", top: 76, width: 40, height: 40, padding: 0,
  border: 0, background: "transparent", boxShadow: "none", display: "grid", placeItems: "center", zIndex: 3,
  color: vars.color.textSecondary,
  selectors: { "&:hover": { color: vars.color.accent, background: "transparent", borderColor: "transparent" },
    '&[aria-pressed="true"]': { color: vars.color.accent },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -4 } } });
export const dot = style({ width: 7, height: 7, border: "2px solid currentColor", borderRadius: "50%", background: vars.color.canvas,
  transition: `transform ${duration.popover} ${easing.standard}, background-color ${duration.state} ${easing.standard}`,
  selectors: { [`${marker}:hover &`]: { transform: "scale(1.2)" },
    [`${marker}[aria-pressed="true"] &`]: { background: vars.color.accent, transform: "scale(1.2)" } },
  "@media": { "(prefers-reduced-motion: reduce)": { transform: "none", selectors: { [`${marker}:hover &`]: { transform: "none" }, [`${marker}[aria-pressed="true"] &`]: { transform: "none" } } } } });
export const callout = style({ position: "absolute", display: "flex", alignItems: "center", gap: 8,
  width: 168, height: 44, boxSizing: "border-box", padding: "8px 10px", textAlign: "left",
  border: `1px solid ${vars.color.borderHairline}`, borderRadius: vars.radius.control,
  background: vars.color.canvas, color: vars.color.textPrimary, ...text.metadata,
  transition: `background-color ${duration.inspectorState} ${easing.standard}, border-color ${duration.inspectorState} ${easing.standard}`,
  selectors: { "&:hover": { background: vars.color.surfaceHover, borderColor: vars.color.borderStrong },
    '&[aria-pressed="true"]': { borderColor: vars.color.accent, background: vars.color.accentSoft },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 } } });
export const labelTitle = style({ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 });
export const labelDate = style({ color: vars.color.textSecondary, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", flexShrink: 0 });
export const moreCount = style({ flexShrink: 0, color: vars.color.accent, fontSize: 11 });
export const detail = style({ maxHeight: 280, overflowY: "auto", minWidth: 0, boxSizing: "border-box",
  borderBlockStart: `1px solid ${vars.color.borderHairline}`, paddingBlock: 20, ...entrance });
export const detailContent = style({ display: "grid", gap: 12, minWidth: 0 });
export const detailHeader = style({ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, minWidth: 0 });
export const title = style({ ...text.objectTitle, margin: 0, overflowWrap: "anywhere" });
export const facts = style({ ...text.metadata, display: "flex", flexWrap: "wrap", gap: 12, color: vars.color.textSecondary });
export const description = style({ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: vars.color.textPrimary });
export const actions = style({ display: "flex", flexWrap: "wrap", gap: 8 });
export const sibling = style({ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "left" });
export const error = style({ color: vars.color.danger, margin: 0 });
export const form = style({ display: "contents" });
export const fields = style({ display: "grid", gap: 16, minWidth: 0 });
export const field = style({ display: "grid", gap: 8, minWidth: 0, color: vars.color.textPrimary, fontSize: 14 });
export const input = style({ width: "100%", minWidth: 0, boxSizing: "border-box", font: "inherit",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 } } });
export const textarea = style([input, { resize: "vertical", minHeight: 112 }]);
export const check = style({ display: "flex", alignItems: "center", gap: 8 });
export const hint = style({ ...text.metadata, color: vars.color.textSecondary });
export const libraryList = style({ display: "grid", gap: 4, padding: 0, margin: 0, listStyle: "none" });
export const libraryButton = style({ display: "flex", flexDirection: "column", alignItems: "start", gap: 4, width: "100%", textAlign: "left",
  padding: "10px 12px", background: "transparent", border: "1px solid transparent", color: vars.color.textPrimary,
  overflowWrap: "anywhere", whiteSpace: "normal", selectors: { "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -2 } } });
export const deletedRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBlock: 8, minWidth: 0 });
export const libraryCopy = style({ minWidth: 0, overflowWrap: "anywhere" });
export const jump = style({ display: "flex", alignItems: "end", flexWrap: "wrap", gap: 8, minWidth: 0 });
