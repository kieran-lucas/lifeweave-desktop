import { style } from "@vanilla-extract/css";

export const shell = style({
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "32px",
});

export const panel = style({
  width: "min(680px, 100%)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "20px",
  padding: "32px",
  background: "var(--surface)",
  boxShadow: "0 20px 60px rgb(0 0 0 / 0.08)",
});

export const eyebrow = style({
  margin: 0,
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
});
