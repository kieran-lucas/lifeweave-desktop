import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";
import { glass, progressBar } from "../../design-system/visual/atmosphere.css";
import { text } from "../../design-system/visual/typography.css";
import { button, compact } from "../../design-system/primitives/controls.css";
import { segmented, segmentedItem } from "../../design-system/primitives/navigation.css";

export const eyebrow = style({
  margin: 0,
  color: "var(--accent)",
  fontWeight: 650,
  fontSize: "0.8125rem",
  letterSpacing: "0.065em",
  textTransform: "uppercase",
  textShadow: "0 5px 18px color-mix(in srgb, var(--accent) 18%, transparent)",
});

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
globalStyle(`${primary} strong`, {
  ...text.numericMetric,
  color: "var(--accent)",
  fontSize: 42,
  lineHeight: "48px",
  textShadow: "0 10px 30px color-mix(in srgb, var(--accent) 20%, transparent)",
});
globalStyle(`${primary} span`, { ...text.metadata, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" });

export const facts = style([
  glass,
  {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 0,
    margin: 0,
    padding: space.x4,
    borderRadius: "var(--radius-surface)",
    minInlineSize: 0,
    borderColor: "color-mix(in srgb, var(--accent) 18%, var(--border-subtle))",
    boxShadow: "0 20px 56px color-mix(in srgb, var(--accent) 9%, transparent), inset 0 1px 0 white",
  },
]);

/* Observatory summary: a large factual instrument on one prismatic plane. */
export const summary = style([
  glass,
  {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: space.x5,
    borderRadius: "var(--radius-surface)",
    minInlineSize: 0,
    borderColor: "color-mix(in srgb, var(--accent-violet) 22%, var(--border-subtle))",
    background:
      "radial-gradient(520px 220px at 96% 4%, color-mix(in srgb, var(--accent-violet) 13%, transparent), transparent 68%), radial-gradient(420px 180px at 8% 100%, color-mix(in srgb, var(--accent-cyan) 11%, transparent), transparent 68%), var(--glass-surface)",
    boxShadow:
      "0 28px 74px color-mix(in srgb, var(--accent) 12%, transparent), 0 9px 30px color-mix(in srgb, var(--accent-violet) 8%, transparent), inset 0 1px 0 white",
  },
]);

export const summaryFacts = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 0,
  margin: 0,
  minInlineSize: 0,
  paddingBlockStart: space.x3,
  marginBlockStart: space.x4,
  borderBlockStart: "1px solid color-mix(in srgb, var(--accent) 14%, var(--border-subtle))",
});
globalStyle(`${facts} div, ${summaryFacts} div`, { padding: `${space.x2} ${space.x4} ${space.x2} 0`, minInlineSize: 0 });
globalStyle(`${facts} dt, ${summaryFacts} dt`, { color: "var(--text-muted)", fontSize: "0.8125rem" });
globalStyle(`${facts} dd, ${summaryFacts} dd`, { margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" });

export const secondaryGrid = style({ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: space.section, minInlineSize: 0, "@container": { "(max-width: 760px)": { gridTemplateColumns: "minmax(0,1fr)" } } });
globalStyle(`${secondaryGrid} > section:first-child > ul`, {
  listStyle: "none",
  display: "grid",
  gap: space.x2,
  margin: 0,
  padding: space.x4,
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-surface)",
  background: "var(--glass-surface-strong)",
  boxShadow: "0 16px 42px color-mix(in srgb, var(--accent) 7%, transparent), inset 0 1px 0 var(--glass-highlight)",
  minInlineSize: 0,
});
globalStyle(`${secondaryGrid} > section:first-child > ul li`, { paddingBlock: space.x1, fontVariantNumeric: "tabular-nums" });
globalStyle(`${secondaryGrid} > section:first-child > ul li + li`, { borderBlockStart: "1px solid var(--border-subtle)", paddingBlockStart: space.x3 });

export const categories = style([
  glass,
  {
    listStyle: "none",
    padding: space.x4,
    margin: 0,
    display: "grid",
    gap: space.field,
    borderRadius: "var(--radius-surface)",
    minInlineSize: 0,
    boxShadow: "0 18px 46px color-mix(in srgb, var(--accent) 7%, transparent), inset 0 1px 0 var(--glass-highlight)",
  },
]);
globalStyle(`${categories} li`, { minInlineSize: 0 });
globalStyle(`${categories} li:not(:first-child)`, { borderTop: "1px solid var(--border-subtle)", paddingTop: space.x3 });
globalStyle(`${categories} progress`, { display: "block", width: "min(100%,520px)", height: 7 });

export const distribution = style({ display: "grid", gap: 5, maxInlineSize: 520 });
globalStyle(`${distribution} progress`, { width: "100%", height: 9 });

export const tableScroll = scrollRegion;
export const planTableWrap = scrollRegion;
export const table = style({ borderCollapse: "collapse", width: "100%", textAlign: "left", fontVariantNumeric: "tabular-nums" });
export const planTable = style({ borderCollapse: "collapse", width: "100%", textAlign: "left", fontVariantNumeric: "tabular-nums" });
globalStyle(`${table} th, ${table} td`, { borderTop: "1px solid var(--border-subtle)", padding: "9px 12px 9px 0", verticalAlign: "top" });
globalStyle(`${planTable} th, ${planTable} td`, { borderTop: "1px solid var(--border-subtle)", padding: "9px 12px 9px 0", verticalAlign: "top" });

export const progress = progressBar;
export const module_ = style([
  glass,
  {
    padding: space.x4,
    borderRadius: "var(--radius-surface)",
    minInlineSize: 0,
    boxShadow: "0 18px 46px color-mix(in srgb, var(--accent) 7%, transparent), inset 0 1px 0 var(--glass-highlight)",
  },
]);
