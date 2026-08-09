import { style } from "@vanilla-extract/css";

export const fieldset = style({
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  padding: "6px 10px 8px",
  margin: 0,
  position: "relative",
});

export const legend = style({
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted, var(--text-muted))",
  padding: "0 4px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const trigger = style({
  fontSize: 12,
  padding: "3px 10px",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  background: "transparent",
  cursor: "pointer",
  color: "var(--text-muted, var(--text-muted))",
  display: "block",
  width: "100%",
  textAlign: "left",
});

export const panel = style({
  marginTop: 6,
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const searchLabel = style({
  fontSize: 11,
  color: "var(--text-muted, var(--text-muted))",
  display: "block",
  marginBottom: 2,
});

export const search = style({
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  fontSize: 13,
  boxSizing: "border-box",
});

export const status = style({
  margin: "2px 0",
  fontSize: 12,
  color: "var(--text-muted, var(--text-muted))",
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: 200,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const checkLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: "var(--radius-small)",
  fontSize: 13,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--surface-raised)" },
  },
});

export const checkLabelDisabled = style({
  opacity: 0.5,
  cursor: "default",
});

export const selectedCount = style({
  fontSize: 11,
  color: "var(--text-muted, var(--text-muted))",
});

export const limitWarning = style({
  fontSize: 11,
  color: "var(--danger)",
  fontWeight: 600,
});

export const createButton = style({
  fontSize: 12,
  padding: "4px 10px",
  border: "1px dashed var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  background: "transparent",
  cursor: "pointer",
  color: "var(--accent)",
  textAlign: "left",
});

export const footer = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 6,
  borderTop: "1px solid var(--border-subtle, var(--border-subtle))",
  paddingTop: 6,
  marginTop: 2,
});

export const doneButton = style({
  fontSize: 12,
  padding: "3px 12px",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  background: "transparent",
  cursor: "pointer",
});

export const errorMsg = style({
  fontSize: 11,
  color: "var(--danger)",
  marginTop: 2,
});

export const retryButton = style({
  fontSize: 11,
  padding: "2px 8px",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  background: "transparent",
  cursor: "pointer",
  marginTop: 2,
});
