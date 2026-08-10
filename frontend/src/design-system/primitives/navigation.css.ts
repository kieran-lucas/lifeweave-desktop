import { style } from "@vanilla-extract/css";

import { text } from "../visual/typography.css";
import { focusRing } from "./utilities.css";
import { duration, easing } from "../visual/motion.css";

export const tabList = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minInlineSize: 0,
  borderBlockEnd: "1px solid var(--paint-edge)",
});

export const tab = style([
  focusRing,
  {
    minBlockSize: 36,
    padding: "7px 11px 8px",
    marginBlockEnd: -1,
    border: "1px solid transparent",
    borderBlockEnd: "2px solid transparent",
    borderRadius: "var(--radius-small) var(--radius-small) 0 0",
    background: "transparent",
    color: "var(--text-muted)",
    ...text.tab,
    cursor: "pointer",
    boxShadow: "none",
    transition:
      `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
      `color ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)", backgroundColor: "var(--surface-hover)" },
      '&[aria-selected="true"], &[aria-pressed="true"]': {
        color: "var(--text-primary)",
        borderBlockEndColor: "var(--text-primary)",
        backgroundColor: "var(--surface-raised)",
        backgroundImage: "var(--paint-grain-fine)",
        boxShadow: "none",
      },
      "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
    },
    "@media": {
      "(forced-colors: active)": {
        selectors: {
          '&[aria-selected="true"], &[aria-pressed="true"]': {
            color: "Highlight",
            borderBlockEndColor: "Highlight",
            background: "Canvas",
            boxShadow: "none",
          },
        },
      },
    },
  },
]);

export const segmented = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: 4,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "var(--surface-raised)",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
});

export const segmentedItem = style([
  focusRing,
  {
    minBlockSize: 30,
    padding: "5px 11px",
    border: "1px solid transparent",
    borderRadius: "var(--radius-small)",
    background: "transparent",
    color: "var(--text-muted)",
    ...text.button,
    cursor: "pointer",
    boxShadow: "none",
    transition:
      `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, ` +
      `border-color ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)", backgroundColor: "var(--surface-hover)" },
      '&[aria-selected="true"], &[aria-pressed="true"], &[aria-current="page"]': {
        backgroundColor: "var(--text-primary)",
        color: "var(--app-background)",
        borderColor: "var(--text-primary)",
        boxShadow: "none",
      },
    },
    "@media": {
      "(forced-colors: active)": {
        selectors: {
          '&[aria-selected="true"], &[aria-pressed="true"], &[aria-current="page"]': {
            background: "Highlight",
            color: "HighlightText",
            borderColor: "Highlight",
            boxShadow: "none",
          },
        },
      },
    },
  },
]);

export const selectedRow = style({
  selectors: {
    '&[aria-current="true"], &[aria-current="page"], &[data-selected="true"]': {
      backgroundColor: "var(--surface-selected)",
      backgroundImage: "var(--paint-grain-fine)",
      boxShadow: "inset 3px 0 0 var(--text-primary)",
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        '&[aria-current="true"], &[aria-current="page"], &[data-selected="true"]': {
          outline: "1px solid Highlight",
          outlineOffset: -1,
          boxShadow: "none",
        },
      },
    },
  },
});
