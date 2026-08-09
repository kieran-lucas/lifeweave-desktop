import { style } from "@vanilla-extract/css";

export const list = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  listStyle: "none",
  padding: 0,
  margin: 0,
});

export const chip = style({
  background: "var(--surface-raised, var(--icon-background))",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: 999,
  padding: "1px 8px",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted, var(--text-muted))",
  lineHeight: "1.5",
  whiteSpace: "nowrap",
});

export const overflow = style({
  background: "var(--surface-raised, var(--icon-background))",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: 999,
  padding: "1px 8px",
  fontSize: 11,
  color: "var(--text-muted, var(--text-muted))",
  lineHeight: "1.5",
  cursor: "default",
});
