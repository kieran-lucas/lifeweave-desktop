import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";

/*
 * Tag settings owns no page width. It is content inside the Settings STANDARD_PAGE, and its tables
 * own their own horizontal scroll so the page can never be forced sideways (ADR 0044).
 */
export const root = style({ display: "flex", flexDirection: "column", gap: space.group, minInlineSize: 0 });
export const tableScroll = scrollRegion;
export const createRow = style({ display: "flex", flexWrap: "wrap", gap: space.control, alignItems: "center", minInlineSize: 0 });
export const input = style({ flex: 1, minInlineSize: 0, boxSizing: "border-box", padding: "7px 10px", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 4, fontSize: 14 });
export const table = style({ width: "100%", borderCollapse: "collapse" });
globalStyle(`${table} th`, { textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--text-muted, #666)", padding: "4px 8px", borderBottom: "1px solid var(--border-subtle, #ddd)" });
globalStyle(`${table} td`, { padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, #ddd)", fontSize: 14 });
export const archived = style({ color: "var(--text-muted, #666)", fontStyle: "italic" });
export const actions = style({ display: "flex", gap: 6, flexWrap: "wrap" });
export const toggleRow = style({ display: "flex", alignItems: "center", gap: 8 });
export const mergePanel = style({ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-raised, #f3f3f3)", borderRadius: 6, border: "1px solid var(--border-subtle, #ddd)" });
export const mergeRow = style({ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" });
export const select = style({ padding: "6px 8px", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 4, fontSize: 14, background: "var(--surface, #fff)" });
export const warning = style({ color: "var(--danger, #c00)", fontSize: 13, margin: 0 });
export const mergeConfirm = style({ background: "var(--surface, #fff)", border: "1px solid var(--border-subtle, #ddd)", borderRadius: 6, padding: 12, display: "flex", flexDirection: "column", gap: 8 });
export const mergeConfirmText = style({ margin: 0, fontSize: 13 });
export const mergeConfirmActions = style({ display: "flex", gap: 8 });
export const srOnly = style({ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" });
export const mergeHeading = style({ margin: 0 });
export const mergeDescription = style({ margin: 0, fontSize: 13, color: "var(--text-muted, #666)" });
export const mergedAlias = style({ fontSize: 11, marginLeft: 6, color: "var(--text-muted, #666)" });
