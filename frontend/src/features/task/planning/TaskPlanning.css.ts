import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";

/* One tab geometry for all five workspace views; it wraps rather than forcing the page sideways. */
export const tabs = style({
  display: "flex",
  flexWrap: "wrap",
  gap: space.x1,
  borderBottom: "1px solid var(--border-subtle)",
  minInlineSize: 0,
});
export const tab = style({
  padding: "10px 16px",
  border: 0,
  borderBottom: "2px solid transparent",
  background: "transparent",
  selectors: { '&[aria-selected="true"]': { borderBottomColor: "var(--focus-ring)" } },
  '@media': { '(prefers-reduced-motion: no-preference)': { transition: "border-color 120ms ease" } },
});
export const panelBody = style({ display: "flex", flexDirection: "column", gap: space.group, minInlineSize: 0 });
export const empty = style({ color: "var(--text-muted)" });
export const dayGroup = style({ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 });
export const list = style({ listStyle: "none", padding: 0, margin: 0 });
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(110px, 140px) minmax(0, 1fr) auto",
  gap: space.field,
  alignItems: "start",
  padding: "12px 0",
  borderBottom: "1px solid var(--border-subtle)",
  minInlineSize: 0,
  // Reflows against the page frame it sits in, not the window.
  '@container': { '(max-width: 640px)': { gridTemplateColumns: "minmax(0, 1fr)", gap: space.control } },
});
export const time = style({ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
export const content = style({ display: "flex", flexWrap: "wrap", gap: "4px 12px", minWidth: 0 });
export const description = style({ flexBasis: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 });
export const needsReview = style({ fontWeight: 600, textDecoration: "underline" });
