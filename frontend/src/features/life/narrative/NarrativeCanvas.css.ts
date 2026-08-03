import { globalStyle, style } from "@vanilla-extract/css";

export const shell = style({ marginTop: 30, borderTop: "1px solid var(--border-subtle)", paddingTop: 24 });
export const title = style({ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 });
export const sceneTitle = style({ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 16 });
export const blockList = style({ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 });

export const button = style({ border: "1px solid var(--border-subtle)", borderRadius: 9, padding: "8px 13px", background: "var(--surface)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer", selectors: { "&:disabled": { opacity: .55, cursor: "default" }, "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } } });
export const primary = style([button, { background: "var(--accent)", color: "var(--accent-contrast, white)", borderColor: "transparent" }]);
export const actions = style({ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 });
export const status = style({ color: "var(--text-muted)", minHeight: 24 });
export const recovery = style({ border: "1px solid var(--focus-ring)", borderRadius: 12, padding: 16, marginBottom: 20, background: "var(--active-background)" });
export const missing = style({ border: "1px dashed var(--border-subtle)", borderRadius: 8, padding: 14, color: "var(--text-muted)" });

export const metricBlock = style({ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "16px 20px", background: "var(--surface)" });
export const metricLabel = style({ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" });
export const metricValue = style({ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1 });
export const metricUnit = style({ fontSize: "1rem", color: "var(--text-muted)", marginLeft: 6 });
export const metricDescription = style({ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 6 });

export const calloutBlock = style({ borderLeft: "4px solid var(--focus-ring)", borderRadius: "0 8px 8px 0", padding: "12px 16px", background: "var(--active-background)" });
export const calloutVariant = style({ fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", marginBottom: 6, color: "var(--text-muted)" });

export const timelineBlock = style({ borderLeft: "2px solid var(--border-subtle)", paddingLeft: 16 });
export const timelineHeading = style({ fontWeight: 700, marginBottom: 12 });
export const timelineList = style({ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 });
export const timelineItem = style({ display: "flex", flexDirection: "column", gap: 2 });
export const timelineItemLabel = style({ fontWeight: 600 });
export const timelineItemDesc = style({ color: "var(--text-muted)", fontSize: "0.9rem" });

export const imageCaption = style({ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 });
export const image = style({ display: "block", maxWidth: "100%", height: "auto", borderRadius: 8 });

export const richText = style({ lineHeight: 1.72, color: "var(--text-primary)", overflowWrap: "anywhere" });

export const studioBlock = style({ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 });
export const studioBlockHeader = style({ display: "flex", justifyContent: "space-between", alignItems: "center" });
export const studioBlockKind = style({ fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)" });
export const studioBlockActions = style({ display: "flex", gap: 6 });
export const fieldLabel = style({ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 4 });
export const fieldInput = style({ width: "100%", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 12px", background: "var(--app-background)", color: "var(--text-primary)", fontSize: "1rem", boxSizing: "border-box", selectors: { "&:focus": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 } } });
export const fieldTextarea = style([fieldInput, { minHeight: 80, resize: "vertical" }]);
export const editorWrap = style({ border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 14px", minHeight: 120, background: "var(--app-background)" });
globalStyle(`${editorWrap} .tiptap`, { minHeight: 100, outline: "none" });

export const addBlockBar = style({ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 });
export const addBlockButton = style([button, { fontSize: "0.85rem", padding: "6px 12px" }]);
