import { style } from "@vanilla-extract/css";

/* Quiet information surfaces, separate from the cooler environment. */
export const paintSheet = style({
  backgroundColor: "#FBFCFF",
  border: "1px solid var(--paint-edge)",
  boxShadow: "0 1px 2px rgba(31,48,75,.04), 0 8px 24px rgba(31,48,75,.045)",
});

export const paintSheetStrong = style({
  backgroundColor: "#FFFFFF",
  backgroundImage: "none",
  border: "1px solid var(--paint-edge)",
  boxShadow: "0 2px 5px rgba(31,48,75,.05), 0 12px 30px rgba(31,48,75,.06)",
});
