import { style } from "@vanilla-extract/css";

/** The single visually-hidden utility used by live regions, labels, captions, and file inputs. */
export const srOnly = style({
  position: "absolute",
  inlineSize: 1,
  blockSize: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
});

/** Canonical visible focus treatment for controls that need a class-level recipe. */
export const focusRing = style({
  selectors: {
    "&:focus-visible": {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: 2,
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        "&:focus-visible": { outlineColor: "Highlight" },
      },
    },
  },
});

/** Use only when overflow clipping makes the ordinary offset ring impossible. */
export const focusRingInset = style({
  selectors: {
    "&:focus-visible": {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: -2,
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        "&:focus-visible": { outlineColor: "Highlight" },
      },
    },
  },
});
