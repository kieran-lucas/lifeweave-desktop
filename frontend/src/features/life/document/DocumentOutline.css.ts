import { style } from "@vanilla-extract/css";
import { text } from "../../../design-system/visual/typography.css";

export const nav = style({ color: "var(--text-primary)", ...text.navigation });

export const heading = style({ margin: "0 0 8px", ...text.eyebrow, color: "var(--text-muted)" });

export const list = style({ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 1 });

export const entryButton = style({
  display: "block", width: "100%", border: 0, borderInlineStart: "2px solid transparent", borderRadius: 0,
  padding: "5px 8px", background: "transparent", color: "var(--text-muted)", ...text.navigation,
  textAlign: "left", cursor: "pointer", wordBreak: "break-word",
  selectors: {
    "&[data-level='1']": { fontWeight: 700, color: "var(--text-primary)" },
    "&[data-level='2']": { paddingLeft: 14 },
    "&[data-level='3']": { paddingLeft: 24, ...text.metadata },
    "&[aria-current]": { borderInlineStartColor: "var(--accent)", background: "var(--active-background)", color: "var(--text-primary)" },
    "&:hover": { background: "var(--active-background)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
});

export const truncationNote = style({ marginTop: 8, ...text.caption, color: "var(--text-muted)", padding: "4px 8px" });
