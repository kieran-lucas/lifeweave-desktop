import { globalStyle, style } from "@vanilla-extract/css";
import { splitWorkspace } from "../../../app/layout/layout.css";
import { space } from "../../../app/layout/tokens.css";
import { button as sharedButton } from "../../../design-system/primitives/controls.css";
import { focusRing } from "../../../design-system/primitives/utilities.css";
import { text } from "../../../design-system/visual/typography.css";

/*
 * Canvas leads, inspector is a bounded readable rail that stays reachable when the workspace stacks
 * (ADR 0044). The canvas viewport below owns the graph's own two-dimensional scroll.
 */
export const workspace = style([
  splitWorkspace,
  { vars: { "--lw-split-columns": "minmax(0,1fr) minmax(280px,320px)" } },
]);
export const header = style({
  gridColumn: "1/-1",
  display: "flex",
  gap: 12,
  alignItems: "baseline",
  flexWrap: "wrap",
});
export const heading = style({ margin: 0, ...text.sectionTitle });
export const summary = style({ margin: 0, color: "var(--text-muted)", ...text.metadata });
export const canvasViewport = style({
  position: "relative",
  minWidth: 0,
  minHeight: 520,
  overflow: "auto",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
  background: "color-mix(in srgb, var(--surface) 82%, var(--app-background))",
  scrollbarGutter: "stable",
});
export const canvas = style({
  position: "relative",
  minWidth: "100%",
  minHeight: 480,
  width: "var(--graph-width, 100%)",
  height: "var(--graph-height, 480px)",
});
export const edges = style({ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" });
export const hierarchyEdge = style({});
/**
 * Link edges are dashed and arrow-tipped as well as differently coloured, so direction and kind are
 * never carried by colour alone.
 */
export const linkEdge = style({});
/** Unavailable links stay drawn. Dotted plus a thinner stroke, never colour alone. */
export const unavailableEdge = style({});
export const nodeMark = style([focusRing, {
  position: "absolute",
  transform: "translate(var(--graph-x),var(--graph-y))",
  display: "grid",
  gap: 2,
  width: 152,
  minHeight: 52,
  padding: "8px 9px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
  background: "var(--surface)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&[data-selected=true]": {
      borderInlineStart: "3px solid var(--accent)",
      background: "var(--active-background)",
    },
  },
  "@media": { "(forced-colors: active)": { selectors: { "&[data-selected=true]": { borderInlineStart: "3px solid Highlight" } } } },
}]);
export const nodeTitle = style({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  ...text.cardTitle,
});
export const nodeMeta = style({ display: "block", color: "var(--text-muted)", marginTop: 2, ...text.caption });
export const inspector = style({
  position: "sticky",
  top: 0,
  display: "grid",
  gap: 12,
  maxBlockSize: "calc(100dvh - 190px)",
  overflowY: "auto",
  padding: "4px 0 0 18px",
  borderLeft: "1px solid var(--border-subtle)",
  background: "transparent",
  scrollbarGutter: "stable",
  "@media": { "(max-width: 700px)": { position: "static", maxBlockSize: "none", overflowY: "visible", padding: `${space.x4} 0 0`, borderLeft: 0, borderTop: "1px solid var(--border-subtle)" } },
});
export const inspectorTitle = style({ margin: 0, ...text.sectionTitle });
export const inspectorMeta = style({
  margin: 0,
  display: "grid",
  gap: 4,
  color: "var(--text-muted)",
  ...text.metadata,
});
export const connectionGroup = style({ display: "grid", gap: 6 });
export const connectionHeading = style({ margin: 0, ...text.cardTitle });
export const connectionList = style({
  display: "grid",
  gap: 5,
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: 190,
  overflow: "auto",
});
export const connectionButton = style([focusRing, {
  width: "100%",
  border: 0,
  borderLeft: "2px solid var(--border-subtle)",
  borderRadius: 0,
  padding: "6px 9px",
  background: "transparent",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  ...text.compactBody,
  selectors: { "&:hover": { background: "var(--active-background)", borderLeftColor: "var(--accent)" } },
}]);
export const connectionKind = style({ display: "block", color: "var(--text-muted)", ...text.caption });
export const empty = style({ margin: 0, color: "var(--text-muted)", ...text.metadata });
export const field = style({ display: "grid", gap: 5, color: "var(--text-muted)", ...text.label });
export const select = style([focusRing, {
  width: "100%",
  minWidth: 0,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  padding: "8px 10px",
  background: "var(--surface)",
  color: "var(--text-primary)",
  font: "inherit",
}]);
export const allLinks = style({
  gridColumn: "1/-1",
  display: "grid",
  gap: 8,
  paddingBlockStart: space.group,
  borderBlockStart: "1px solid var(--border-subtle)",
});
export const tableScroll = style({ overflowX: "auto" });
export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
  ...text.metadata,
});
export const actions = style({ display: "flex", gap: 7, flexWrap: "wrap" });
export const button = sharedButton.secondary;
export const notice = style({
  gridColumn: "1/-1",
  display: "grid",
  gap: 8,
  padding: `${space.x4} ${space.x5}`,
  borderInlineStart: "3px solid var(--accent)",
  background: "var(--active-background)",
  color: "var(--text-primary)",
});
export const status = style({ gridColumn: "1/-1", minHeight: 24, color: "var(--text-muted)" });

globalStyle(`${edges} path.${hierarchyEdge}`, {
  stroke: "var(--border-subtle)",
  strokeWidth: 1.25,
  fill: "none",
});
globalStyle(`${edges} path.${linkEdge}`, {
  stroke: "var(--focus-ring)",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
  fill: "none",
  markerEnd: "url(#life-graph-arrow)",
});
globalStyle(`${edges} path.${unavailableEdge}`, {
  stroke: "var(--text-muted)",
  strokeWidth: 1,
  strokeDasharray: "1 5",
  fill: "none",
  markerEnd: "url(#life-graph-arrow)",
});
globalStyle(`${table} th, ${table} td`, {
  padding: "5px 8px",
  borderBottom: "1px solid var(--border-subtle)",
  verticalAlign: "top",
});
