import { style } from "@vanilla-extract/css";
import { iconButton } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

export const root = style({
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr) 32px",
  alignItems: "center",
  gap: 4,
  paddingBottom: 14,
  borderBottom: "1px solid var(--border-subtle)",
});

export const days = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 96px))",
  justifyContent: "center",
  gap: 8,
});

export const move = style([iconButton, {
  border: 0,
  background: "transparent",
  color: "var(--text-muted)",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "#F5F5F5", color: "var(--text-primary)" },
  },
}]);
export const nextIcon = style({ transform: "rotate(180deg)" });

/** Today is white with blue ink; the explicitly selected date is solid blue. */
export const day = style([focusRing, {
  minInlineSize: 0,
  minBlockSize: 52,
  display: "grid",
  placeContent: "center",
  gap: 1,
  padding: "6px 2px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-control)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-muted)",
  ...text.metadata,
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { backgroundColor: "#F5F5F5" },
    "&[aria-current=date]": {
      borderColor: "var(--accent)",
      backgroundColor: "#FFFFFF",
      color: "var(--accent)",
    },
    "&[aria-pressed=true]": {
      borderColor: "var(--accent)",
      backgroundColor: "var(--accent)",
      color: "#FFFFFF",
      fontWeight: 600,
      boxShadow: "none",
    },
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

export const todayLabel = style(text.caption);
