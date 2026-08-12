import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import "../visual/theme.css";
import { text } from "../visual/typography.css";

/** Shared empty, loading and error-state presentation. */

export const empty = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "34px 24px",
  textAlign: "center",
  minInlineSize: 0,
});

export const emptyCompact = style({ padding: "20px 16px", gap: 7 });

/** White matte mark with a literal blue ink edge — no translucent accent disc. */
export const emptyMark = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 40,
  blockSize: 40,
  borderRadius: "var(--radius-full)",
  border: "1px solid var(--accent)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--accent)",
  marginBlockEnd: 2,
  "@media": {
    "(forced-colors: active)": { background: "Canvas", border: "1px solid CanvasText" },
  },
});

export const emptyMarkNeutral = style({
  borderColor: "var(--text-primary)",
  color: "var(--text-primary)",
});

export const emptyTitle = style({ ...text.sectionTitle, color: "var(--text-primary)", margin: 0 });

export const emptyBody = style({
  ...text.compactBody,
  color: "var(--text-muted)",
  margin: 0,
  maxInlineSize: "44ch",
});

/** Loading placeholders are static neutral paper marks; no shimmer or gradient sweep. */
export const skeleton = style({
  blockSize: 12,
  borderRadius: "var(--radius-small)",
  background: "#E5E7EB",
  "@media": {
    "(forced-colors: active)": { background: "GrayText" },
  },
});

export const skeletonList = style({ display: "grid", gap: 12, padding: "6px 0" });

const SKELETON_WIDTHS = ["92%", "74%", "84%", "66%", "88%"];
SKELETON_WIDTHS.forEach((inlineSize, index) => {
  globalStyle(`${skeletonList} > *:nth-child(5n+${index + 1})`, { inlineSize });
});

export { srOnly } from "./utilities.css";

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

/** Functional loading spinner: neutral ring plus one solid-blue segment. */
export const spinner = style({
  inlineSize: 15,
  blockSize: 15,
  borderRadius: "var(--radius-full)",
  border: "2px solid #D1D5DB",
  borderTopColor: "var(--accent)",
  animation: `${spin} 620ms linear infinite`,
  flexShrink: 0,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
      borderColor: "#D1D5DB",
      borderTopColor: "var(--accent)",
    },
    "(forced-colors: active)": { borderTopColor: "Highlight" },
  },
});

export const loadingRow = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "14px 2px",
  ...text.metadata,
  color: "var(--text-muted)",
});
