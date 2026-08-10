import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";
import { button as sharedButton } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

/* MODAL_SURFACE — shared backdrop and surface geometry (ADR 0044). */
export const overlay = dialogBackdrop;

export const dialog = style([
  dialogSurface.compact,
]);

export const title = style({ ...text.objectTitle, margin: 0 });

export const meta = style({
  display: "grid",
  gridTemplateColumns: "max-content 1fr",
  gap: "6px 16px",
  ...text.compactBody,
});
globalStyle(`${meta} dt`, { ...text.label, color: "var(--text-muted)" });
globalStyle(`${meta} dd`, { margin: 0, ...text.bodyStrong, overflowWrap: "anywhere" });

export const excerpt = style({
  ...text.editorBody,
  color: "var(--text-primary)",
  borderInlineStart: "3px solid var(--border-subtle)",
  padding: "4px 0 4px 14px",
  margin: 0,
});

export const warnings = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "10px 14px",
  borderInlineStart: "3px solid var(--accent)",
  background: "var(--active-background)",
  ...text.compactBody,
});

export const warningItem = style({ margin: 0, color: "var(--text-primary)" });

export const actions = style({
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  paddingTop: 4,
});

export const button = sharedButton.secondary;
export const primary = sharedButton.primary;

export const errorMsg = style({
  color: "var(--text-muted)",
  borderInlineStart: "3px solid var(--border-strong)",
  background: "var(--active-background)",
  padding: "10px 12px",
  ...text.compactBody,
  margin: 0,
});
