import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { tab as sharedTab, tabList } from "../../../design-system/primitives/navigation.css";

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
export const panelBody = style({ display: "flex", flexDirection: "column", gap: space.group, minInlineSize: 0 });
export const empty = style({ color: "var(--text-muted)" });
export const dayGroup = style({ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 });
export const list = style({ listStyle: "none", padding: 0, margin: 0 });
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(110px, 140px) minmax(0, 1fr) auto",
  gap: space.field,
  alignItems: "start",
  padding: "12px 0",
  borderBottom: "1px solid var(--border-subtle)",
  minInlineSize: 0,
  // Reflows against the page frame it sits in, not the window.
  '@container': { '(max-width: 640px)': { gridTemplateColumns: "minmax(0, 1fr)", gap: space.control } },
});
export const time = style({ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
export const content = style({ display: "flex", flexWrap: "wrap", gap: "4px 12px", minWidth: 0 });
export const description = style({ flexBasis: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 });
export const needsReview = style({ fontWeight: 600, textDecoration: "underline" });
