import { style } from "@vanilla-extract/css";
import { text } from "../../design-system/visual/typography.css";

export const panel = style({ marginTop: 32, paddingTop: 24, borderBlockStart: "1px solid var(--border-subtle)" });
export const heading = style({ margin: 0, ...text.sectionTitle });
export const group = style({ marginTop: 24 });
export const subheading = style({ margin: "0 0 8px", ...text.eyebrow, color: "var(--text-muted)" });
export const list = style({ listStyle: "none", padding: 0, margin: 0 });
export const row = style({ borderBlockEnd: "1px solid var(--border-subtle)" });
export const completedRow = style([row, { color: "var(--text-muted)" }]);
export const taskButton = style({
  display: "grid",
  gap: 7,
  width: "100%",
  padding: "10px 2px",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  color: "inherit",
  ...text.row,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--active-background)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});
