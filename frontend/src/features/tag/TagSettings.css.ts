import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";
import { button } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { text } from "../../design-system/visual/typography.css";

/*
 * Tag settings owns no page width. It is content inside the Settings STANDARD_PAGE, and its tables
 * own their own horizontal scroll so the page can never be forced sideways (ADR 0044).
 */
export const root = style({ display: "flex", flexDirection: "column", gap: space.x4, minInlineSize: 0, paddingBlockStart: space.x5, borderTop: "1px solid var(--border-subtle)" });
globalStyle(`${root} > h2`, { ...text.sectionTitle, margin: 0 });
export const tableScroll = scrollRegion;
export const createRow = style({ display: "flex", flexWrap: "wrap", gap: space.control, alignItems: "center", minInlineSize: 0 });
export const input = style([focusRing, { flex: 1, minInlineSize: 0, boxSizing: "border-box", padding: "7px 10px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", ...text.body, background: "var(--surface)", color: "var(--text-primary)" }]);
export const createButton = button.primary;
export const table = style({ width: "100%", borderCollapse: "collapse" });
globalStyle(`${table} th`, { textAlign: "left", ...text.label, color: "var(--text-muted)", padding: "7px 8px", borderBottom: "1px solid var(--border-strong)" });
globalStyle(`${table} td`, { padding: "8px", borderBottom: "1px solid var(--border-subtle)", ...text.compactBody, verticalAlign: "top" });
globalStyle(`${table} th:nth-child(n+2):nth-child(-n+4), ${table} td:nth-child(n+2):nth-child(-n+4)`, { textAlign: "right", fontVariantNumeric: "tabular-nums" });
export const archived = style({ color: "var(--text-muted)" });
export const actions = style({ display: "flex", gap: 6, flexWrap: "wrap" });
globalStyle(`${actions} button`, { minHeight: 26, padding: "2px 9px", borderRadius: "var(--radius-small)", ...text.button });
export const toggleRow = style({ display: "flex", alignItems: "center", gap: 8 });
export const mergePanel = style({ display: "flex", flexDirection: "column", gap: 8, paddingBlockStart: space.x4, borderTop: "1px solid var(--border-subtle)" });
export const mergeRow = style({ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" });
export const select = style([focusRing, { padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", ...text.body, background: "var(--surface)", color: "var(--text-primary)" }]);
export const warning = style({ color: "var(--danger)", ...text.compactBody, margin: 0 });
export const mergeButton = button.secondary;
export const mergeConfirmButton = button.destructive;
export const mergeCancelButton = button.secondary;
export const mergeConfirm = style({ background: "color-mix(in srgb, var(--danger) 5%, transparent)", borderInlineStart: "3px solid var(--danger)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 });
export const mergeConfirmText = style({ margin: 0, ...text.compactBody });
export const mergeConfirmActions = style({ display: "flex", gap: 8 });
export { srOnly } from "../../design-system/primitives/utilities.css";
export const mergeHeading = style({ margin: 0, ...text.cardTitle });
export const mergeDescription = style({ margin: 0, ...text.compactBody, color: "var(--text-muted)" });
export const mergedAlias = style({ ...text.caption, marginLeft: 6, color: "var(--text-muted)" });
