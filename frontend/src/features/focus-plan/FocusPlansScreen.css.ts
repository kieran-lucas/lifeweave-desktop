import { style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { splitWorkspace } from "../../app/layout/layout.css";

/*
 * Plans owns no page width. It is a STANDARD_PAGE and consumes the shared `PageFrame`; the
 * master/detail geometry comes from the shared split workspace (ADR 0044).
 */

export const heading = style({ margin: 0, fontSize: "2rem" });
export const lede = style({ margin: "6px 0 0", color: "var(--text-muted, #666)" });
export const createForm = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minInlineSize: 0 });
export const portfolios = style({ display: "flex", gap: "6px", flexWrap: "wrap" });
export const tab = style({ minHeight: "40px", padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface)", color: "inherit", cursor: "pointer", selectors: { '&[aria-selected="true"], &[aria-pressed="true"]': { outline: "2px solid var(--accent)", outlineOffset: "1px" }, "&:disabled": { opacity: 0.5, cursor: "not-allowed" } } });
// The list rail leads and the detail flexes, so the columns are supplied in that order.
export const workspace = style([splitWorkspace, { vars: { "--lw-split-columns": "minmax(240px, 320px) minmax(0, 1fr)" } }]);
export const listPanel = style({ border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "10px", background: "var(--surface)", maxHeight: "calc(100vh - 220px)", overflowY: "auto" });
export const planList = style({ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" });
export const planButton = style({ width: "100%", display: "grid", gap: "4px", textAlign: "left", padding: "12px", border: "1px solid var(--border-subtle)", borderRadius: "9px", background: "transparent", color: "inherit", cursor: "pointer", selectors: { '&[aria-current="true"]': { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" } } });
export const detailPanel = style({ display: "flex", flexDirection: "column", gap: space.group, border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: space.x5, background: "var(--surface)", minBlockSize: "420px", minInlineSize: 0 });
export const detailHeader = style({ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: space.field, alignItems: "flex-start", minInlineSize: 0 });
export const fieldset = style({ display: "grid", gap: space.x3, border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: space.field, margin: 0 });
export const tagFieldset = style({ display: "flex", flexWrap: "wrap", gap: "10px", border: 0, padding: 0, margin: 0 });
export const checkLabel = style({ display: "inline-flex", gap: "6px", alignItems: "center" });
export const twoColumns = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", '@media': { '(max-width: 700px)': { gridTemplateColumns: "1fr" } } });
export const input = style({ width: "100%", boxSizing: "border-box", minHeight: "40px", padding: "8px 10px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface)", color: "inherit", font: "inherit" });
/*
 * The header create field. The shared `input` is `width:100%`, which made it consume the whole flex
 * line and pushed Create onto a second row under the heading. Here it flexes from a readable basis
 * instead, so the field and its button stay one control group.
 */
export const createInput = style([input, { inlineSize: "auto", flex: "1 1 16rem", minInlineSize: "12rem", maxInlineSize: "24rem" }]);
export const textarea = style([input, { minHeight: "94px", resize: "vertical" }]);
export const primaryButton = style({ minHeight: "40px", padding: "8px 14px", border: 0, borderRadius: "8px", background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: "pointer", selectors: { "&:disabled": { opacity: 0.5, cursor: "not-allowed" } } });
export const secondaryButton = style({ minHeight: "36px", padding: "6px 10px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "transparent", color: "inherit", cursor: "pointer", selectors: { "&:disabled": { opacity: 0.5, cursor: "not-allowed" } } });
export const dangerButton = style([secondaryButton, { color: "var(--error, #b42318)" }]);
export const iconButton = style([secondaryButton, { minWidth: "36px", padding: "4px" }]);
export const actions = style({ display: "flex", gap: "8px", flexWrap: "wrap" });
export const error = style({ color: "var(--error, #b42318)", padding: "10px 12px", border: "1px solid currentColor", borderRadius: "8px" });
export const muted = style({ color: "var(--text-muted, #666)", fontSize: "0.9rem" });
export const emptyState = style({ color: "var(--text-muted, #666)", textAlign: "center", padding: "80px 20px" });
export const draftNote = style({ color: "var(--text-muted, #666)", fontSize: "0.85rem", margin: 0 });
export const variantTabs = style({ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" });
export const variantControl = style({ display: "inline-flex", gap: "3px", alignItems: "center" });
export const variantEditor = style({ display: "grid", gap: "12px", paddingTop: "12px" });
export const inlineForm = style({ display: "flex", gap: "8px", alignItems: "center", margin: "10px 0", flexWrap: "wrap" });
export const phaseList = style({ display: "grid", gap: "8px", paddingLeft: "24px" });
export const phaseRow = style({ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) auto auto auto", gap: "6px", alignItems: "center", '@media': { '(max-width: 650px)': { gridTemplateColumns: "minmax(120px, 1fr) auto auto auto" } } });
export const srOnly = style({ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 });
