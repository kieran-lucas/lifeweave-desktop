import { style } from "@vanilla-extract/css";

export const screen = style({
  maxWidth: "680px",
  margin: "0 auto",
  padding: "32px 16px",
});

export const heading = style({
  margin: "0 0 24px",
  fontSize: "1.5rem",
  fontWeight: 700,
});

export const form = style({
  display: "flex",
  gap: "8px",
  marginBottom: "24px",
});

export const input = style({
  flex: 1,
  padding: "8px 12px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "8px",
  fontSize: "1rem",
  background: "var(--surface)",
  color: "inherit",
});

export const button = style({
  padding: "8px 16px",
  borderRadius: "8px",
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem",
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const secondaryButton = style({
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border-subtle)",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.8rem",
  color: "inherit",
});

export const errorText = style({
  color: "var(--error, #c0392b)",
  fontSize: "0.875rem",
  marginTop: "4px",
  marginBottom: "8px",
});

export const list = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "10px",
  background: "var(--surface)",
});

export const itemLabel = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const editInput = style([
  input,
  {
    flex: 1,
  },
]);

export const archivedItem = style([
  item,
  {
    opacity: 0.55,
  },
]);

export const statusText = style({
  color: "var(--text-muted, #666)",
  fontSize: "0.9rem",
  padding: "16px 0",
});

export const sectionHeading = style({
  margin: "24px 0 8px",
  fontSize: "0.85rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted, #666)",
});
