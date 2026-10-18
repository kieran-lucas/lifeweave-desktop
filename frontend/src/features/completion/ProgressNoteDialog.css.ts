import { style } from "@vanilla-extract/css";
import { button } from "../../design-system/primitives/controls.css";
import { vars } from "../../design-system/visual/contract.css";

export const field = style({ display: "block", marginBlockEnd: 8, color: vars.color.textPrimary, fontWeight: 600 });
export const form = style({ display: "contents" });
export const input = style({ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 100, padding: 12,
  border: `1px solid ${vars.color.borderStrong}`, borderRadius: vars.radius.control, background: vars.color.surface,
  color: vars.color.textPrimary, font: "inherit", selectors: { "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 } } });
export const error = style({ color: vars.color.danger });
export const hint = style({ color: vars.color.textSecondary, fontSize: 12, marginBlockEnd: 0 });
export const cancel = button.secondary;
export const save = button.primary;
