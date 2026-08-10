import { globalStyle, style } from "@vanilla-extract/css";
import { dialogBackdrop, dialogSurface } from "../../../app/layout/layout.css";
import { button as sharedButton, compact } from "../../../design-system/primitives/controls.css";
import { text } from "../../../design-system/visual/typography.css";

export const panel = style({ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--paint-edge)" });
export const header = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" });
export const heading = style({ margin: 0, ...text.sectionTitle });
export const subheading = style({ margin: "24px 0 10px", ...text.eyebrow, color: "var(--text-muted)" });
export const button = sharedButton.secondary;
export const primary = sharedButton.primary;
export const destructive = style([sharedButton.destructive, compact, { flexShrink: 0 }]);
export const list = style({ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 });
export const row = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBlockEnd: "1px solid var(--paint-edge)" });
export const rowBody = style({ minWidth: 0, flex: 1 });
export const linkButton = style({ border: 0, padding: 0, background: "transparent", color: "var(--text-primary)", ...text.cardTitle, textAlign: "left", cursor: "pointer", selectors: { "&:disabled": { cursor: "default", opacity: 0.75 } } });
export const meta = style({ margin: "3px 0 0", color: "var(--text-muted)", ...text.metadata, overflowWrap: "anywhere" });
export const state = style({ display: "inline-block", marginLeft: 8, padding: "2px 7px", border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-full)", color: "var(--text-muted)", backgroundColor: "var(--paint-board)", backgroundImage: "var(--paint-grain-fine)", ...text.caption });

export const overlay = style([dialogBackdrop, { backdropFilter: "none", WebkitBackdropFilter: "none" }]);
export const dialog = style([dialogSurface.compact, { backgroundColor: "var(--paint-sheet-strong)", backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)", borderColor: "var(--paint-edge-strong)" }]);
export const field = style({ display: "grid", gap: 6, marginTop: 18 });
export const searchRow = style({ display: "flex", flexWrap: "wrap", gap: 8, minInlineSize: 0 });
export const input = style({ minWidth: 0, flex: 1, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", padding: "9px 11px", backgroundColor: "var(--paint-sheet)", backgroundImage: "var(--paint-grain-fine)", color: "var(--text-primary)", ...text.body });
export const result = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 10,
  padding: 11,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "var(--paint-sheet)",
  backgroundImage: "var(--paint-grain-fine)",
  cursor: "pointer",
  selectors: {
    "&:has(input:checked)": { backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)", borderColor: "var(--accent)", boxShadow: "var(--glow-selected)" },
    "&:focus-within": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
  "@media": { "(forced-colors: active)": { selectors: { "&:has(input:checked)": { borderWidth: 2, boxShadow: "none" } } } },
});
export const actions = style({ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 });
export const muted = style({ color: "var(--text-muted)" });
globalStyle(`${linkButton}:focus-visible, ${dialog} input:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 2 });
