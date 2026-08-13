import { style } from "@vanilla-extract/css";

import { button } from "../../design-system/primitives/controls.css";

export const field = style({ display: "grid", gap: 7, color: "#333333", fontSize: 13, fontWeight: 680 });
export const input = style({
  inlineSize: "100%",
  boxSizing: "border-box",
  minBlockSize: 48,
  paddingInline: 12,
  border: "1px solid #BEBEBE",
  borderRadius: 10,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 20,
  fontWeight: 720,
  fontVariantNumeric: "tabular-nums",
  selectors: {
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2, borderColor: "#111111" },
  },
});
export const error = style({ margin: "10px 0 0", color: "#A12E31", fontSize: 12.5, lineHeight: 1.45 });
export const cancel = button.secondary;
export const clear = button.ghost;
export const save = style([
  button.primary,
  { background: "#111111", borderColor: "#111111", selectors: { "&:hover:not(:disabled)": { background: "#2C2C2C", borderColor: "#2C2C2C" } } },
]);

