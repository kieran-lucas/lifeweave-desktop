import { globalStyle, style } from "@vanilla-extract/css";
import { button as sharedButton } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { text } from "../../design-system/visual/typography.css";

/*
 * Foundation tools are content inside the Settings STANDARD_PAGE. They own no page width and no
 * page padding; the reading measure below is a text measure, not a page frame (ADR 0044).
 */
export const panel = style({
  display: "flex",
  flexDirection: "column",
  maxInlineSize: "68ch",
  minInlineSize: 0,
  gap: 12,
});

export const heading = style({ margin: 0, ...text.cardTitle });

export const form = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "8px",
  minInlineSize: 0,
});

export const input = style([focusRing, {
  flex: 1,
  minInlineSize: 0,
  boxSizing: "border-box",
  padding: "8px 12px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  ...text.body,
  background: "var(--surface)",
  color: "var(--text-primary)",
}]);

export const button = sharedButton.primary;

export const secondaryButton = sharedButton.secondary;

export const errorText = style({
  color: "var(--danger)",
  ...text.compactBody,
  marginTop: "4px",
  marginBottom: "8px",
});

export const list = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0,
  borderBlockStart: "1px solid var(--border-subtle)",
});
globalStyle(`${list} button`, { minHeight: 26, padding: "2px 9px", borderRadius: "var(--radius-small)" });

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 0",
  borderBlockEnd: "1px solid var(--border-subtle)",
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
    color: "var(--text-muted)",
  },
]);

export const statusText = style({
  color: "var(--text-muted)",
  ...text.compactBody,
  padding: "16px 0",
});

export const sectionHeading = style({
  margin: "24px 0 8px",
  ...text.eyebrow,
  color: "var(--text-muted)",
});

export const contentsForm = style({
  display: "contents",
});
