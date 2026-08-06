import { style } from "@vanilla-extract/css";

export const shell = style({
  display: "grid",
  gridTemplateColumns: "minmax(190px, 260px) minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
  '@media': { '(max-width: 760px)': { gridTemplateColumns: "1fr" } },
});
export const manager = style({ display: "flex", flexDirection: "column", gap: 12 });
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
export const dialog = style({
  position: "fixed",
  inset: 0,
  zIndex: 40,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(0, 0, 0, 0.45)",
});
export const editor = style({
  width: "min(760px, 100%)",
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 24,
  background: "var(--surface-primary, Canvas)",
  color: "var(--text-primary, CanvasText)",
  border: "1px solid var(--border-subtle)",
});
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
