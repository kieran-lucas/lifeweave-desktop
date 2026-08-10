import { globalStyle, style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { dialogBackdrop, dialogSurface, scrollRegion } from "../../app/layout/layout.css";
import { button } from "../../design-system/primitives/controls.css";
import { text } from "../../design-system/visual/typography.css";

export const panel = style({ display: "flex", flexDirection: "column", gap: space.group, paddingBlockStart: space.x5, borderTop: "1px solid var(--paint-edge)", background: "transparent", minInlineSize: 0 });
export const headingRow = style({ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" });
export const heading = style({ margin: 0, ...text.sectionTitle });
export const intro = style({ margin: "4px 0 0", color: "var(--text-muted)", ...text.compactBody });
export const subheading = style({ margin: 0, ...text.cardTitle });
export const policy = style({ maxWidth: "72ch", ...text.compactBody, color: "var(--text-muted)" });
export const primaryButton = button.primary;
export const secondaryButton = button.secondary;
export const tableScroll = scrollRegion;
export const table = style({ width: "100%", borderCollapse: "collapse" });
globalStyle(`${table} th`, { textAlign: "left", padding: "7px 8px", borderBottom: "1px solid var(--paint-edge-strong)", ...text.label, color: "var(--text-muted)" });
globalStyle(`${table} td`, { padding: "9px 8px", verticalAlign: "top", borderBottom: "1px solid var(--paint-edge)", ...text.compactBody, fontVariantNumeric: "tabular-nums" });
globalStyle(`${table} button`, { minHeight: 26, padding: "2px 9px", borderRadius: "var(--radius-small)" });
export const status = style({ marginTop: "16px", color: "var(--text-muted)", ...text.compactBody });
export const error = style({ marginTop: "16px", color: "var(--danger)", ...text.compactBody });

export const backdrop = style([dialogBackdrop, { backdropFilter: "none", WebkitBackdropFilter: "none" }]);
export const dialog = style([dialogSurface.compact, { backgroundColor: "var(--paint-sheet-strong)", backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)", borderColor: "var(--paint-edge-strong)" }]);
export const dialogActions = style({ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: space.control, minInlineSize: 0 });
export { srOnly as visuallyHidden } from "../../design-system/primitives/utilities.css";
