import { style } from "@vanilla-extract/css";
import { button, compact } from "../../design-system/primitives/controls.css";
import { text } from "../../design-system/visual/typography.css";
import { dialogBackdrop, dialogSurface } from "../../app/layout/layout.css";

export const overlay = style([dialogBackdrop, {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "clamp(48px, 12vh, 120px)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
}]);

export const card = style([
  dialogSurface.standard,
  {
    maxBlockSize: "min(560px, calc(100dvh - clamp(48px, 12vh, 120px) - var(--lw-space-5)))",
    padding: 0,
    gap: 0,
    backgroundColor: "#FFFFFF",
    backgroundImage: "var(--paint-grain-fine)",
    borderColor: "var(--accent)",
    boxShadow: "none",
  },
]);

export const inputRow = style({ display: "flex", alignItems: "center", padding: "13px 16px", borderBottom: "1px solid var(--paint-edge)", backgroundColor: "#FFFFFF", backgroundImage: "var(--paint-grain-fine)", gap: 10 });
export const searchIcon = style({ flexShrink: 0, color: "var(--accent)", pointerEvents: "none", userSelect: "none" });
export const input = style({ flex: 1, WebkitAppearance: "none", appearance: "none", border: 0, outline: 0, background: "transparent", color: "var(--text-primary)", ...text.body, "::placeholder": { color: "var(--text-muted)" }, selectors: { "&::-webkit-search-cancel-button": { WebkitAppearance: "none", display: "none" } } });
export const closeButton = style([button.ghost, compact, { flexShrink: 0 }]);
export const results = style({ flex: 1, overflowY: "auto", padding: "8px" });
export const statusLine = style({ padding: "10px 12px", color: "var(--text-muted)", ...text.metadata });
export const groupHeading = style({ padding: "7px 10px 3px", ...text.eyebrow, color: "var(--text-muted)" });

export const option = style({
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "1px solid transparent",
  borderRadius: "var(--radius-small)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  padding: "9px 10px",
  cursor: "pointer",
  lineHeight: 1.35,
  boxShadow: "none",
  selectors: {
    "&[aria-selected=true]": {
      backgroundColor: "#FFFFFF",
      borderColor: "var(--accent)",
      boxShadow: "inset 3px 0 0 var(--accent)",
    },
    "&:focus": { outline: 0 },
  },
});
export const optionTitle = style({ display: "block", color: "var(--text-primary)", ...text.bodyStrong, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" });
export const optionContext = style({ display: "block", color: "var(--text-muted)", ...text.metadata, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" });
export const optionSnippet = style({ display: "block", color: "var(--text-muted)", ...text.metadata, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginTop: 1 });
export const mark = style({ background: "transparent", color: "var(--accent)", fontWeight: 700 });
export const moreNote = style({ padding: "4px 10px 8px", ...text.caption, color: "var(--text-muted)" });
