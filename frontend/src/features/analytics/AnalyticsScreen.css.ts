import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";
import { paintSheet, paintSheetStrong } from "../../design-system/visual/atmosphere.css";
import { text } from "../../design-system/visual/typography.css";
import { button, compact } from "../../design-system/primitives/controls.css";
import { segmented, segmentedItem } from "../../design-system/primitives/navigation.css";

export const eyebrow = style({ margin: 0, color: "var(--accent)", fontWeight: 650, fontSize: "0.8125rem", letterSpacing: "0.065em", textTransform: "uppercase" });
export const periodControls = style({ display: "flex", maxInlineSize: "100%", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: space.field, minInlineSize: 0 });
export const periodTabs = style([segmented, { flexWrap: "wrap", minInlineSize: 0 }]);
export const periodTab = segmentedItem;
export const periodNav = style({ display: "flex", flexWrap: "wrap", gap: space.x1, alignItems: "center", minInlineSize: 0 });
export const periodStep = style([button.ghost, compact]);
export const currentPeriod = style([button.secondary, compact]);
globalStyle(`${periodNav} > strong`, { ...text.numeric, minInlineSize: "11.5rem", paddingInline: space.x2, textAlign: "center", fontVariantNumeric: "tabular-nums" });

export const section = style({ display: "flex", flexDirection: "column", gap: space.group, minInlineSize: 0 });
globalStyle(`${section} > h2`, { ...text.sectionTitle, margin: 0, color: "var(--text-primary)" });
export const primary = style({ display: "flex", flexDirection: "column", gap: space.x1, margin: 0, minInlineSize: 0 });
globalStyle(`${primary} strong`, { ...text.numericMetric, color: "var(--accent)" });
globalStyle(`${primary} span`, { ...text.metadata, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" });

export const facts = style([paintSheet, { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 0, margin: 0, padding: space.x4, borderRadius: "var(--radius-surface)", minInlineSize: 0, borderColor: "var(--paint-edge)", boxShadow: "none" }]);

export const summary = style([paintSheetStrong, { display: "flex", flexDirection: "column", margin: 0, padding: space.x5, borderRadius: "var(--radius-surface)", minInlineSize: 0, borderColor: "var(--accent)", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)", boxShadow: "none" }]);
export const summaryFacts = style({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 0, margin: 0, minInlineSize: 0, paddingBlockStart: space.x3, marginBlockStart: space.x4, borderBlockStart: "1px solid var(--paint-edge)" });
globalStyle(`${facts} div, ${summaryFacts} div`, { padding: `${space.x2} ${space.x4} ${space.x2} 0`, minInlineSize: 0 });
globalStyle(`${facts} dt, ${summaryFacts} dt`, { color: "var(--text-muted)", fontSize: "0.8125rem" });
globalStyle(`${facts} dd, ${summaryFacts} dd`, { margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" });

export const secondaryGrid = style({ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: space.section, minInlineSize: 0, "@container": { "(max-width: 760px)": { gridTemplateColumns: "minmax(0,1fr)" } } });
globalStyle(`${secondaryGrid} > section:first-child > ul`, { listStyle: "none", display: "grid", gap: space.x2, margin: 0, padding: space.x4, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-surface)", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)", boxShadow: "none", minInlineSize: 0 });
globalStyle(`${secondaryGrid} > section:first-child > ul li`, { paddingBlock: space.x1, fontVariantNumeric: "tabular-nums" });
globalStyle(`${secondaryGrid} > section:first-child > ul li + li`, { borderBlockStart: "1px solid var(--paint-edge)", paddingBlockStart: space.x3 });

export const categories = style([paintSheet, { listStyle: "none", padding: space.x4, margin: 0, display: "grid", gap: space.field, borderRadius: "var(--radius-surface)", minInlineSize: 0, boxShadow: "none" }]);
globalStyle(`${categories} li`, { minInlineSize: 0 });
globalStyle(`${categories} li:not(:first-child)`, { borderTop: "1px solid var(--paint-edge)", paddingTop: space.x3 });
globalStyle(`${categories} progress`, { display: "block", width: "min(100%,520px)", height: 7 });
export const distribution = style({ display: "grid", gap: 5, maxInlineSize: 520 });
globalStyle(`${distribution} progress`, { width: "100%", height: 9 });

export const tableScroll = scrollRegion;
export const planTableWrap = scrollRegion;
export const table = style({ borderCollapse: "collapse", width: "100%", textAlign: "left", fontVariantNumeric: "tabular-nums" });
export const planTable = style({ borderCollapse: "collapse", width: "100%", textAlign: "left", fontVariantNumeric: "tabular-nums" });
globalStyle(`${table} th, ${table} td`, { borderTop: "1px solid var(--paint-edge)", padding: "9px 12px 9px 0", verticalAlign: "top" });
globalStyle(`${planTable} th, ${planTable} td`, { borderTop: "1px solid var(--paint-edge)", padding: "9px 12px 9px 0", verticalAlign: "top" });
