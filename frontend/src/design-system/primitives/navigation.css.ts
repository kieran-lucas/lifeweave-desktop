import { style } from "@vanilla-extract/css";

import { text } from "../visual/typography.css";
import { focusRing } from "./utilities.css";
import { duration, easing } from "../visual/motion.css";

export const tabList = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minInlineSize: 0,
  borderBlockEnd: "1px solid rgba(189,205,230,.72)",
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
      `color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)", backgroundColor: "rgba(242,246,255,.74)" },
      '&[aria-selected="true"], &[aria-pressed="true"]': {
        color: "var(--accent-muted)",
        borderBlockEndColor: "var(--accent)",
        background: "var(--accent-soft)",
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
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-control)",
  background: "var(--glass-surface)",
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
      `border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover:not(:disabled)": { color: "var(--text-primary)", backgroundColor: "rgba(242,246,255,.78)" },
      '&[aria-selected="true"], &[aria-pressed="true"], &[aria-current="page"]': {
        background: "var(--accent)",
        color: "#FFFFFF",
        borderColor: "rgba(255,255,255,.54)",
        boxShadow: "none",
      },
      "&:active:not(:disabled)": { transform: "translateY(1px)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { selectors: { "&:active:not(:disabled)": { transform: "none" } } },
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
