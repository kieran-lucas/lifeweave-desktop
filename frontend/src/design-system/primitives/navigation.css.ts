import { style } from "@vanilla-extract/css";

import { text } from "../visual/typography.css";
import { focusRing } from "./utilities.css";
import { duration, easing } from "../visual/motion.css";

export const tabList = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minInlineSize: 0,
  borderBlockEnd: "1px solid color-mix(in srgb, var(--accent) 13%, var(--border-subtle))",
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
    transition:
      `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
      `color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover:not(:disabled)": {
        color: "var(--text-primary)",
        background: "color-mix(in srgb, var(--accent) 6%, transparent)",
      },
      '&[aria-selected="true"], &[aria-pressed="true"]': {
        color: "var(--accent)",
        borderBlockEndColor: "var(--accent)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--accent-cyan) 10%, transparent), color-mix(in srgb, var(--accent-violet) 5%, transparent))",
        boxShadow: "0 8px 18px color-mix(in srgb, var(--accent) 8%, transparent)",
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
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-control)",
  background:
    "linear-gradient(145deg, color-mix(in srgb, white 34%, transparent), transparent 56%), var(--glass-surface)",
  boxShadow: "inset 0 1px 0 var(--glass-highlight)",
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
    transition:
      `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, ` +
      `border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)", background: "color-mix(in srgb, var(--accent) 6%, transparent)" },
      '&[aria-selected="true"], &[aria-pressed="true"], &[aria-current="page"]': {
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 14%, white), color-mix(in srgb, var(--accent-violet) 12%, white))",
        color: "var(--text-primary)",
        borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border-subtle))",
        boxShadow: "0 7px 18px color-mix(in srgb, var(--accent) 10%, transparent), inset 0 1px 0 white",
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
      background:
        "linear-gradient(105deg, color-mix(in srgb, var(--accent-cyan) 8%, var(--icon-background)), color-mix(in srgb, var(--accent-violet) 8%, var(--icon-background)))",
      boxShadow: "inset 3px 0 0 var(--accent), var(--glow-selected)",
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
