import { style } from "@vanilla-extract/css";
import { iconButton } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

export const root = style({
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) 28px",
  alignItems: "center",
  gap: 6,
  paddingBlock: "2px 12px",
  borderBottom: "1px solid var(--border-subtle)",
});

export const days = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 74px))",
  justifyContent: "center",
  gap: 4,
});

export const move = style([iconButton, {
  minInlineSize: 28,
  minBlockSize: 28,
  border: 0,
  background: "transparent",
  color: "var(--text-muted)",
  transition: `color ${duration.state} ${easing.standard}`,
  selectors: { "&:hover": { color: "var(--text-primary)" } },
}]);
export const nextIcon = style({ transform: "rotate(180deg)" });

export const day = style([focusRing, {
  minInlineSize: 0,
  minBlockSize: 42,
  display: "grid",
  placeContent: "center",
  gap: 0,
  padding: "4px 2px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-control)",
  background: "#FFFFFF",
  color: "var(--text-muted)",
  ...text.metadata,
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { color: "var(--text-primary)", backgroundColor: "#F6F6F6" },
    "&[aria-current=date]": { borderColor: "#111111", color: "#111111" },
    "&[aria-pressed=true]": { borderColor: "#111111", backgroundColor: "#111111", color: "#FFFFFF", fontWeight: 650 },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        "&[aria-current=date]": { borderColor: "Highlight" },
        "&[aria-pressed=true]": { background: "Highlight", color: "HighlightText" },
      },
    },
  },
}]);

export const todayLabel = style({ ...text.caption, color: "inherit" });
