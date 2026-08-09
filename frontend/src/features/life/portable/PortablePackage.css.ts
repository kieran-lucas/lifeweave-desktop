import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";

export const controls = style({ display: "grid", gap: "0.55rem", marginBlock: "0.7rem" });
export const actions = style({ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" });
export const button = style({ border: "1px solid currentColor", borderRadius: "var(--radius-control)", background: "transparent", color: "inherit", padding: "0.55rem 0.8rem", cursor: "pointer", selectors: { "&:disabled": { cursor: "wait", opacity: 0.6 } } });
export const fileLabel = style([button, { display: "inline-flex" }]);
export const hiddenFile = style({ position: "absolute", inlineSize: "1px", blockSize: "1px", overflow: "hidden", clipPath: "inset(50%)" });
export const explanation = style({ margin: 0, maxInlineSize: "70ch", opacity: 0.8 });
export const note = style({ margin: 0, paddingInlineStart: "0.7rem", borderInlineStart: "3px solid currentColor" });
/*
 * MODAL_SURFACE. Backdrop and surface geometry come from the shared modal grammar so every dialog
 * is bounded, centred and internally scrollable in the same way (ADR 0044). Only this dialog's own
 * visual treatment stays local.
 */
export const backdrop = dialogBackdrop;
export const dialog = style([
  dialogSurface.compact,
  {
    "@media": {
      "(forced-colors: active)": {
        border: "1px solid currentColor",
        background: "Canvas",
        color: "CanvasText",
      },
    },
  },
]);
export const metadata = style({ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.35rem 0.8rem" });
globalStyle(`${metadata} dt`, { fontWeight: 700 });
globalStyle(`${metadata} dd`, { margin: 0, overflowWrap: "anywhere" });
export const error = style({
  color: "var(--danger)",
  border: "2px solid currentColor",
  padding: "0.55rem",
  "@media": { "(forced-colors: active)": { color: "CanvasText" } },
});
