import { style } from "@vanilla-extract/css";
import { dialogSurface } from "../../app/layout/layout.css";

/*
 * MODAL_SURFACE. Search is the one documented centring exception in the modal family: a global
 * search palette is anchored near the top of the viewport, which is the prototypical desktop
 * placement and keeps the result list rooted while it grows. Its width, bounded block size and
 * internal scroll come from the shared modal grammar (ADR 0044).
 */
export const overlay = style({
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "clamp(48px, 12vh, 120px)",
  zIndex: "var(--layer-overlay)",
});

export const card = style([
  dialogSurface.standard,
  {
    // The palette must stay clear of its own top offset as well as the bottom inset.
    maxBlockSize: "min(560px, calc(100dvh - clamp(48px, 12vh, 120px) - var(--lw-space-5)))",
    padding: 0,
    gap: 0,
    background: "var(--sidebar-background, #fff)",
    borderRadius: 14,
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
  },
]);

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border-subtle, #ddd)",
  gap: 10,
});

export const searchIcon = style({
  flexShrink: 0,
  color: "var(--text-muted, #888)",
  fontSize: 16,
  pointerEvents: "none",
  userSelect: "none",
});

export const input = style({
  flex: 1,
  border: 0,
  outline: 0,
  background: "transparent",
  color: "var(--text-primary, #000)",
  fontSize: "1rem",
  lineHeight: 1.4,
  "::placeholder": { color: "var(--text-muted, #888)" },
});

export const closeButton = style({
  flexShrink: 0,
  border: 0,
  background: "transparent",
  color: "var(--text-muted, #888)",
  cursor: "pointer",
  fontSize: "0.85rem",
  padding: "4px 8px",
  borderRadius: 6,
  selectors: {
    "&:focus-visible": { outline: "3px solid var(--focus-ring, #0078d4)", outlineOffset: 2 },
    "&:hover": { background: "var(--active-background, #f0f0f0)" },
  },
});

export const results = style({
  flex: 1,
  overflowY: "auto",
  padding: "8px 0",
});

export const statusLine = style({
  padding: "10px 18px",
  color: "var(--text-muted, #888)",
  fontSize: "0.9rem",
});

export const groupHeading = style({
  padding: "6px 18px 2px",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted, #888)",
});

export const option = style({
  display: "block",
  width: "100%",
  textAlign: "left",
  border: 0,
  background: "transparent",
  padding: "8px 18px",
  cursor: "pointer",
  lineHeight: 1.35,
  selectors: {
    "&[aria-selected=true]": {
      background: "var(--active-background, #f0f0f0)",
    },
    "&:focus": { outline: 0 },
  },
});

export const optionTitle = style({
  display: "block",
  color: "var(--text-primary, #000)",
  fontWeight: 500,
  fontSize: "0.95rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const optionContext = style({
  display: "block",
  color: "var(--text-muted, #888)",
  fontSize: "0.8rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const optionSnippet = style({
  display: "block",
  color: "var(--text-muted, #888)",
  fontSize: "0.8rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  marginTop: 1,
});

export const mark = style({
  background: "transparent",
  color: "var(--text-primary, #000)",
  fontWeight: 700,
});

export const moreNote = style({
  padding: "4px 18px 8px",
  fontSize: "0.78rem",
  color: "var(--text-muted, #888)",
});
