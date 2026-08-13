import { style } from "@vanilla-extract/css";

/*
 * Flat matte materials.
 * Grain is the only surface texture. There is no wash, gradient, glow, translucent fill or blur.
 */
export const paintSheet = style({
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  border: "1px solid var(--paint-edge)",
  boxShadow: "none",
});

export const paintSheetStrong = style({
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  border: "1px solid var(--paint-edge)",
  boxShadow: "none",
});
