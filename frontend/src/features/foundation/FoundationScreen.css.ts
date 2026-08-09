import { style } from "@vanilla-extract/css";

/*
 * Foundation tools are content inside the Settings STANDARD_PAGE. They own no page width and no
 * page padding; the reading measure below is a text measure, not a page frame (ADR 0044).
 */
export const panel = style({
  display: "flex",
  flexDirection: "column",
  maxInlineSize: "68ch",
  minInlineSize: 0,
});

export const heading = style({
  margin: "0 0 24px",
  fontSize: "1.5rem",
  fontWeight: 700,
});

export const form = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "24px",
  minInlineSize: 0,
});

export const input = style({
  flex: 1,
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "8px 12px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  fontSize: "1rem",
  background: "var(--surface)",
  color: "inherit",
});

export const button = style({
  padding: "8px 16px",
  borderRadius: "var(--radius-control)",
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
  borderRadius: "var(--radius-small)",
  border: "1px solid var(--border-subtle)",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.8rem",
  color: "inherit",
});

export const errorText = style({
  color: "var(--danger)",
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
  borderRadius: "var(--radius-control)",
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
  color: "var(--text-muted, var(--text-muted))",
  fontSize: "0.9rem",
  padding: "16px 0",
});

export const sectionHeading = style({
  margin: "24px 0 8px",
  fontSize: "0.85rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted, var(--text-muted))",
});

export const contentsForm = style({
  display: "contents",
});
