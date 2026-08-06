import { globalStyle, style } from "@vanilla-extract/css";

export const controls = style({ display: "grid", gap: "0.5rem", marginBlock: "0.7rem" });
export const actions = style({ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" });
export const button = style({ border: "1px solid currentColor", borderRadius: "0.55rem", background: "transparent", color: "inherit", padding: "0.5rem 0.75rem", cursor: "pointer", selectors: { "&:disabled": { cursor: "not-allowed", opacity: 0.6 } } });
export const fileLabel = style([button, { display: "inline-flex" }]);
export const hiddenFile = style({ position: "absolute", inlineSize: "1px", blockSize: "1px", overflow: "hidden", clipPath: "inset(50%)" });
export const reason = style({ margin: 0, opacity: 0.85 });
export const backdrop = style({ position: "fixed", inset: 0, zIndex: 40, display: "grid", placeItems: "center", padding: "1rem", background: "rgba(0,0,0,0.55)" });
export const dialog = style({ inlineSize: "min(36rem, 100%)", maxBlockSize: "min(42rem, 90vh)", overflow: "auto", border: "1px solid currentColor", borderRadius: "0.8rem", background: "Canvas", color: "CanvasText", padding: "1.1rem", boxShadow: "0 1rem 3rem rgba(0,0,0,0.3)" });
export const metadata = style({ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.35rem 0.8rem" });
globalStyle(`${metadata} dt`, { fontWeight: 700 });
globalStyle(`${metadata} dd`, { margin: 0, overflowWrap: "anywhere" });
export const warnings = style({ margin: 0, paddingInlineStart: "1.1rem", display: "grid", gap: "0.25rem" });
export const error = style({ color: "CanvasText", border: "2px solid currentColor", padding: "0.55rem" });
