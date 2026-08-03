import { style } from "@vanilla-extract/css";

export const nav = style({ color: "var(--text-primary)", fontSize: "0.875rem" });

export const heading = style({ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" });

export const disclosureToggle = style({
  display: "flex", alignItems: "center", gap: 6, width: "100%",
  border: "1px solid var(--border-subtle)", borderRadius: 9, padding: "7px 11px",
  background: "var(--surface)", color: "var(--text-primary)", fontWeight: 700,
  cursor: "pointer", marginBottom: 8, textAlign: "left",
  "@container": { "(min-width: 520px)": { display: "none" } },
  selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } },
});

export const list = style({ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 1 });

export const listHiddenNarrow = style({ "@container": { "(max-width: 519px)": { display: "none" } } });

export const entryButton = style({
  display: "block", width: "100%", border: 0, borderRadius: 7,
  padding: "5px 8px", background: "transparent", color: "var(--text-muted)",
  textAlign: "left", cursor: "pointer", lineHeight: 1.4, wordBreak: "break-word",
  selectors: {
    "&[data-level='1']": { fontWeight: 700, color: "var(--text-primary)" },
    "&[data-level='2']": { paddingLeft: 14 },
    "&[data-level='3']": { paddingLeft: 24, fontSize: "0.8125rem" },
    "&[aria-current]": { background: "var(--active-background)", color: "var(--text-primary)" },
    "&:hover": { background: "var(--active-background)" },
    "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const truncationNote = style({ marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)", padding: "4px 8px" });
