import { style } from "@vanilla-extract/css";
export const list = style({ display: "flex", flexWrap: "wrap", gap: 4, listStyle: "none", padding: 0, margin: 0 });
export const chip = style({ background: "var(--surface-raised, #f3f3f3)", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 4, padding: "2px 8px", fontSize: 12, color: "var(--text-muted, #666)", lineHeight: "1.4" });
