import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { dialogBackdrop, dialogSurface, splitWorkspace } from "../../../app/layout/layout.css";

/* Manager rail leads, results flex — the shared split workspace (ADR 0044). */
export const shell = style([
  splitWorkspace,
  { vars: { "--lw-split-columns": "minmax(190px, 260px) minmax(0, 1fr)" } },
]);
export const manager = style({ display: "flex", flexDirection: "column", gap: space.x3, minInlineSize: 0 });
export const viewList = style({ listStyle: "none", margin: 0, padding: 0 });
export const viewLine = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid var(--border-subtle)",
});
export const actions = style({ display: "flex", flexWrap: "wrap", gap: 6 });
export const results = style({ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 });
export const notice = style({ borderLeft: "3px solid var(--focus-ring)", paddingLeft: 12 });
/* MODAL_SURFACE — shared backdrop and surface geometry (ADR 0044). */
export const dialog = dialogBackdrop;
export const editor = style([
  dialogSurface.standard,
  { background: "var(--surface-primary, Canvas)", color: "var(--text-primary, CanvasText)" },
]);
export const field = style({ display: "flex", flexDirection: "column", gap: 6 });
export const fieldRow = style({ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 });
export const clause = style({ border: "1px solid var(--border-subtle)", padding: 12, display: "flex", flexDirection: "column", gap: 8 });
export const multi = style({ minHeight: 110, width: "100%" });
export const checkboxRow = style({ display: "flex", flexWrap: "wrap", gap: 12 });
export const resultList = style({ listStyle: "none", padding: 0, margin: 0 });
export const resultRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(110px, 150px) minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "start",
  padding: "12px 0",
  borderBottom: "1px solid var(--border-subtle)",
  '@media': { '(max-width: 640px)': { gridTemplateColumns: "1fr" } },
});
export const metadata = style({ display: "flex", flexWrap: "wrap", gap: "4px 10px" });
