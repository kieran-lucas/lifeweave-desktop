import { style } from "@vanilla-extract/css";

import { text } from "../visual/typography.css";
import { focusRing } from "./utilities.css";

/** Low-chrome horizontal tab rail. It carries structure without becoming a bordered card. */
export const tabList = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  minInlineSize: 0,
  borderBlockEnd: "1px solid var(--border-subtle)",
});

/** Shared tab state language. Selection and keyboard focus remain independent signals. */
export const tab = style([
  focusRing,
  {
    minBlockSize: 36,
    padding: "7px 10px 8px",
    marginBlockEnd: -1,
    border: 0,
    borderBlockEnd: "2px solid transparent",
    borderRadius: 0,
    background: "transparent",
    color: "var(--text-muted)",
    ...text.tab,
    cursor: "pointer",
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)" },
      '&[aria-selected="true"], &[aria-pressed="true"]': {
        color: "var(--accent)",
        borderBlockEndColor: "var(--accent)",
      },
      "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
    },
    "@media": {
      "(forced-colors: active)": {
        selectors: {
          '&[aria-selected="true"], &[aria-pressed="true"]': {
            color: "Highlight",
            borderBlockEndColor: "Highlight",
          },
        },
      },
    },
  },
]);

/** Quiet segmented container for mutually exclusive view choices. */
export const segmented = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: 3,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface-subtle, var(--active-background))",
});

export const segmentedItem = style([
  focusRing,
  {
    minBlockSize: 30,
    padding: "5px 10px",
    border: "1px solid transparent",
    borderRadius: "var(--radius-small)",
    background: "transparent",
    color: "var(--text-muted)",
    ...text.button,
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)" },
      '&[aria-selected="true"], &[aria-pressed="true"], &[aria-current="page"]': {
        background: "var(--surface)",
        color: "var(--text-primary)",
        borderColor: "var(--border-strong)",
      },
    },
  },
]);

/** Selection recipe for rows/list items; focus is supplied separately by the interactive child. */
export const selectedRow = style({
  selectors: {
    '&[aria-current="true"], &[aria-current="page"], &[data-selected="true"]': {
      background: "var(--icon-background)",
      boxShadow: "inset 2px 0 0 var(--accent)",
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        '&[aria-current="true"], &[aria-current="page"], &[data-selected="true"]': {
          outline: "1px solid Highlight",
          outlineOffset: -1,
        },
      },
    },
  },
});
