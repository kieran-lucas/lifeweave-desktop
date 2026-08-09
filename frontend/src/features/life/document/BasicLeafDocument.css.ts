import { globalStyle, style } from "@vanilla-extract/css";

export const shell = style({ marginTop: 30, borderTop: "1px solid var(--border-subtle)", paddingTop: 24 });
export const actions = style({ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const button = style({ border: "1px solid var(--border-subtle)", borderRadius: 9, padding: "8px 13px", background: "var(--surface)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer", selectors: { "&:disabled": { opacity: .55, cursor: "default" }, "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } } });
export const primary = style([button, { background: "var(--accent)", color: "var(--accent-contrast)", borderColor: "transparent" }]);
export const article = style({ color: "var(--text-primary)", lineHeight: 1.72, fontSize: "1rem", overflowWrap: "anywhere" });
export const status = style({ color: "var(--text-muted)", minHeight: 24 });
export const recovery = style({ border: "1px solid var(--focus-ring)", borderRadius: 12, padding: 16, marginBottom: 20, background: "var(--active-background)" });
export const toolbar = style({ position: "sticky", top: 0, zIndex: 1, display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 0", background: "var(--surface)" });
export const editor = style({ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "14px 18px", minHeight: 320, background: "var(--app-background)" });
export const fileLabel = style([button, { display: "inline-flex", alignItems: "center" }]);
export const hiddenFile = style({ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" });
export const image = style({ display: "block", maxWidth: "100%", height: "auto", borderRadius: 8, margin: "14px 0" });
export const missing = style({ border: "1px dashed var(--border-subtle)", borderRadius: 8, padding: 14, color: "var(--text-muted)" });
export const table = style({ borderCollapse: "collapse", width: "100%", margin: "16px 0" });
globalStyle(`${article} h1, ${article} h2, ${article} h3`, { lineHeight: 1.2, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${article} blockquote`, { borderLeft: "3px solid var(--focus-ring)", marginLeft: 0, paddingLeft: 18, color: "var(--text-muted)" });
globalStyle(`${article} pre`, { overflowX: "auto", padding: 14, borderRadius: 8, background: "var(--sidebar-surface)" });
globalStyle(`${article} th, ${article} td`, { border: "1px solid var(--border-subtle)", padding: 8, textAlign: "left" });
globalStyle(`${editor} .tiptap`, { minHeight: 280, outline: "none" });
globalStyle(`${editor} .tiptap img`, { maxWidth: "100%", height: "auto" });

export const outlineContainer = style({ containerType: "inline-size" });

export const outlineGrid = style({
  display: "grid",
  gap: "1.5rem",
  "@container": {
    "(min-width: 520px)": {
      gridTemplateColumns: "210px minmax(0, 1fr)",
      alignItems: "start",
    },
  },
});

export const outlineColumn = style({
  "@container": {
    "(min-width: 520px)": {
      position: "sticky",
      top: "1.5rem",
    },
  },
});
export const templateChooser = style({ border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 14, maxWidth: 620 });
export const templateOption = style({ display: "grid", gap: 4, padding: 10, borderBottom: "1px solid var(--border-subtle)" });
