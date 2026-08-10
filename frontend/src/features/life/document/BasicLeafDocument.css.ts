import { globalStyle, style } from "@vanilla-extract/css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

export const shell = style({ marginTop: 30, borderTop: "1px solid var(--border-subtle)", paddingTop: 24 });
export const actions = style({ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const destructive = sharedButton.destructive;
export const article = style({ ...text.editorBody, color: "var(--text-primary)", overflowWrap: "anywhere" });
export const status = style({ ...text.metadata, color: "var(--text-muted)", minHeight: 24 });
export const recovery = style({ borderInlineStart: "3px solid var(--accent)", padding: "12px 16px", marginBottom: 20, background: "var(--active-background)" });
export const toolbar = style({ position: "sticky", top: 0, zIndex: 1, display: "flex", flexWrap: "wrap", gap: 2, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", background: "color-mix(in srgb, var(--surface) 94%, transparent)" });
export const toolbarButton = style([sharedButton.ghost, compact, { minInlineSize: 30, selectors: { '&[aria-pressed="true"]': { color: "var(--accent)", background: "var(--active-background)" } } }]);
export const editor = style({ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-surface)", padding: "20px 22px", minHeight: 360, background: "var(--surface)", selectors: { "&:focus-within": { borderColor: "color-mix(in srgb, var(--accent) 45%, var(--border-subtle))" } } });
export const fileLabel = style([sharedButton.secondary, { display: "inline-flex", alignItems: "center" }]);
export const toolbarFileLabel = style([toolbarButton, { display: "inline-flex", alignItems: "center" }]);
export const hiddenFile = style({ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" });
export const image = style({ display: "block", maxWidth: "100%", height: "auto", borderRadius: "var(--radius-control)", margin: "14px 0" });
export const missing = style({ border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-control)", padding: 14, color: "var(--text-muted)" });
export const table = style({ borderCollapse: "collapse", width: "100%", margin: "16px 0" });
globalStyle(`${article} h1, ${editor} .tiptap h1`, { ...text.editorH1, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${article} h2, ${editor} .tiptap h2`, { ...text.editorH2, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${article} h3, ${editor} .tiptap h3`, { ...text.editorH3, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${shell} > h2`, { ...text.sectionTitle, margin: "0 0 14px" });
globalStyle(`${article} blockquote`, { borderLeft: "3px solid var(--focus-ring)", marginLeft: 0, paddingLeft: 18, color: "var(--text-muted)" });
globalStyle(`${article} pre`, { overflowX: "auto", padding: 14, borderRadius: "var(--radius-control)", background: "var(--sidebar-surface)" });
globalStyle(`${article} th, ${article} td, ${editor} .tiptap th, ${editor} .tiptap td`, { border: "1px solid var(--border-subtle)", padding: 8, textAlign: "left" });
globalStyle(`${article} th, ${editor} .tiptap th`, {
  fontFamily: text.editorBody.fontFamily,
  fontWeight: 400,
  background: "var(--surface-subtle)",
  borderBlockEnd: "1px solid var(--border-strong)",
});
globalStyle(`${article} th strong, ${article} th b, ${editor} .tiptap th strong, ${editor} .tiptap th b`, { fontWeight: 400 });
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
export const templateChooser = style({ border: 0, borderBlockStart: "1px solid var(--border-subtle)", padding: "14px 0 0", maxWidth: 620 });
export const templateOption = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: "3px 9px",
  padding: "10px 8px",
  borderInlineStart: "2px solid transparent",
  borderBottom: "1px solid var(--border-subtle)",
  selectors: {
    "&:has(input:checked)": { borderInlineStartColor: "var(--accent)", background: "var(--active-background)" },
    "&:focus-within": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
  "@media": { "(forced-colors: active)": { selectors: { "&:has(input:checked)": { borderInlineStartWidth: 4 } } } },
});
globalStyle(`${templateOption} > span`, { gridColumn: 2, ...text.compactBody, color: "var(--text-muted)" });
