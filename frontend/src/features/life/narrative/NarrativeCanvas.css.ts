import { globalStyle, style } from "@vanilla-extract/css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { tab, tabList } from "../../../design-system/primitives/navigation.css";
import { focusRing } from "../../../design-system/primitives/utilities.css";
import { text } from "../../../design-system/visual/typography.css";

export const shell = style({ marginTop: 30, borderTop: "1px solid var(--paint-edge)", paddingTop: 24 });
export const canvas = style({ ...text.editorBody, color: "var(--text-primary)", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
export const title = style({ ...text.display, margin: "0 0 28px", color: "var(--text-primary)" });
export const scene = style({ paddingBlock: "20px 10px", borderBlockStart: "1px solid var(--world-rule, var(--paint-edge))" });
export const sceneTitle = style({ ...text.editorH2, color: "var(--text-primary)", margin: "0 0 18px" });
export const blockList = style({ display: "flex", flexDirection: "column", gap: 24, marginBottom: 24 });

export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const destructive = sharedButton.destructive;
export const studioButton = style([sharedButton.secondary, compact]);
export const studioPrimary = style([sharedButton.primary, compact]);
export const studioDestructive = style([sharedButton.destructive, compact, { marginInlineStart: 6 }]);
export const actions = style({ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const status = style({ ...text.metadata, color: "var(--text-muted)", minHeight: 24 });
export const recovery = style({ borderInlineStart: "3px solid var(--accent)", padding: "12px 16px", marginBottom: 20, borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
export const missing = style({ borderInlineStart: "3px solid var(--paint-edge)", padding: "12px 14px", borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)", color: "var(--text-muted)", ...text.compactBody });

export const metricBlock = style({ borderInlineStart: "3px solid var(--accent)", padding: "13px 18px", borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
export const metricLabel = style({ ...text.eyebrow, color: "var(--text-muted)" });
export const metricValue = style({ ...text.numericMetric, color: "var(--accent)" });
export const metricUnit = style({ ...text.bodyStrong, color: "var(--text-muted)", marginLeft: 6 });
export const metricDescription = style({ ...text.compactBody, color: "var(--text-muted)", marginTop: 6 });

export const calloutBlock = style({ borderInlineStart: "3px solid var(--accent)", padding: "13px 18px", borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)" });
export const calloutVariant = style({ ...text.eyebrow, marginBottom: 6, color: "var(--text-muted)" });

export const timelineBlock = style({ borderLeft: "2px solid var(--accent)", paddingLeft: 16 });
export const timelineHeading = style({ ...text.editorH3, marginBottom: 12 });
export const timelineList = style({ padding: "0 0 0 22px", margin: 0, display: "flex", flexDirection: "column", gap: 12 });
export const timelineItem = style({ paddingInlineStart: 4 });
export const timelineItemLabel = style({ display: "block", ...text.bodyStrong });
export const timelineItemDesc = style({ display: "block", color: "var(--text-muted)", ...text.compactBody, marginTop: 2 });

export const figure = style({ margin: 0 });
export const imageCaption = style({ ...text.metadata, color: "var(--text-muted)", marginTop: 8 });
export const image = style({ display: "block", width: "100%", height: "auto", border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)" });
export const richText = style({ lineHeight: 1.72, color: "var(--text-primary)", overflowWrap: "anywhere" });

export const readerTools = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
  padding: 14,
  marginBlock: "8px 22px",
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "1fr", gap: 14 } },
});
export const readerUtilityGrid = style({ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24, alignItems: "start", "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "1fr" } } });
export const exportControl = style({ display: "grid", gap: 8, alignContent: "start", justifyItems: "start" });
globalStyle(`${readerUtilityGrid} > section`, { margin: 0, alignContent: "start" });
globalStyle(`${shell} > h2`, { margin: "0 0 14px", ...text.sectionTitle });
globalStyle(`${recovery} > h3`, { margin: "0 0 6px", ...text.sectionTitle });
globalStyle(`${recovery} > p`, { margin: "0 0 10px", ...text.body });

export const studioShell = style({
  display: "grid",
  gap: 14,
  padding: 16,
  border: "1px solid var(--accent)",
  borderRadius: "var(--radius-surface)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
});
export const studioHeader = style({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "4px 4px 12px", borderBottom: "1px solid var(--accent)" });
export const studioHeading = style({ margin: 0, ...text.objectTitle });
export const studioActions = style({ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" });
export const studioTitleField = style({ display: "grid", gap: 5 });

export const studioBlock = style({
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-surface)",
  padding: 16,
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  selectors: {
    '&[data-kind="callout"]': { borderInlineStart: "3px solid var(--accent)", backgroundColor: "#FFFFFF" },
  },
});
export const studioBlockHeader = style({ display: "flex", justifyContent: "space-between", alignItems: "center" });
export const studioBlockKind = style({ ...text.eyebrow, color: "var(--text-muted)" });
export const studioBlockActions = style({ display: "flex", gap: 6 });
export const fieldLabel = style({ ...text.label, display: "block", marginBottom: 4, color: "var(--text-muted)" });
export const fieldInput = style([focusRing, { width: "100%", border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", padding: "8px 12px", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)", color: "var(--text-primary)", ...text.body, boxSizing: "border-box" }]);
export const fieldTextarea = style([fieldInput, { minHeight: 80, resize: "vertical" }]);
export const editorWrap = style({ border: "1px solid var(--accent)", borderRadius: "var(--radius-control)", padding: "12px 14px", minHeight: 120, backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)", boxShadow: "none" });
globalStyle(`${editorWrap} .tiptap`, { minHeight: 100, outline: "none", ...text.editorBody });

export const addBlockBar = style({ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 });
export const addBlockButton = studioButton;
export const dragHandle = style([studioButton, { cursor: "grab", selectors: { "&:active": { cursor: "grabbing" } } }]);
export const staticPreview = style([focusRing, { width: "100%", textAlign: "left", border: "1px solid transparent", borderInlineStart: "3px solid transparent", borderRadius: "var(--radius-small)", padding: "8px 12px", minHeight: 48, background: "transparent", color: "var(--text-primary)", cursor: "text", ...text.editorBody, selectors: { "&:hover": { borderInlineStartColor: "var(--accent)", borderColor: "var(--paint-edge)", backgroundColor: "#F5F5F5" } } }]);
export const importButton = style([button, { marginBottom: 8 }]);
export const previewImage = style([image, { maxHeight: 220, objectFit: "contain", marginTop: 2, backgroundColor: "#FFFFFF" }]);
export const metricEditor = style({ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, .8fr)", gap: 10, alignItems: "end", "@media": { "screen and (max-width: 620px)": { gridTemplateColumns: "1fr" } } });
export const metricField = style({ display: "grid", gap: 4 });
export const metricDescriptionField = style([metricField, { gridColumn: "1 / -1" }]);
export const timelineItems = style({ display: "grid", gap: 0, margin: "6px 0 12px", borderBlockStart: "1px solid var(--paint-edge)" });
export const timelineItemEditor = style({ padding: "12px 0", display: "flex", flexDirection: "column", gap: 7, borderBlockEnd: "1px solid var(--paint-edge)" });

export const sceneTabBar = style({ display: "flex", gap: 8, overflowX: "auto", marginBottom: 2 });
export const sceneTabList = style([tabList, { minWidth: 0, flexGrow: 1, overflowX: "auto", overflowY: "clip" }]);
export const sceneTab = tab;
export const sceneTabActive = tab;
export const sceneTabAdd = style([sharedButton.ghost, compact, { alignSelf: "center" }]);
export const sceneControls = style({ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginBottom: 12 });
export const sceneRenameInput = style([focusRing, { flexGrow: 1, minWidth: 0, background: "none", border: "none", borderBottom: "1px solid var(--paint-edge)", borderRadius: 0, padding: "4px 0", color: "var(--text-primary)", ...text.bodyStrong, selectors: { "&:focus-visible": { borderBottomColor: "var(--focus-ring)" } } }]);
export { srOnly } from "../../../design-system/primitives/utilities.css";
