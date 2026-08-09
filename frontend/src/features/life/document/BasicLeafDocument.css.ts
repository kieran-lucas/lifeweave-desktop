import { globalStyle, style } from "@vanilla-extract/css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

export const shell = style({ marginTop: 30, borderTop: "1px solid var(--border-subtle)", paddingTop: 24 });
export const actions = style({ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const article = style({ ...text.editorBody, color: "var(--text-primary)", overflowWrap: "anywhere" });
export const status = style({ ...text.metadata, color: "var(--text-muted)", minHeight: 24 });
export const recovery = style({ border: "1px solid var(--focus-ring)", borderRadius: "var(--radius-surface)", padding: 16, marginBottom: 20, background: "var(--active-background)" });
export const toolbar = style({ position: "sticky", top: 0, zIndex: 1, display: "flex", flexWrap: "wrap", gap: 2, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", background: "color-mix(in srgb, var(--surface) 94%, transparent)" });
export const toolbarButton = style([sharedButton.ghost, compact, { minInlineSize: 30, selectors: { '&[aria-pressed="true"]': { color: "var(--accent)", background: "var(--active-background)" } } }]);
export const editor = style({ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-surface)", padding: "20px 22px", minHeight: 360, background: "var(--surface)", selectors: { "&:focus-within": { borderColor: "color-mix(in srgb, var(--accent) 45%, var(--border-subtle))" } } });
export const fileLabel = style([sharedButton.secondary, { display: "inline-flex", alignItems: "center" }]);
export const toolbarFileLabel = style([toolbarButton, { display: "inline-flex", alignItems: "center" }]);
export const hiddenFile = style({ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" });
export const image = style({ display: "block", maxWidth: "100%", height: "auto", borderRadius: "var(--radius-control)", margin: "14px 0" });
export const missing = style({ border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-control)", padding: 14, color: "var(--text-muted)" });
export const table = style({ borderCollapse: "collapse", width: "100%", margin: "16px 0" });
globalStyle(`${article} h1, ${article} h2, ${article} h3`, { lineHeight: 1.2, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${shell} > h2`, { ...text.sectionTitle, margin: "0 0 14px" });
globalStyle(`${article} blockquote`, { borderLeft: "3px solid var(--focus-ring)", marginLeft: 0, paddingLeft: 18, color: "var(--text-muted)" });
globalStyle(`${article} pre`, { overflowX: "auto", padding: 14, borderRadius: "var(--radius-control)", background: "var(--sidebar-surface)" });
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
export const templateChooser = style({ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", padding: 14, maxWidth: 620 });
export const templateOption = style({ display: "grid", gap: 4, padding: 10, borderBottom: "1px solid var(--border-subtle)" });
