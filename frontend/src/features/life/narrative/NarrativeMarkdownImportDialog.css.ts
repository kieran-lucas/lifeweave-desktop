import { style } from "@vanilla-extract/css";

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
});

export const dialog = style({
  background: "var(--surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 16,
  padding: "28px 32px",
  width: "min(480px, 92vw)",
  maxHeight: "80vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
});

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
  { background: "var(--accent)", color: "var(--accent-contrast, white)", borderColor: "transparent" },
]);

export const errorMsg = style({
  color: "var(--text-muted)",
  border: "1px dashed var(--border-subtle)",
  borderRadius: 8,
  padding: 10,
  fontSize: "0.85rem",
  margin: 0,
});
