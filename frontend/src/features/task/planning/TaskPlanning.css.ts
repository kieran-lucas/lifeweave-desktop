import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { tab as sharedTab, tabList } from "../../../design-system/primitives/navigation.css";
import { text } from "../../../design-system/visual/typography.css";

export const navCluster = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space.x3,
  minInlineSize: 0,
  paddingBlockEnd: space.x2,
  borderBlockEnd: "1px solid var(--border-subtle)",
});

export const tabs = style([
  tabList,
  {
    flexWrap: "nowrap",
    gap: space.x3,
    border: 0,
    padding: 0,
  },
]);

export const tab = sharedTab;

export const more = style({
  position: "relative",
  flexShrink: 0,
});

export const moreSummary = style({
  display: "inline-flex",
  alignItems: "center",
  minBlockSize: 32,
  padding: "5px 9px",
  borderRadius: "var(--radius-control)",
  color: "var(--text-muted)",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
  listStyle: "none",
  selectors: {
    "&:hover": { color: "var(--text-primary)", background: "#F4F4F4" },
    "&::-webkit-details-marker": { display: "none" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const moreMenu = style({
  position: "absolute",
  zIndex: 20,
  insetInlineEnd: 0,
  insetBlockStart: "calc(100% + 6px)",
  display: "grid",
  minInlineSize: 156,
  padding: 5,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
  background: "#FFFFFF",
  boxShadow: "0 10px 28px rgb(0 0 0 / 0.08)",
});

export const moreItem = style({
  minBlockSize: 34,
  padding: "6px 9px",
  border: 0,
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "var(--text-primary)",
  textAlign: "left",
  font: "inherit",
  fontSize: "0.8125rem",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "#F4F4F4" },
    "&[aria-current=page]": { background: "#111111", color: "#FFFFFF" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
});

export const panelBody = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
export const header = style({ display: "flex", flexDirection: "column", gap: space.x1, minInlineSize: 0 });
globalStyle(`${header} > h1`, { ...text.pageTitle, margin: 0 });
globalStyle(`${header} > p`, { margin: 0, color: "var(--text-muted)" });
globalStyle(`${header} > p:last-child`, { ...text.metadata });
export const empty = style({ display: "flex", flexDirection: "column", gap: space.x1, padding: `${space.x5} 0`, color: "var(--text-muted)" });
export const dayGroup = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
globalStyle(`${dayGroup} > h2`, { ...text.sectionTitle, margin: 0 });
export const list = style({ listStyle: "none", padding: 0, margin: 0, borderBlock: "1px solid var(--border-subtle)", background: "#FFFFFF" });
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(92px, 120px) minmax(0, 1fr) auto",
  gap: space.field,
  alignItems: "start",
  padding: `${space.x3} ${space.x2}`,
  minInlineSize: 0,
  selectors: { "&:not(:last-child)": { borderBottom: "1px solid var(--border-subtle)" } },
  "@container": { "(max-width: 640px)": { gridTemplateColumns: "minmax(0, 1fr)", gap: space.control } },
});
globalStyle(`${row} > div:first-child`, { ...text.numeric, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
globalStyle(`${row} > div:nth-child(2)`, { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: space.control, minWidth: 0 });
globalStyle(`${row} > div:nth-child(2) > strong`, { ...text.row, fontWeight: 650 });
globalStyle(`${row} > div:nth-child(2) > p`, { color: "var(--text-muted)", margin: 0 });
export const metadata = style({ ...text.metadata, display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, color: "var(--text-muted)", minInlineSize: 0 });
export const focusPlan = style([button.ghost, compact, { minBlockSize: 0, maxInlineSize: "22rem", justifyContent: "flex-start", whiteSpace: "normal", textAlign: "left", color: "var(--text-primary)" }]);
export const rowControl = style([button.secondary, compact]);
export const needsReview = style({ ...text.metadata, fontWeight: 650, color: "var(--text-primary)", textDecoration: "underline" });
export const overdueHeading = style({ color: "var(--text-primary)" });
export const error = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.x2, padding: space.x3, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", background: "#FFFFFF" });
export const retry = style([button.secondary, compact]);
