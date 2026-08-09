import { globalStyle, style } from "@vanilla-extract/css";
import { splitWorkspace } from "../../../app/layout/layout.css";

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
export const heading = style({ margin: 0, fontSize: "1.05rem" });
export const summary = style({ margin: 0, fontSize: 13, color: "var(--text-muted)" });
export const canvasViewport = style({
  position: "relative",
  minWidth: 0,
  minHeight: 520,
  overflow: "auto",
  border: "1px solid var(--glass-border)",
  borderRadius: 18,
  background: "color-mix(in srgb, var(--surface) 75%, var(--app-background))",
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
export const nodeMark = style({
  position: "absolute",
  transform: "translate(var(--graph-x),var(--graph-y))",
  display: "grid",
  gap: 2,
  width: 152,
  minHeight: 52,
  padding: "8px 9px",
  border: "1px solid var(--glass-border)",
  borderRadius: 12,
  background: "var(--glass-surface-strong)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&[data-selected=true]": {
      borderColor: "var(--focus-ring)",
      boxShadow: "0 0 0 2px color-mix(in srgb, var(--focus-ring) 25%, transparent)",
    },
  },
});
export const nodeTitle = style({
  fontWeight: 720,
  fontSize: 13,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
export const nodeMeta = style({ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 });
export const inspector = style({
  position: "sticky",
  top: 0,
  display: "grid",
  gap: 12,
  padding: 16,
  border: "1px solid var(--glass-border)",
  borderRadius: 16,
  background: "var(--glass-surface-strong)",
});
export const inspectorTitle = style({ margin: 0, fontSize: "1.02rem" });
export const inspectorMeta = style({
  margin: 0,
  display: "grid",
  gap: 4,
  fontSize: 13,
  color: "var(--text-muted)",
});
export const connectionGroup = style({ display: "grid", gap: 6 });
export const connectionHeading = style({ margin: 0, fontSize: 13, fontWeight: 700 });
export const connectionList = style({
  display: "grid",
  gap: 5,
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: 190,
  overflow: "auto",
});
export const connectionButton = style({
  width: "100%",
  border: "1px solid var(--glass-border)",
  borderRadius: 9,
  padding: "6px 9px",
  background: "var(--app-background)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 13,
  selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } },
});
export const connectionKind = style({ display: "block", fontSize: 11, color: "var(--text-muted)" });
export const empty = style({ margin: 0, fontSize: 12, color: "var(--text-muted)" });
export const field = style({ display: "grid", gap: 5, color: "var(--text-muted)", fontSize: 13 });
export const select = style({
  width: "100%",
  minWidth: 0,
  border: "1px solid var(--glass-border)",
  borderRadius: 9,
  padding: "8px 10px",
  background: "var(--app-background)",
  color: "var(--text-primary)",
  font: "inherit",
  selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 1 } },
});
export const allLinks = style({
  gridColumn: "1/-1",
  display: "grid",
  gap: 8,
  padding: 16,
  border: "1px solid var(--glass-border)",
  borderRadius: 16,
  background: "var(--glass-surface-strong)",
});
export const tableScroll = style({ overflowX: "auto" });
export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  textAlign: "left",
});
export const actions = style({ display: "flex", gap: 7, flexWrap: "wrap" });
export const button = style({
  border: "1px solid var(--glass-border)",
  borderRadius: 9,
  padding: "7px 10px",
  background: "var(--app-background)",
  color: "var(--text-primary)",
  cursor: "pointer",
  fontWeight: 650,
  selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } },
});
export const notice = style({
  gridColumn: "1/-1",
  display: "grid",
  gap: 8,
  padding: 16,
  border: "1px solid var(--glass-border)",
  borderRadius: 16,
  background: "var(--glass-surface-strong)",
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
globalStyle(`${workspace} button:focus-visible`, {
  outline: "3px solid var(--focus-ring)",
  outlineOffset: 2,
});
