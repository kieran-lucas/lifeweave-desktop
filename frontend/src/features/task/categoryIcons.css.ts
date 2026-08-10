import { style } from "@vanilla-extract/css";

/**
 * Category glyph frame. The semantic variety comes from the shared Fluent paths; this wrapper only
 * normalizes optical size/alignment so custom categories never create a second icon language.
 */
export const mark = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 18,
  blockSize: 18,
  flexShrink: 0,
  verticalAlign: "-0.14em",
  color: "currentColor",
  opacity: 0.82,
  selectors: {
    "& > svg": { display: "block", inlineSize: 16, blockSize: 16 },
  },
  "@media": {
    "(forced-colors: active)": { color: "CanvasText", opacity: 1 },
  },
});
