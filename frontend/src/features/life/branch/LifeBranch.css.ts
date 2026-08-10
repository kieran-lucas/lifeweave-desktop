import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

export const controls = style({ display: "grid", gap: "0.5rem", marginBlock: "0.7rem" });
export const actions = style({ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: "0.5rem", alignItems: "center" });
export const button = style([sharedButton.secondary, compact]);
export const primary = sharedButton.primary;
export const fileLabel = style([button, { display: "inline-flex" }]);
export { srOnly as hiddenFile } from "../../../design-system/primitives/utilities.css";
export const reason = style({ margin: 0, ...text.metadata, color: "var(--text-muted)" });
/*
 * MODAL_SURFACE. Backdrop and surface geometry come from the shared modal grammar so every dialog
 * is bounded, centred and internally scrollable in the same way (ADR 0044). Only this dialog's own
 * visual treatment stays local.
 */
export const backdrop = dialogBackdrop;
export const dialog = style([
  dialogSurface.standard,
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
export const treeDialog = style([
  dialogSurface.wide,
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
/*
 * Native heading and paragraph margins used to stack on top of the shared dialog gap. The tree
 * preview has two explanatory paragraphs and a full package inventory, so that accidental spacing
 * pushed its confirmation controls below the first viewport even at the maximized audit size.
 * The dialog's flex gap remains the single rhythm authority.
 */
globalStyle(`${dialog} > h2`, { margin: 0, ...text.objectTitle });
globalStyle(`${dialog} > p`, { margin: 0, ...text.body, color: "var(--text-muted)" });
globalStyle(`${treeDialog} > h2`, { margin: 0, ...text.objectTitle });
globalStyle(`${treeDialog} > p`, { margin: 0, ...text.body, color: "var(--text-muted)" });
export const metadata = style({ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.35rem 0.8rem" });
globalStyle(`${metadata} dt`, { ...text.label, color: "var(--text-muted)" });
globalStyle(`${metadata} dd`, { margin: 0, overflowWrap: "anywhere", ...text.bodyStrong });
export const warnings = style({ margin: 0, padding: "10px 12px 10px 28px", borderInlineStart: "3px solid var(--accent)", background: "var(--active-background)", display: "grid", gap: "0.25rem", ...text.compactBody });
export const consequence = style({ padding: "10px 12px", borderInlineStart: "3px solid var(--accent)", background: "var(--active-background)", color: "var(--text-primary) !important" });
export const error = style({
  color: "var(--danger)",
  border: "2px solid currentColor",
  padding: "0.55rem",
  "@media": { "(forced-colors: active)": { color: "CanvasText" } },
});
