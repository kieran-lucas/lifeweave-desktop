import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { dialogBackdrop, dialogSurface, scrollRegion } from "../../app/layout/layout.css";

/*
 * Backup & Restore is content inside the Settings STANDARD_PAGE. It owns no page width, its outer
 * spacing comes from the page rhythm, and its confirmation dialog uses the shared modal geometry
 * (ADR 0044).
 */
export const panel = style({ display: "flex", flexDirection: "column", gap: space.group, padding: space.x5, border: "1px solid var(--border-subtle)", borderRadius: "16px", background: "var(--surface)", minInlineSize: 0 });
export const headingRow = style({ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" });
export const heading = style({ margin: 0, fontSize: "1.25rem" });
export const intro = style({ margin: "6px 0 0", color: "var(--text-muted, var(--text-muted))" });
export const subheading = style({ margin: 0, fontSize: "1rem" });
export const policy = style({ maxWidth: "72ch", lineHeight: 1.55 });
export const primaryButton = style({ padding: "8px 16px", border: 0, borderRadius: "8px", background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: "pointer", selectors: { "&:disabled": { opacity: 0.55, cursor: "not-allowed" } } });
export const secondaryButton = style({ padding: "6px 10px", border: "1px solid var(--border-subtle)", borderRadius: "7px", background: "transparent", color: "inherit", cursor: "pointer", selectors: { "&:disabled": { opacity: 0.5, cursor: "not-allowed" } } });
export const tableScroll = scrollRegion;
export const table = style({ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" });
globalStyle(`${table} th`, { textAlign: "left", padding: "8px", borderBottom: "1px solid var(--border-subtle)" });
globalStyle(`${table} td`, { padding: "10px 8px", verticalAlign: "top", borderBottom: "1px solid var(--border-subtle)" });
export const status = style({ marginTop: "16px", color: "var(--text-muted, var(--text-muted))" });
export const error = style({ marginTop: "16px", color: "var(--danger)" });
export const backdrop = dialogBackdrop;
export const dialog = style([dialogSurface.compact, { boxShadow: "0 20px 60px rgba(0,0,0,.35)" }]);
export const dialogActions = style({ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: space.control, minInlineSize: 0 });
export const visuallyHidden = style({ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 });
