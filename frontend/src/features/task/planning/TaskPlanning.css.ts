import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { tab as sharedTab, tabList } from "../../../design-system/primitives/navigation.css";
import { text } from "../../../design-system/visual/typography.css";

export const navCluster = style({
  position: "relative",
  zIndex: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space.x3,
  minInlineSize: 0,
  padding: "4px 7px",
  border: "1px solid rgba(189,205,230,.66)",
  borderRadius: "14px",
  background: "rgba(255,255,255,.54)",
  backdropFilter: "blur(13px)",
  boxShadow: "var(--glow-compact)",
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
  border: "1px solid transparent",
  borderRadius: "10px",
  color: "var(--text-muted)",
  fontSize: "0.8125rem",
  fontWeight: 650,
  cursor: "pointer",
  listStyle: "none",
  selectors: {
    "&:hover": { color: "var(--accent-muted)", borderColor: "rgba(126,151,218,.28)", background: "rgba(235,241,255,.82)" },
    "&::-webkit-details-marker": { display: "none" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const moreMenu = style({
  position: "absolute",
  zIndex: 20,
  insetInlineEnd: 0,
  insetBlockStart: "calc(100% + 8px)",
  display: "grid",
  gap: 2,
  minInlineSize: 164,
  padding: 6,
  border: "1px solid rgba(179,198,228,.76)",
  borderRadius: "14px",
  background: "rgba(250,252,255,.92)",
  backdropFilter: "blur(18px) saturate(1.08)",
  boxShadow: "var(--elevation-floating)",
});

export const moreItem = style({
  minBlockSize: 34,
  padding: "6px 9px",
  border: "1px solid transparent",
  borderRadius: "9px",
  background: "transparent",
  color: "var(--text-primary)",
  textAlign: "left",
  font: "inherit",
  fontSize: "0.8125rem",
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "rgba(237,243,255,.88)", borderColor: "rgba(130,154,220,.24)" },
    "&[aria-current=page]": { background: "linear-gradient(135deg, var(--accent), #7864EE)", borderColor: "rgba(255,255,255,.46)", color: "#FFFFFF", boxShadow: "var(--glow-primary)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
  "@media": { "(forced-colors: active)": { selectors: { "&[aria-current=page]": { background: "Highlight", color: "HighlightText", boxShadow: "none" } } } },
});

export const panelBody = style({
  display: "flex",
  flexDirection: "column",
  gap: space.section,
  minInlineSize: 0,
  padding: "clamp(18px, 2vw, 28px)",
  border: "1px solid rgba(184,202,230,.68)",
  borderRadius: "22px",
  background: "linear-gradient(145deg, rgba(255,255,255,.82), rgba(243,248,255,.70))",
  backdropFilter: "blur(15px)",
  boxShadow: "var(--glow-crystal)",
});
export const header = style({ display: "flex", flexDirection: "column", gap: space.x1, minInlineSize: 0 });
globalStyle(`${header} > h1`, { ...text.pageTitle, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.035em" });
globalStyle(`${header} > p`, { margin: 0, color: "var(--text-muted)" });
globalStyle(`${header} > p:last-child`, { ...text.metadata });
export const empty = style({ display: "flex", flexDirection: "column", gap: space.x1, padding: `${space.x5} 0`, color: "var(--text-muted)" });
export const dayGroup = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
globalStyle(`${dayGroup} > h2`, { ...text.sectionTitle, margin: 0, color: "var(--text-primary)" });
export const list = style({
  listStyle: "none",
  padding: 5,
  margin: 0,
  border: "1px solid rgba(190,205,229,.68)",
  borderRadius: "15px",
  background: "rgba(255,255,255,.62)",
  boxShadow: "var(--glow-compact)",
  overflow: "hidden",
});
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(92px, 120px) minmax(0, 1fr) auto",
  gap: space.field,
  alignItems: "start",
  padding: `${space.x3} ${space.x2}`,
  minInlineSize: 0,
  borderRadius: "10px",
  transition: "background-color 140ms ease, box-shadow 140ms ease",
  selectors: {
    "&:not(:last-child)": { borderBottom: "1px solid rgba(204,217,236,.64)" },
    "&:hover": { background: "rgba(239,245,255,.78)", boxShadow: "inset 3px 0 0 rgba(78,111,255,.30)" },
  },
  "@container": { "(max-width: 640px)": { gridTemplateColumns: "minmax(0, 1fr)", gap: space.control } },
});
globalStyle(`${row} > div:first-child`, { ...text.numeric, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
globalStyle(`${row} > div:nth-child(2)`, { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: space.control, minWidth: 0 });
globalStyle(`${row} > div:nth-child(2) > strong`, { ...text.row, fontWeight: 680, color: "var(--text-primary)" });
globalStyle(`${row} > div:nth-child(2) > p`, { color: "var(--text-muted)", margin: 0 });
export const metadata = style({ ...text.metadata, display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, color: "var(--text-muted)", minInlineSize: 0 });
export const focusPlan = style([button.ghost, compact, { minBlockSize: 0, maxInlineSize: "22rem", justifyContent: "flex-start", whiteSpace: "normal", textAlign: "left", color: "var(--accent-muted)" }]);
export const rowControl = style([button.secondary, compact]);
export const needsReview = style({ ...text.metadata, fontWeight: 680, color: "var(--danger)", textDecoration: "underline", textUnderlineOffset: 2 });
export const overdueHeading = style({ color: "var(--danger)" });
export const error = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.x2, padding: space.x3, border: "1px solid rgba(217,78,114,.36)", borderRadius: "var(--radius-control)", background: "rgba(255,240,244,.88)", color: "var(--danger)", boxShadow: "var(--glow-danger)" });
export const retry = style([button.secondary, compact]);
