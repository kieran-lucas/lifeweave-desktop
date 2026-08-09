import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";

export const panel = style({
  marginTop: 32,
  paddingTop: 24,
  borderTop: "1px solid var(--border-subtle)",
});
export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
});
export const heading = style({ margin: 0 });
export const subheading = style({ margin: "24px 0 10px", fontSize: "1rem" });
export const button = style({
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  padding: "7px 11px",
  background: "var(--surface)",
  color: "var(--text-primary)",
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.55, cursor: "default" },
  },
});
export const destructive = style([
  button,
  { color: "var(--danger)", flexShrink: 0 },
]);
export const list = style({
  display: "grid",
  gap: 8,
  listStyle: "none",
  padding: 0,
  margin: 0,
});
export const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 12,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
});
export const rowBody = style({ minWidth: 0, flex: 1 });
export const linkButton = style({
  border: 0,
  padding: 0,
  background: "transparent",
  color: "var(--text-primary)",
  fontWeight: 750,
  textAlign: "left",
  cursor: "pointer",
  selectors: { "&:disabled": { cursor: "default", opacity: 0.75 } },
});
export const meta = style({
  margin: "3px 0 0",
  color: "var(--text-muted)",
  fontSize: 13,
  overflowWrap: "anywhere",
});
export const state = style({
  display: "inline-block",
  marginLeft: 8,
  padding: "2px 7px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-full)",
  color: "var(--text-muted)",
  fontSize: 12,
});
/* MODAL_SURFACE — shared backdrop and surface geometry (ADR 0044). */
export const overlay = dialogBackdrop;
export const dialog = style([
  dialogSurface.standard,
  { borderRadius: "var(--radius-floating)", boxShadow: "var(--elevation-modal)" },
]);
export const field = style({ display: "grid", gap: 6, marginTop: 18 });
export const searchRow = style({ display: "flex", flexWrap: "wrap", gap: 8, minInlineSize: 0 });
export const input = style({
  minWidth: 0,
  flex: 1,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  padding: "9px 11px",
  background: "var(--app-background)",
  color: "var(--text-primary)",
});
export const result = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 10,
  padding: 11,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  cursor: "pointer",
});
export const actions = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 20,
});
export const muted = style({ color: "var(--text-muted)" });

globalStyle(`${panel} button:focus-visible, ${dialog} button:focus-visible, ${dialog} input:focus-visible`, {
  outline: "3px solid var(--focus-ring)",
  outlineOffset: 2,
});
