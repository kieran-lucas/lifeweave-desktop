import { style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";

/* MODAL_SURFACE — shared backdrop and surface geometry (ADR 0044). */
export const overlay = dialogBackdrop;

export const dialog = style([
  dialogSurface.compact,
  { boxShadow: "0 8px 40px rgba(0,0,0,0.18)" },
]);

export const title = style({ fontWeight: 700, fontSize: "1.1rem", margin: 0 });

export const meta = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px 16px",
  fontSize: "0.85rem",
  color: "var(--text-muted)",
});

export const excerpt = style({
  fontSize: "0.9rem",
  color: "var(--text-primary)",
  lineHeight: 1.55,
  borderLeft: "3px solid var(--border-subtle)",
  paddingLeft: 12,
  margin: 0,
});

export const warnings = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "10px 14px",
  border: "1px solid var(--focus-ring)",
  borderRadius: 8,
  background: "var(--active-background)",
  fontSize: "0.85rem",
});

export const warningItem = style({ margin: 0, color: "var(--text-primary)" });

export const actions = style({
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  paddingTop: 4,
});

export const button = style({
  border: "1px solid var(--border-subtle)",
  borderRadius: 9,
  padding: "8px 16px",
  background: "var(--surface)",
  color: "var(--text-primary)",
  fontWeight: 700,
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.55, cursor: "default" },
    "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const primary = style([
  button,
  { background: "var(--accent)", color: "var(--accent-contrast)", borderColor: "transparent" },
]);

export const errorMsg = style({
  color: "var(--text-muted)",
  border: "1px dashed var(--border-subtle)",
  borderRadius: 8,
  padding: 10,
  fontSize: "0.85rem",
  margin: 0,
});
