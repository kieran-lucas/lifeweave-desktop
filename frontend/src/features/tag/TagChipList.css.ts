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
  background: "var(--surface-raised, #f3f3f3)",
  border: "1px solid var(--border-subtle, #ddd)",
  borderRadius: 999,
  padding: "1px 8px",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted, #555)",
  lineHeight: "1.5",
  whiteSpace: "nowrap",
});

export const overflow = style({
  background: "var(--surface-raised, #f3f3f3)",
  border: "1px solid var(--border-subtle, #ddd)",
  borderRadius: 999,
  padding: "1px 8px",
  fontSize: 11,
  color: "var(--text-muted, #555)",
  lineHeight: "1.5",
  cursor: "default",
});
