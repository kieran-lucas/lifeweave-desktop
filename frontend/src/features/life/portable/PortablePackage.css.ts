import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";

export const controls = style({ display: "grid", gap: "0.55rem", marginBlock: "0.7rem" });
export const actions = style({ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" });
export const button = style([sharedButton.secondary, compact, { selectors: { "&:disabled": { cursor: "wait" } } }]);
export const fileLabel = style([sharedButton.secondary, { display: "inline-flex" }]);
export { srOnly as hiddenFile } from "../../../design-system/primitives/utilities.css";
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
