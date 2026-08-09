import { style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";

/**
 * Category goal editor geometry.
 *
 * The hour/minute pair previously rendered as two adjacent `<label>`s in bare inline flow, so
 * `Hours` and `Minutes` sat against each other with a zero content gap. Each goal is now a real
 * common region and each unit is a real field.
 */
export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  minInlineSize: 0,
});

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  minInlineSize: 0,
});

export const editor = style({
  display: "flex",
  flexDirection: "column",
  gap: space.field,
  minInlineSize: 0,
  selectors: {
    "& + &": { borderTop: "1px solid var(--border-subtle)", paddingTop: space.x5 },
  },
});

export const heading = style({ margin: 0 });

export const toggle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space.control,
  minInlineSize: 0,
});

export const duration = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: space.field,
  margin: 0,
  inlineSize: "min(100%, 520px)",
  padding: space.x3,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  minInlineSize: 0,
});

export const legend = style({ padding: `0 ${space.x1}`, fontWeight: 700 });

export const unit = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  minInlineSize: 0,
});

export const number = style({
  inlineSize: "6rem",
  minInlineSize: 0,
  boxSizing: "border-box",
  minBlockSize: 36,
  padding: `${space.x1} ${space.control}`,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface)",
  color: "inherit",
  font: "inherit",
});

export const save = style({
  alignSelf: "flex-start",
  minBlockSize: 38,
  padding: `${space.control} ${space.field}`,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
    "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 },
  },
});
