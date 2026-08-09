import { style } from "@vanilla-extract/css";
import { button } from "../design-system/primitives/controls.css";

export const description = style({ margin: 0, color: "var(--text-muted)", lineHeight: 1.55 });
export const field = style({ display: "grid", gap: 6 });
export const input = style({ inlineSize: "100%", boxSizing: "border-box" });
export const confirm = button.primary;
export const cancel = button.secondary;
export const destructive = button.destructive;
