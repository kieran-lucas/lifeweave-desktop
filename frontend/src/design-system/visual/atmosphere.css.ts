import { style } from "@vanilla-extract/css";

/* Decorative atmosphere exports remain for source compatibility but render nothing. */
export const root = style({ display: "none" });
export const aura = style({ display: "none" });
export const veil = style({ display: "none" });
export const lines = style({ display: "none" });
export const orbital = style({});
export const orbitalSlow = style({});
export const stars = style({});
export const starA = style({});
export const starB = style({});
export const starC = style({});
export const petals = style({});
export const prism = style({});

/*
 * Flat matte materials.
 * Grain is the only surface texture. There is no wash, gradient, glow, translucent fill or blur.
 */
export const paintBoard = style({
  backgroundColor: "var(--paint-board)",
  backgroundImage: "var(--paint-grain-fine)",
  border: "1px solid var(--paint-edge)",
  boxShadow: "none",
});

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

/** Compatibility aliases for historic imports. They are plain white paper now. */
export const glass = paintSheet;
export const glassStrong = paintSheetStrong;

export const forcedColorsReset = style({
  "@media": {
    "(forced-colors: active)": {
      background: "Canvas",
      backgroundImage: "none",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      border: "1px solid CanvasText",
      boxShadow: "none",
    },
  },
});

export const selectedGlow = style({ boxShadow: "none" });
export const aboveAtmosphere = style({ position: "relative", zIndex: 1 });

export const progressBar = style({
  appearance: "none",
  WebkitAppearance: "none",
  border: 0,
  borderRadius: "var(--radius-full)",
  overflow: "hidden",
  accentColor: "var(--accent)",
  background: "#E5E7EB",
  color: "var(--accent)",
  selectors: {
    "&::-webkit-progress-bar": {
      background: "#E5E7EB",
      borderRadius: "var(--radius-full)",
    },
    "&::-webkit-progress-value": {
      background: "var(--accent)",
      borderRadius: "var(--radius-full)",
    },
    "&::-moz-progress-bar": {
      background: "var(--accent)",
      borderRadius: "var(--radius-full)",
    },
  },
});
