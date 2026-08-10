import { style } from "@vanilla-extract/css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

export const anchor = style({ position: "relative", display: "grid", placeItems: "center" });
export const trigger = style([focusRing, { width: 40, height: 40, padding: 0, minBlockSize: 0, display: "grid", placeItems: "center", border: 0, borderRadius: "var(--radius-full)", background: "transparent", cursor: "pointer", selectors: { "&:disabled": { cursor: "not-allowed", opacity: 0.42 } } }]);

/** White paper, solid blue state, semantic red only for below-target. No translucent fills. */
export const ring = style({
  width: 22,
  height: 22,
  border: "2px solid var(--text-muted)",
  borderRadius: "var(--radius-full)",
  backgroundColor: "#FFFFFF",
  transition: `background-color ${duration.check} ${easing.standard}, border-color ${duration.check} ${easing.standard}`,
  selectors: {
    [`${trigger}[data-state=none] &`]: { backgroundColor: "#FFFFFF", borderStyle: "double" },
    [`${trigger}[data-state=below] &`]: { backgroundColor: "#FFFFFF", borderColor: "var(--danger)" },
    [`${trigger}[data-state=met] &`]: { backgroundColor: "var(--accent)", borderColor: "var(--accent)" },
    [`${trigger}[data-state=excellent] &`]: { backgroundColor: "var(--accent)", borderColor: "var(--accent)", boxShadow: "inset 0 0 0 4px #FFFFFF" },
  },
});

export const fan = style({
  position: "fixed",
  width: 260,
  height: 160,
  zIndex: "var(--layer-overlay)",
  pointerEvents: "none",
  border: "1px solid var(--accent)",
  borderRadius: "var(--radius-floating)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  selectors: { "&[data-compact=true]": { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, width: "calc(100vw - 24px)", maxWidth: 240, height: "auto", padding: 8 } },
});

export const option = style({
  position: "absolute",
  width: 56,
  height: 56,
  padding: 5,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-full)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-primary)",
  ...text.caption,
  fontWeight: 650,
  lineHeight: 1.08,
  textAlign: "center",
  pointerEvents: "auto",
  transition: `background-color ${duration.popover} ${easing.standard}, border-color ${duration.popover} ${easing.standard}, color ${duration.popover} ${easing.standard}`,
  selectors: {
    "&[data-option='0']": { left: 4, top: 86 },
    "&[data-option='1']": { left: 66, top: 24 },
    "&[data-option='2']": { left: 138, top: 24 },
    "&[data-option='3']": { left: 200, top: 86 },
    [`${fan}[data-orientation=down] &[data-option='0']`]: { top: 18 },
    [`${fan}[data-orientation=down] &[data-option='1']`]: { top: 80 },
    [`${fan}[data-orientation=down] &[data-option='2']`]: { top: 80 },
    [`${fan}[data-orientation=down] &[data-option='3']`]: { top: 18 },
    [`${fan}[data-compact=true] &`]: { position: "static", width: "auto", height: 48, borderRadius: "var(--radius-control)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
    "&[data-active=true]": { borderWidth: 2 },
    "&[aria-selected=true]": { borderWidth: 2, fontWeight: 750 },
    "&[data-visual=none]": { backgroundColor: "#FFFFFF", borderColor: "var(--text-muted)", color: "var(--text-muted)" },
    "&[data-visual=below]": { backgroundColor: "#FFFFFF", borderColor: "var(--danger)", color: "var(--danger)" },
    "&[data-visual=met]": { backgroundColor: "#FFFFFF", borderColor: "var(--accent)", color: "var(--accent)" },
    "&[data-visual=excellent]": { backgroundColor: "var(--accent)", borderColor: "var(--accent)", color: "#FFFFFF" },
  },
});
