import { globalStyle, style } from "@vanilla-extract/css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

export const shell = style({ marginTop: 30, borderTop: "1px solid var(--border-subtle)", paddingTop: 24 });
export const canvas = style({ ...text.editorBody, color: "var(--text-primary)" });
export const title = style({ ...text.display, margin: "0 0 28px", color: "var(--text-primary)" });
export const scene = style({ paddingBlock: "18px 8px", borderBlockStart: "1px solid var(--world-rule, var(--border-subtle))" });
export const sceneTitle = style({ ...text.editorH2, color: "var(--text-primary)", margin: "0 0 18px" });
export const blockList = style({ display: "flex", flexDirection: "column", gap: 24, marginBottom: 24 });

export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const destructive = sharedButton.destructive;
export const studioButton = style([sharedButton.secondary, compact]);
export const studioPrimary = style([sharedButton.primary, compact]);
export const actions = style({ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const status = style({ ...text.metadata, color: "var(--text-muted)", minHeight: 24 });
export const recovery = style({ borderInlineStart: "3px solid var(--accent)", padding: "12px 16px", marginBottom: 20, background: "var(--active-background)" });
export const missing = style({ borderInlineStart: "3px solid var(--border-strong)", padding: "12px 14px", background: "var(--active-background)", color: "var(--text-muted)", ...text.compactBody });

export const metricBlock = style({ borderInlineStart: "3px solid var(--world-rule, var(--accent))", padding: "12px 18px", background: "color-mix(in srgb, var(--active-background) 58%, transparent)" });
export const metricLabel = style({ ...text.eyebrow, color: "var(--text-muted)" });
export const metricValue = style({ ...text.numericMetric });
export const metricUnit = style({ ...text.bodyStrong, color: "var(--text-muted)", marginLeft: 6 });
export const metricDescription = style({ ...text.compactBody, color: "var(--text-muted)", marginTop: 6 });

export const calloutBlock = style({ borderInlineStart: "3px solid var(--world-rule, var(--accent))", padding: "12px 18px", background: "var(--active-background)" });
export const calloutVariant = style({ ...text.eyebrow, marginBottom: 6, color: "var(--text-muted)" });

export const timelineBlock = style({ borderLeft: "2px solid var(--world-rule, var(--border-subtle))", paddingLeft: 16 });
export const timelineHeading = style({ ...text.editorH3, marginBottom: 12 });
export const timelineList = style({ padding: "0 0 0 22px", margin: 0, display: "flex", flexDirection: "column", gap: 12 });
export const timelineItem = style({ paddingInlineStart: 4 });
export const timelineItemLabel = style({ display: "block", ...text.bodyStrong });
export const timelineItemDesc = style({ display: "block", color: "var(--text-muted)", ...text.compactBody, marginTop: 2 });

export const figure = style({ margin: 0 });
export const imageCaption = style({ ...text.metadata, color: "var(--text-muted)", marginTop: 8 });
export const image = style({ display: "block", width: "100%", height: "auto", borderRadius: "var(--radius-control)" });

export const richText = style({ lineHeight: 1.72, color: "var(--text-primary)", overflowWrap: "anywhere" });

export const readerTools = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
  paddingBlock: 16,
  marginBlock: "8px 22px",
  borderBlock: "1px solid var(--border-subtle)",
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "1fr", gap: 14 } },
});
export const readerUtilityGrid = style({ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24, alignItems: "start", "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "1fr" } } });
export const exportControl = style({ display: "grid", gap: 8, alignContent: "start", justifyItems: "start" });
globalStyle(`${readerUtilityGrid} > section`, { margin: 0, alignContent: "start" });
globalStyle(`${shell} > h2`, { margin: "0 0 14px", ...text.sectionTitle });
globalStyle(`${recovery} > h3`, { margin: "0 0 6px", ...text.sectionTitle });
globalStyle(`${recovery} > p`, { margin: "0 0 10px", ...text.body });

export const studioShell = style({ display: "grid", gap: 12 });
export const studioHeader = style({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid var(--border-subtle)" });
export const studioHeading = style({ margin: 0, fontSize: "1.4rem" });
export const studioActions = style({ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" });
export const studioTitleField = style({ display: "grid", gap: 5 });

export const studioBlock = style({ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-surface)", padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 });
export const studioBlockHeader = style({ display: "flex", justifyContent: "space-between", alignItems: "center" });
export const studioBlockKind = style({ fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)" });
export const studioBlockActions = style({ display: "flex", gap: 6 });
export const fieldLabel = style({ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 4 });
export const fieldInput = style({ width: "100%", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", padding: "8px 12px", background: "var(--app-background)", color: "var(--text-primary)", fontSize: "1rem", boxSizing: "border-box", selectors: { "&:focus": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 } } });
export const fieldTextarea = style([fieldInput, { minHeight: 80, resize: "vertical" }]);
export const editorWrap = style({ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", padding: "10px 14px", minHeight: 120, background: "var(--app-background)" });
globalStyle(`${editorWrap} .tiptap`, { minHeight: 100, outline: "none" });

export const addBlockBar = style({ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 });
export const addBlockButton = studioButton;
export const dragHandle = style([studioButton, { cursor: "grab", selectors: { "&:active": { cursor: "grabbing" } } }]);
export const staticPreview = style({ width: "100%", textAlign: "left", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-control)", padding: "10px 14px", minHeight: 48, background: "var(--app-background)", color: "var(--text-muted)", cursor: "text", fontSize: "0.9rem" });
export const importButton = style([button, { marginBottom: 8 }]);
export const previewImage = style([image, { maxHeight: 200, marginTop: 8 }]);
export const timelineItemEditor = style({ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", padding: 10, display: "flex", flexDirection: "column", gap: 6, background: "var(--app-background)" });

export const sceneTabBar = style({ display: "flex", gap: 4, padding: "8px 0 0", overflowX: "auto", borderBottom: "1px solid var(--border-subtle)", marginBottom: 8 });
export const sceneTabList = style({ display: "flex", gap: 4, minWidth: 0, flexGrow: 1, overflowX: "auto" });
export const sceneTab = style({ padding: "6px 14px", borderRadius: "var(--radius-small) var(--radius-small) 0 0", cursor: "pointer", background: "none", border: "1px solid transparent", borderBottom: "none", color: "var(--text-muted)", fontWeight: 500, selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } } });
export const sceneTabActive = style([sceneTab, { background: "var(--glass-surface-strong)", border: "1px solid var(--glass-border)", boxShadow: "inset 0 1px 0 var(--glass-highlight)", borderBottom: "1px solid var(--surface)", color: "var(--text-primary)", fontWeight: 700, marginBottom: -1 }]);
export const sceneTabAdd = style({ padding: "6px 10px", background: "none", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-small)", cursor: "pointer", color: "var(--text-muted)", alignSelf: "center", marginBottom: 4, selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } } });
export const sceneControls = style({ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginBottom: 12 });
export const sceneRenameInput = style({ flexGrow: 1, background: "none", border: "none", borderBottom: "1px solid var(--border-subtle)", padding: "4px 0", fontSize: "0.95rem", color: "var(--text-primary)", selectors: { "&:focus": { outline: "none", borderBottomColor: "var(--focus-ring)" } } });
export { srOnly } from "../../../design-system/primitives/utilities.css";
