import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { button } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { text } from "../../design-system/visual/typography.css";

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
  gap: 0,
  minInlineSize: 0,
  marginBlockStart: space.x3,
});

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x2,
  minInlineSize: 0,
  paddingBlockStart: space.x5,
  borderTop: "1px solid var(--border-subtle)",
});

globalStyle(`${root} > h2`, { ...text.sectionTitle, margin: 0 });
globalStyle(`${root} > h2 + p`, { ...text.compactBody, margin: 0, color: "var(--text-muted)", maxInlineSize: "72ch" });

export const editor = style({
  display: "flex",
  flexDirection: "column",
  gap: space.field,
  minInlineSize: 0,
  paddingBlock: space.x4,
  borderBottom: "1px solid var(--border-subtle)",
  selectors: {
    "&:first-child": { borderTop: "1px solid var(--border-subtle)" },
  },
});

export const heading = style({ margin: 0, ...text.cardTitle });

export const toggle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space.control,
  minInlineSize: 0,
  ...text.body,
});

export const duration = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: space.field,
  margin: 0,
  inlineSize: "min(100%, 440px)",
  padding: space.x3,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  minInlineSize: 0,
});

export const legend = style({ padding: `0 ${space.x1}`, ...text.label, color: "var(--text-muted)" });

export const unit = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  minInlineSize: 0,
  ...text.label,
  color: "var(--text-muted)",
});

export const number = style([focusRing, {
  inlineSize: "6rem",
  minInlineSize: 0,
  boxSizing: "border-box",
  minBlockSize: 36,
  padding: `${space.x1} ${space.control}`,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface)",
  color: "inherit",
  ...text.body,
}]);

export const save = button.secondary;
globalStyle(`${editor} > button`, { alignSelf: "flex-start" });
