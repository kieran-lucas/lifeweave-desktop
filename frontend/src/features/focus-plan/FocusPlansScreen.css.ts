import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { splitWorkspace } from "../../app/layout/layout.css";
import { text } from "../../design-system/visual/typography.css";
import { tab as sharedTab } from "../../design-system/primitives/navigation.css";
import { duration, easing } from "../../design-system/visual/motion.css";

export const heading = style({ margin: 0, ...text.display, color: "var(--text-primary)", letterSpacing: "-0.04em" });
export const lede = style({ margin: 0, color: "var(--text-muted)", maxInlineSize: "58ch" });
export const createForm = style({ display: "grid", gridTemplateColumns: "minmax(10rem, 1fr) auto", alignItems: "center", gap: space.control, inlineSize: "min(22rem, 100%)", minInlineSize: 0, "@media": { "(max-width: 700px)": { inlineSize: "100%" } } });
export const portfolios = style({ display: "flex", gap: space.x3, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)" });
export const tab = sharedTab;
export const workspace = style([splitWorkspace, { vars: { "--lw-split-columns": "minmax(220px, 282px) minmax(0, 1fr)" }, gap: space.x5 }]);

export const listPanel = style({
  paddingBlock: space.x1,
  borderBlockStart: "1px solid #111111",
  borderBlockEnd: "1px solid var(--border-subtle)",
  background: "#FFFFFF",
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
  scrollbarGutter: "stable",
  "@media": { "(max-width: 700px)": { maxHeight: "none" } },
});
export const planList = style({ listStyle: "none", padding: 0, margin: 0, display: "grid" });

export const planButton = style({
  width: "100%",
  display: "grid",
  gap: 3,
  textAlign: "left",
  padding: "11px 10px",
  border: 0,
  borderBottom: "1px solid var(--border-subtle)",
  background: "#FFFFFF",
  color: "inherit",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { backgroundColor: "#F5F5F5" },
    '&[aria-current="true"]': { backgroundColor: "#111111", color: "#FFFFFF" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
  "@media": {
    "(forced-colors: active)": { selectors: { '&[aria-current="true"]': { background: "Highlight", color: "HighlightText" } } },
  },
});
globalStyle(`${planButton} > strong`, { ...text.row, fontWeight: 650, letterSpacing: "-0.012em" });
globalStyle(`${planButton} > span`, { ...text.metadata, color: "var(--text-muted)" });
globalStyle(`${planButton}[aria-current="true"] > span`, { color: "#D2D2D2" });

export const detailPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x5,
  minInlineSize: 0,
  paddingBlockEnd: space.x6,
});
export const detailHeader = style({ display: "grid", gap: 3, minInlineSize: 0, paddingBlockEnd: space.x3, borderBlockEnd: "1px solid #111111" });
globalStyle(`${detailHeader} h2`, { ...text.objectTitle, margin: 0, fontSize: "clamp(1.35rem, 2vw, 1.8rem)", letterSpacing: "-0.025em" });
export const kicker = style({ ...text.eyebrow, margin: 0, color: "var(--text-muted)", textTransform: "uppercase" });
export const muted = style({ ...text.metadata, color: "var(--text-muted)", margin: 0 });

export const brief = style({ display: "grid", gap: space.x4, border: 0, padding: 0, margin: 0, minInlineSize: 0 });
export const field = style({ display: "grid", gap: 6, minInlineSize: 0, color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 650, letterSpacing: "0.02em" });
export const input = style({ width: "100%", boxSizing: "border-box", minInlineSize: 0 });
export const createInput = style([input, { inlineSize: "100%" }]);
export const outcome = style([input, { minHeight: "112px", resize: "vertical", fontSize: "1rem", lineHeight: 1.55 }]);
export const criteria = style([input, { minHeight: "92px", resize: "vertical", lineHeight: 1.5 }]);
export const twoColumns = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: space.x3, "@media": { "(max-width: 700px)": { gridTemplateColumns: "1fr" } } });
export const actions = style({ display: "flex", gap: space.x2, flexWrap: "wrap" });

export const advanced = style({
  borderBlock: "1px solid var(--border-subtle)",
  paddingBlock: space.x2,
});
globalStyle(`${advanced} > summary`, { cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 650, listStylePosition: "inside" });
export const advancedBody = style({ display: "grid", gap: space.x3, paddingBlockStart: space.x3 });
export const advancedActions = style({ display: "flex", gap: space.x2, flexWrap: "wrap", alignItems: "center" });

export const error = style({ color: "#111111", padding: "9px 11px", border: "1px solid #111111", borderRadius: "var(--radius-control)", backgroundColor: "#FFFFFF" });
export const emptyState = style({ display: "grid", gap: 6, alignSelf: "center", maxInlineSize: "28rem", color: "var(--text-muted)", textAlign: "center", padding: "clamp(32px, 8vh, 72px) 20px" });
globalStyle(`${emptyState} > strong`, { color: "var(--text-primary)", fontSize: "1rem" });

/* Compatibility styles for the retained but no-longer-primary ReviewsPanel. */
export const fieldset = style({ display: "grid", gap: space.x3, border: 0, borderBlockStart: "1px solid var(--border-subtle)", padding: `${space.x3} 0 0`, margin: 0 });
export const textarea = style([input, { minHeight: "94px", resize: "vertical" }]);

globalStyle(`${detailPanel} > section`, { borderBlockStart: "1px solid var(--border-subtle)", paddingBlockStart: space.x4 });
globalStyle(`${detailPanel} > section > h3`, { ...text.sectionTitle, margin: `0 0 ${space.x2}` });
globalStyle(`ol${planList} > li`, { paddingBlock: space.x3, borderBlockEnd: "1px solid var(--border-subtle)" });
globalStyle(`ol${planList} article h4`, { margin: 0 });
globalStyle(`ol${planList} article p`, { margin: `${space.x2} 0 0`, maxInlineSize: "68ch" });

export { srOnly } from "../../design-system/primitives/utilities.css";
