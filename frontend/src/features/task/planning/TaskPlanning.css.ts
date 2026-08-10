import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { tab as sharedTab, tabList } from "../../../design-system/primitives/navigation.css";
import { text } from "../../../design-system/visual/typography.css";

/*
 * The five workspace views, composed for Visual Baseline v2.
 *
 * These are low-chrome inline navigation, not a boxed strip: text, a tonal hover, and a 2 px accent
 * underline on the active view. The container's only line is the hairline it sits on, so the strip
 * never reads as a bordered block stacked above the page's other bordered blocks — the
 * "boxed horizontal navigation under another boxed region" the design law rules out.
 *
 * It still wraps rather than forcing the page sideways, which is what keeps the Task 50
 * no-horizontal-overflow invariant true at narrow widths.
 */
export const tabs = style([tabList, {
  flexWrap: "wrap",
  gap: space.x4,
}]);
export const tab = sharedTab;
export const panelBody = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
export const header = style({ display: "flex", flexDirection: "column", gap: space.x1, minInlineSize: 0 });
export const title = style({ ...text.pageTitle, margin: 0 });
export const subtitle = style({ margin: 0, color: "var(--text-muted)" });
export const summary = style({ ...text.metadata, margin: 0, color: "var(--text-muted)" });
export const empty = style({ display: "flex", flexDirection: "column", gap: space.x1, padding: `${space.x5} 0`, color: "var(--text-muted)" });
export const dayGroup = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
export const dayHeading = style({ ...text.sectionTitle, margin: 0 });
export const list = style({ listStyle: "none", padding: 0, margin: 0, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-surface)", background: "var(--surface-raised)", overflow: "hidden" });
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(110px, 140px) minmax(0, 1fr) auto",
  gap: space.field,
  alignItems: "start",
  padding: `${space.x3} ${space.x4}`,
  minInlineSize: 0,
  selectors: { "&:not(:last-child)": { borderBottom: "1px solid var(--border-subtle)" } },
  // Reflows against the page frame it sits in, not the window.
  '@container': { '(max-width: 640px)': { gridTemplateColumns: "minmax(0, 1fr)", gap: space.control } },
});
export const time = style({ ...text.numeric, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
export const content = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: space.control, minWidth: 0 });
export const rowTitle = style({ ...text.row, fontWeight: 600 });
export const description = style({ color: "var(--text-muted)", margin: 0 });
export const metadata = style({ ...text.metadata, display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, color: "var(--text-muted)", minInlineSize: 0 });
export const focusPlan = style([button.ghost, compact, { minBlockSize: 0, maxInlineSize: "22rem", justifyContent: "flex-start", whiteSpace: "normal", textAlign: "left", color: "var(--accent)" }]);
export const rowControl = style([button.secondary, compact]);
export const needsReview = style({ ...text.metadata, fontWeight: 600, color: "var(--danger)", textDecoration: "underline" });
export const deadlinePanel = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
export const deadlineGroup = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
export const deadlineHeading = style({ ...text.sectionTitle, margin: 0 });
export const overdueHeading = style({ color: "var(--danger)" });
export const error = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.x2, padding: space.x3, border: "1px solid color-mix(in srgb, var(--danger) 28%, var(--border-subtle))", borderRadius: "var(--radius-control)", background: "color-mix(in srgb, var(--danger) 5%, var(--surface-raised))" });
export const retry = style([button.secondary, compact]);
