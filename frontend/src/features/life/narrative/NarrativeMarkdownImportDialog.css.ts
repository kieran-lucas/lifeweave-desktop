import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";
import { button as sharedButton } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

export const overlay = style([dialogBackdrop, { backdropFilter: "none", WebkitBackdropFilter: "none" }]);
export const dialog = style([dialogSurface.compact, { backgroundColor: "var(--paint-sheet-strong)", backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)", borderColor: "var(--paint-edge-strong)" }]);
export const title = style({ ...text.objectTitle, margin: 0 });
export const meta = style({ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", ...text.compactBody });
globalStyle(`${meta} dt`, { ...text.label, color: "var(--text-muted)" });
globalStyle(`${meta} dd`, { margin: 0, ...text.bodyStrong, overflowWrap: "anywhere" });
export const excerpt = style({ ...text.editorBody, color: "var(--text-primary)", borderInlineStart: "3px solid var(--paint-edge-strong)", padding: "8px 0 8px 14px", margin: 0, backgroundImage: "linear-gradient(90deg, color-mix(in srgb, var(--accent) 5%, transparent), transparent 50%)" });
export const warnings = style({ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", borderInlineStart: "3px solid var(--accent)", borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine)", ...text.compactBody });
export const warningItem = style({ margin: 0, color: "var(--text-primary)" });
export const actions = style({ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 });
export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const errorMsg = style({ color: "var(--text-muted)", borderInlineStart: "3px solid var(--paint-edge-strong)", borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "var(--paint-board)", backgroundImage: "var(--paint-grain-fine)", padding: "10px 12px", ...text.compactBody, margin: 0 });
