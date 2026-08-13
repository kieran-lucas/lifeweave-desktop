import { globalStyle, style } from "@vanilla-extract/css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { vars } from "../../../design-system/visual/contract.css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { text } from "../../../design-system/visual/typography.css";

export const shell = style({
  position: "relative",
  minInlineSize: 0,
  minBlockSize: "clamp(500px, 68vh, 820px)",
  overflowAnchor: "none",
});
export const actions = style({ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const destructive = sharedButton.destructive;

export const article = style({
  ...text.editorBody,
  color: "var(--text-primary)",
  overflowWrap: "anywhere",
  padding: "8px 2px 28px",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
});
export const recovery = style({ borderInlineStart: "3px solid var(--accent)", padding: "12px 16px", marginBottom: 20, borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
export const fileLabel = style([sharedButton.secondary, { display: "inline-flex", alignItems: "center" }]);
export const hiddenFile = style({ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" });
export const image = style({ display: "block", maxWidth: "100%", height: "auto", borderRadius: "var(--radius-control)", margin: "14px 0", border: "1px solid var(--paint-edge)" });
export const missing = style({ border: "1px dashed var(--paint-edge)", borderRadius: "var(--radius-control)", padding: 14, color: "var(--text-muted)", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
export const table = style({ borderCollapse: "collapse", width: "100%", margin: "16px 0" });
globalStyle(`${article} h1`, { ...text.editorH1, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${article} h2`, { ...text.editorH2, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${article} h3`, { ...text.editorH3, marginTop: "1.6em", scrollMarginTop: "1.5rem" });
globalStyle(`${shell} > h2`, { ...text.sectionTitle, margin: "0 0 14px" });
globalStyle(`${article} blockquote`, { borderLeft: "3px solid #111111", marginLeft: 0, padding: "10px 0 10px 18px", color: "var(--text-muted)", background: "#FFFFFF" });
globalStyle(`${article} pre`, { overflowX: "auto", padding: 14, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
globalStyle(`${article} th, ${article} td`, { border: "1px solid var(--paint-edge)", padding: 8, textAlign: "left" });
globalStyle(`${article} th`, {
  fontFamily: text.editorBody.fontFamily,
  fontWeight: 400,
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  borderBlockEnd: "1px solid #111111",
});
globalStyle(`${article} th strong, ${article} th b`, { fontWeight: 400 });

export const outlineContainer = style({ containerType: "inline-size" });
export const outlineGrid = style({ display: "grid", gap: "1.5rem", "@container": { "(min-width: 520px)": { gridTemplateColumns: "210px minmax(0, 1fr)", alignItems: "start" } } });
export const outlineColumn = style({ "@container": { "(min-width: 520px)": { position: "sticky", top: "1.5rem" } } });
export const documentCommands = style({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 7,
  marginBlockEnd: 12,
});
export const documentOptions = style({
  position: "relative",
  zIndex: 4,
});
globalStyle(`${documentOptions} > summary`, {
  minBlockSize: 34,
  display: "inline-flex",
  alignItems: "center",
  paddingInline: 12,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceSubtle,
  color: vars.color.textSecondary,
  ...text.metadata,
  fontWeight: 700,
  cursor: "pointer",
  listStyle: "none",
});
globalStyle(`${documentOptions} > summary::-webkit-details-marker`, { display: "none" });
globalStyle(`${documentOptions} > summary:hover`, { borderColor: vars.color.borderStrong, color: vars.color.textPrimary });
globalStyle(`${documentOptions} > summary:focus-visible`, { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 });
export const optionsPanel = style({
  position: "absolute",
  insetBlockStart: 42,
  insetInlineEnd: 0,
  inlineSize: "min(320px, calc(100vw - 48px))",
  boxSizing: "border-box",
  padding: 14,
  border: `1px solid ${vars.color.borderStrong}`,
  borderRadius: vars.radius.floating,
  background: vars.color.surfaceRaised,
  boxShadow: vars.elevation.floating,
});
globalStyle(`${optionsPanel} ${actions}`, { marginBlockEnd: 0 });
export const templateChooser = style({ border: 0, borderBlockStart: "1px solid var(--paint-edge)", padding: "14px 0 0", maxWidth: 620 });
export const templateOption = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: "3px 9px",
  padding: "10px 9px",
  border: "1px solid transparent",
  borderInlineStart: "3px solid transparent",
  borderRadius: "var(--radius-small)",
  selectors: {
    "&:has(input:checked)": { borderInlineStartColor: "var(--accent)", borderColor: "var(--accent)", backgroundColor: "#FFFFFF" },
    "&:focus-within": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
  "@media": { "(forced-colors: active)": { selectors: { "&:has(input:checked)": { borderInlineStartWidth: 4 } } } },
});
globalStyle(`${templateOption} > span`, { gridColumn: 2, ...text.compactBody, color: "var(--text-muted)" });

export const editorShell = style({
  marginBlockStart: 0,
  minInlineSize: 0,
  minBlockSize: "clamp(500px, 68vh, 820px)",
  overflowAnchor: "none",
});
export const editorChrome = style({
  position: "sticky",
  top: 0,
  zIndex: 2,
  overflow: "hidden",
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-surface) var(--radius-surface) var(--radius-control) var(--radius-control)",
  background: vars.color.surfaceRaised,
  boxShadow: vars.elevation.floating,
  "@media": { "(forced-colors: active)": { background: "Canvas", borderColor: "CanvasText", boxShadow: "none" } },
});
export const commandRow = style({
  minBlockSize: 58,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  padding: "10px 12px 9px 14px",
  borderBlockEnd: "1px solid var(--paint-edge)",
  "@media": { "(max-width: 720px)": { justifyContent: "flex-start" } },
});
export const editorStatus = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  margin: "0 4px 0 0",
  color: "var(--text-muted)",
  ...text.metadata,
  selectors: {
    "&::before": { content: "", inlineSize: 7, blockSize: 7, flex: "0 0 7px", borderRadius: "50%", background: "currentColor" },
    '&[data-state="1"]': { color: vars.color.warning },
    '&[data-state="2"]': { color: vars.color.accent },
    '&[data-state="3"]': { color: vars.color.success },
    '&[data-state="4"]': { color: vars.color.accent },
    '&[data-state="5"]': { color: vars.color.accent },
    '&[data-state="6"]': { color: vars.color.danger },
  },
  "@media": { "(forced-colors: active)": { color: "CanvasText" } },
});
export const backButton = sharedButton.secondary;
export const saveButton = sharedButton.primary;
export const toolbar = style({ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", padding: "7px 9px", scrollbarGutter: "stable" });
export const tableTools = style({ display: "flex", alignItems: "center", gap: 5, overflowX: "auto", padding: "6px 9px", borderBlockStart: "1px solid var(--paint-edge)", background: vars.color.surfaceSubtle, scrollbarGutter: "stable" });
export const tableHint = style({ flex: "0 0 auto", paddingInline: 4, color: "var(--text-muted)", ...text.metadata });
export const toolbarGroup = style({ display: "inline-flex", alignItems: "center", gap: 2, flex: "0 0 auto", paddingInlineEnd: 6, borderInlineEnd: "1px solid var(--paint-edge)" });
globalStyle(`${toolbarGroup}:last-child`, { paddingInlineEnd: 0, borderInlineEnd: 0 });
globalStyle(`${toolbarGroup}:first-child > :first-child`, { fontWeight: 700 });
globalStyle(`${toolbarGroup}:first-child > :nth-child(2)`, { fontStyle: "italic" });
export const toolbarButton = style([sharedButton.ghost, compact, {
  minInlineSize: 30,
  minBlockSize: 30,
  paddingInline: 9,
  selectors: { '&[aria-pressed="true"]': { color: vars.color.textOnAccent, backgroundColor: vars.color.surfaceSelected, borderColor: vars.color.surfaceSelected } },
  "@media": { "(forced-colors: active)": { selectors: { '&[aria-pressed="true"]': { color: "HighlightText", background: "Highlight", borderColor: "Highlight" } } } },
}]);
export const toolbarFileLabel = style([toolbarButton, { display: "inline-flex", alignItems: "center" }]);
export const editorHiddenFile = style({ position: "absolute", inlineSize: 1, blockSize: 1, overflow: "hidden", clip: "rect(0 0 0 0)" });
export const editorSurface = style({
  minBlockSize: "clamp(420px, 58vh, 760px)",
  marginBlockStart: 16,
  overflowX: "auto",
  overflowY: "hidden",
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-surface)",
  background: vars.color.surface,
  transition: `border-color ${duration.state} ${easing.standard}, outline-color ${duration.state} ${easing.standard}`,
  selectors: { "&:focus-within": { borderColor: vars.color.borderStrong, outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 } },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
    "(forced-colors: active)": { borderColor: "CanvasText", boxShadow: "none" },
  },
});
globalStyle(`${editorSurface} .tiptap`, { minBlockSize: "clamp(420px, 58vh, 760px)", minInlineSize: "max(100%, 520px)", boxSizing: "border-box", padding: "clamp(24px, 4vw, 48px)", outline: "none", color: "var(--text-primary)", caretColor: "var(--text-primary)", overflowWrap: "anywhere", userSelect: "text", WebkitUserSelect: "text", ...text.editorBody });
globalStyle(`${editorSurface} .tiptap > :first-child`, { marginBlockStart: 0 });
globalStyle(`${editorSurface} .tiptap h1`, { ...text.editorH1, marginBlock: "1.55em .55em" });
globalStyle(`${editorSurface} .tiptap h2`, { ...text.editorH2, marginBlock: "1.5em .5em" });
globalStyle(`${editorSurface} .tiptap h3`, { ...text.editorH3, marginBlock: "1.45em .45em" });
globalStyle(`${editorSurface} .tiptap blockquote`, { marginInline: 0, padding: "8px 0 8px 18px", borderInlineStart: "3px solid #111111", color: "var(--text-muted)" });
globalStyle(`${editorSurface} .tiptap pre`, { overflowX: "auto", padding: 14, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", background: vars.color.surfaceSubtle, ...text.code });
globalStyle(`${editorSurface} .tiptap img`, { display: "block", maxInlineSize: "100%", blockSize: "auto", marginBlock: 18, borderRadius: "var(--radius-control)" });
globalStyle(`${editorSurface} .tiptap table`, { inlineSize: "100%", minInlineSize: 480, tableLayout: "fixed", borderCollapse: "collapse", marginBlock: 18 });
globalStyle(`${editorSurface} .tiptap th, ${editorSurface} .tiptap td`, { position: "relative", minInlineSize: 110, padding: "9px 10px", border: "1px solid var(--paint-edge)", textAlign: "start", verticalAlign: "top" });
globalStyle(`${editorSurface} .tiptap th`, { background: vars.color.surfaceSubtle, fontWeight: 650 });
globalStyle(`${editorSurface} .tiptap .selectedCell::after`, { content: "", position: "absolute", inset: 0, pointerEvents: "none", background: vars.color.accentSoft, outline: `2px solid ${vars.color.accent}` });
export const editorAlert = style({ margin: "12px 0 0", padding: "10px 12px", borderInlineStart: "3px solid var(--danger)", background: vars.color.dangerSoft, color: vars.color.danger, ...text.compactBody });
