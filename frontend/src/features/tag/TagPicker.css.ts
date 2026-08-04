import { style } from "@vanilla-extract/css";
export const root = style({ position: "relative", display: "inline-block" });
export const trigger = style({ fontSize: 12, padding: "3px 10px", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 4, background: "transparent", cursor: "pointer", color: "var(--text-muted, #666)" });
export const dropdown = style({ position: "absolute", zIndex: 100, top: "calc(100% + 4px)", left: 0, minWidth: 220, maxWidth: 320, background: "var(--surface, #fff)", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: 8, display: "flex", flexDirection: "column", gap: 4 });
export const search = style({ width: "100%", padding: "6px 8px", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 4, fontSize: 13, boxSizing: "border-box" });
export const status = style({ margin: "4px 0", fontSize: 13, color: "var(--text-muted, #666)" });
export const list = style({ listStyle: "none", padding: 0, margin: 0, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 });
export const item = style({ width: "100%", textAlign: "left", padding: "5px 8px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, selectors: { "&:hover": { background: "var(--surface-raised, #f3f3f3)" }, "&[aria-pressed='true']": { background: "var(--accent-subtle, #e8f0fe)", fontWeight: 600 } } });
export const close = style({ alignSelf: "flex-end", fontSize: 12, padding: "3px 10px", marginTop: 4, border: "1px solid var(--border-subtle, #ddd)", borderRadius: 4, background: "transparent", cursor: "pointer" });
