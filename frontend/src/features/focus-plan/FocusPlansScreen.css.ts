import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { splitWorkspace } from "../../app/layout/layout.css";
import { family, text } from "../../design-system/visual/typography.css";
import { tab as sharedTab } from "../../design-system/primitives/navigation.css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const heading = style({ margin: 0, ...text.display, color: "var(--text-primary)" });
export const lede = style({ margin: 0, color: "var(--text-muted)", maxInlineSize: "70ch" });
export const createForm = style({ display: "grid", gridTemplateColumns: "minmax(11rem, 1fr) auto", alignItems: "center", gap: space.control, inlineSize: "min(24rem, 100%)", minInlineSize: 0, "@media": { "(max-width: 700px)": { inlineSize: "100%" } } });
export const portfolios = style({ display: "flex", gap: space.x3, flexWrap: "wrap", borderBottom: "1px solid var(--paint-edge)" });
export const tab = sharedTab;
export const workspace = style([splitWorkspace, { vars: { "--lw-split-columns": "minmax(240px, 320px) minmax(0, 1fr)" }, gap: space.x4 }]);

/** Master rail = painted index board. */
export const listPanel = style({
  padding: space.x3,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-surface)",
  backgroundColor: "var(--paint-board)",
  backgroundImage: "var(--paint-grain)",
  boxShadow: "var(--glow-crystal)",
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
  scrollbarGutter: "stable",
  "@media": { "(max-width: 700px)": { maxHeight: "none" } },
});
export const planList = style({ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 3 });

export const planButton = style({
  position: "relative",
  width: "100%",
  display: "grid",
  gap: "4px",
  textAlign: "left",
  padding: "14px 12px 14px 16px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}`,
  selectors: {
    "&::before": { content: '""', position: "absolute", insetBlock: 10, insetInlineStart: 0, inlineSize: 3, borderRadius: "var(--radius-full)", background: "transparent" },
    "&:hover": { backgroundColor: "var(--surface-hover)", backgroundImage: "var(--paint-grain-fine)", transform: "translateY(-1px)" },
    '&[aria-current="true"]': { backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)", borderColor: "var(--paint-edge-strong)", boxShadow: "var(--glow-selected)" },
    '&[aria-current="true"]::before': { background: "var(--accent)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } },
    "(forced-colors: active)": { selectors: { '&[aria-current="true"]': { borderInlineStart: "3px solid Highlight", boxShadow: "none", background: "Canvas" } } },
  },
});

/** Detail = one manuscript sheet with shared grain; sections are ink rules, not nested cards. */
export const detailPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  padding: space.x4,
  minInlineSize: 0,
  border: "1px solid var(--paint-edge-strong)",
  borderRadius: "var(--radius-surface)",
  backgroundColor: "var(--paint-sheet-strong)",
  backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue), var(--paint-wash-violet)",
  boxShadow: "var(--glow-hero)",
  "@media": { "(max-width: 700px)": { padding: space.x3 } },
});
export const detailHeader = style({ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: space.field, alignItems: "start", minInlineSize: 0, "@media": { "(max-width: 700px)": { gridTemplateColumns: "1fr" } } });
globalStyle(`${detailHeader} h2`, { ...text.objectTitle, margin: 0, fontFamily: family.editorial });
globalStyle(`${detailPanel} > section`, { borderBlockStart: "1px solid var(--paint-edge)", paddingBlockStart: space.group });
globalStyle(`${detailPanel} > section > h3`, { ...text.sectionTitle, margin: `0 0 ${space.x3}` });

export const fieldset = style({ display: "grid", gap: space.x3, border: 0, borderBlockStart: "1px solid var(--paint-edge)", borderRadius: 0, background: "transparent", padding: `${space.group} 0 0`, margin: 0 });
export const tagFieldset = style({ display: "flex", flexWrap: "wrap", gap: "10px", border: 0, background: "transparent", padding: `${space.x2} 0`, margin: 0 });
export const checkLabel = style({ display: "inline-flex", gap: "6px", alignItems: "center" });
export const twoColumns = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", "@media": { "(max-width: 700px)": { gridTemplateColumns: "1fr" } } });
export const input = style({ width: "100%", boxSizing: "border-box", minInlineSize: 0 });
export const createInput = style([input, { inlineSize: "100%", minInlineSize: 0 }]);
export const textarea = style([input, { minHeight: "94px", resize: "vertical" }]);
export const actions = style({ display: "flex", gap: "8px", flexWrap: "wrap" });
export const error = style({ color: "var(--danger)", padding: "10px 12px", border: "1px solid currentColor", borderRadius: "var(--radius-control)", backgroundColor: "color-mix(in srgb, var(--danger) 5%, var(--paint-sheet))", backgroundImage: "var(--paint-grain-fine)" });
export const muted = style({ ...text.metadata, color: "var(--text-muted)" });
export const emptyState = style({ alignSelf: "center", maxInlineSize: "28rem", color: "var(--text-muted)", textAlign: "center", padding: "clamp(32px, 8vh, 72px) 20px", fontFamily: family.editorial });
export const draftNote = style({ color: "var(--text-muted)", margin: 0, padding: space.x3, borderInlineStart: "3px solid var(--accent)", borderRadius: "0 var(--radius-control) var(--radius-control) 0", backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine)" });
export const variantTabs = style({ display: "flex", gap: space.x1, flexWrap: "wrap", marginBottom: space.x3, borderBlockEnd: "1px solid var(--paint-edge)" });
export const variantControl = style({ display: "inline-flex", gap: "3px", alignItems: "center" });
export const variantEditor = style({ display: "grid", gap: space.x3, paddingTop: space.x3 });
export const inlineForm = style({ display: "flex", gap: "8px", alignItems: "center", margin: "10px 0", flexWrap: "wrap" });
export const phaseList = style({ display: "grid", gap: 0, paddingLeft: space.group, margin: 0, fontVariantNumeric: "tabular-nums" });
export const phaseRow = style({ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) auto auto auto", gap: space.x1, alignItems: "center", paddingBlock: space.x2, borderBlockEnd: "1px solid var(--paint-edge)", "@media": { "(max-width: 650px)": { gridTemplateColumns: "minmax(120px, 1fr) auto auto auto" } } });
globalStyle(`ol${planList} > li`, { paddingBlock: space.x3, borderBlockEnd: "1px solid var(--paint-edge)" });
globalStyle(`ol${planList} article h4`, { margin: 0 });
globalStyle(`ol${planList} article p`, { margin: `${space.x2} 0 0`, maxInlineSize: "68ch" });
export { srOnly } from "../../design-system/primitives/utilities.css";
