import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { splitWorkspace } from "../../app/layout/layout.css";
import { family } from "../../design-system/visual/typography.css";

/*
 * Plans owns no page width. It is a STANDARD_PAGE and consumes the shared `PageFrame`; the
 * master/detail geometry comes from the shared split workspace (ADR 0044).
 */

export const heading = style({ margin: 0, fontSize: "2rem" });
export const lede = style({ margin: "6px 0 0", color: "var(--text-muted, var(--text-muted))" });
export const createForm = style({ display: "grid", gridTemplateColumns: "minmax(12rem, 1fr) auto", alignItems: "center", gap: space.control, inlineSize: "min(28rem, 100%)", minInlineSize: 0, '@media': { '(max-width: 700px)': { gridTemplateColumns: "1fr", inlineSize: "100%" } } });
export const portfolios = style({ display: "flex", gap: space.x3, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)" });
export const tab = style({ minHeight: "40px", padding: "8px 4px 9px", border: 0, borderBottom: "2px solid transparent", borderRadius: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 500, selectors: { "&:hover:not(:disabled)": { color: "var(--text-primary)" }, '&[aria-selected="true"], &[aria-pressed="true"]': { borderBottomColor: "var(--accent)", color: "var(--accent)", fontWeight: 650 }, "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 }, "&:disabled": { opacity: 0.5, cursor: "not-allowed" } }, '@media': { '(forced-colors: active)': { selectors: { '&[aria-selected="true"], &[aria-pressed="true"]': { borderBottomColor: "Highlight", color: "Highlight" } } } } });
// The list rail leads and the detail flexes, so the columns are supplied in that order.
export const workspace = style([splitWorkspace, { vars: { "--lw-split-columns": "minmax(240px, 320px) minmax(0, 1fr)" } }]);
export const listPanel = style({ paddingInlineEnd: space.x4, borderInlineEnd: "1px solid var(--border-subtle)", maxHeight: "calc(100vh - 220px)", overflowY: "auto", scrollbarGutter: "stable", '@media': { '(max-width: 700px)': { maxHeight: "none", paddingInlineEnd: 0, paddingBlockEnd: space.x3, borderInlineEnd: 0, borderBlockEnd: "1px solid var(--border-subtle)" } } });
export const planList = style({ listStyle: "none", padding: 0, margin: 0, display: "grid" });
export const planButton = style({ position: "relative", width: "100%", display: "grid", gap: "4px", textAlign: "left", padding: "14px 12px 14px 16px", border: 0, borderBottom: "1px solid var(--border-subtle)", borderRadius: 0, background: "transparent", color: "inherit", cursor: "pointer", selectors: { "&::before": { content: '""', position: "absolute", insetBlock: 10, insetInlineStart: 0, inlineSize: 3, borderRadius: "var(--radius-full)", background: "transparent" }, "&:hover": { background: "color-mix(in srgb, var(--accent) 4%, transparent)" }, '&[aria-current="true"]': { background: "var(--active-background)" }, '&[aria-current="true"]::before': { background: "var(--accent)" }, "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 } }, '@media': { '(forced-colors: active)': { selectors: { '&[aria-current="true"]': { outline: "2px solid Highlight", outlineOffset: -2 } } } } });
export const detailPanel = style({ display: "flex", flexDirection: "column", gap: space.group, paddingInlineStart: space.x4, minInlineSize: 0, '@media': { '(max-width: 700px)': { paddingInlineStart: 0 } } });
export const detailHeader = style({ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: space.field, alignItems: "start", minInlineSize: 0, '@media': { '(max-width: 700px)': { gridTemplateColumns: "1fr" } } });
globalStyle(`${detailHeader} h2`, { margin: 0 });
export const fieldset = style({ display: "grid", gap: space.x3, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", padding: space.field, margin: 0 });
export const tagFieldset = style({ display: "flex", flexWrap: "wrap", gap: "10px", border: 0, padding: 0, margin: 0 });
export const checkLabel = style({ display: "inline-flex", gap: "6px", alignItems: "center" });
export const twoColumns = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", '@media': { '(max-width: 700px)': { gridTemplateColumns: "1fr" } } });
export const input = style({ width: "100%", boxSizing: "border-box", minHeight: "40px", padding: "8px 10px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", background: "var(--surface)", color: "inherit", font: "inherit" });
/* The header action is a two-column control group until the narrow stacked composition takes over. */
export const createInput = style([input, { inlineSize: "100%", minInlineSize: 0 }]);
export const textarea = style([input, { minHeight: "94px", resize: "vertical" }]);
export const primaryButtonSizing = style({ minHeight: 40 });
export const actions = style({ display: "flex", gap: "8px", flexWrap: "wrap" });
export const error = style({ color: "var(--danger)", padding: "10px 12px", border: "1px solid currentColor", borderRadius: "var(--radius-control)" });
export const muted = style({ color: "var(--text-muted, var(--text-muted))", fontSize: "0.9rem" });
export const emptyState = style({ alignSelf: "center", maxInlineSize: "28rem", color: "var(--text-muted)", textAlign: "center", padding: "clamp(32px, 8vh, 72px) 20px", fontFamily: family.editorial });
export const draftNote = style({ color: "var(--text-muted, var(--text-muted))", fontSize: "0.85rem", margin: 0 });
export const variantTabs = style({ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" });
export const variantControl = style({ display: "inline-flex", gap: "3px", alignItems: "center" });
export const variantEditor = style({ display: "grid", gap: "12px", paddingTop: "12px" });
export const inlineForm = style({ display: "flex", gap: "8px", alignItems: "center", margin: "10px 0", flexWrap: "wrap" });
export const phaseList = style({ display: "grid", gap: "8px", paddingLeft: "24px" });
export const phaseRow = style({ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) auto auto auto", gap: "6px", alignItems: "center", '@media': { '(max-width: 650px)': { gridTemplateColumns: "minmax(120px, 1fr) auto auto auto" } } });
export { srOnly } from "../../design-system/primitives/utilities.css";
