import { style } from "@vanilla-extract/css";
import { iconButton } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

export const root = style({
  display: "grid",
  gridTemplateColumns: "30px minmax(0, 1fr) 30px",
  alignItems: "center",
  gap: 7,
  padding: "7px 8px",
  border: "1px solid rgba(189,205,230,.68)",
  borderRadius: "15px",
  background: "rgba(255,255,255,.56)",
  backdropFilter: "blur(13px)",
  boxShadow: "var(--glow-compact)",
});

export const days = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 74px))",
  justifyContent: "center",
  gap: 5,
});

export const move = style([
  iconButton,
  {
    minInlineSize: 30,
    minBlockSize: 30,
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--text-muted)",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": { color: "var(--accent-muted)", background: "rgba(234,240,255,.88)", transform: "translateY(-1px)" },
    },
    "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
  },
]);
export const nextIcon = style({ transform: "rotate(180deg)" });

export const day = style([
  focusRing,
  {
    minInlineSize: 0,
    minBlockSize: 44,
    display: "grid",
    placeContent: "center",
    gap: 0,
    padding: "5px 3px",
    border: "1px solid transparent",
    borderRadius: "11px",
    background: "rgba(255,255,255,.42)",
    color: "var(--text-muted)",
    ...text.metadata,
    cursor: "pointer",
    boxShadow: "none",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": { color: "var(--text-primary)", background: "rgba(244,248,255,.90)", borderColor: "rgba(143,164,220,.26)", transform: "translateY(-1px)" },
      "&[aria-current=date]": { borderColor: "rgba(78,111,255,.50)", color: "var(--accent-muted)", background: "rgba(235,241,255,.82)", boxShadow: "0 5px 16px rgba(78,111,255,.10)" },
      "&[aria-pressed=true]": { borderColor: "rgba(255,255,255,.64)", background: "linear-gradient(145deg, var(--accent), #7963EE)", color: "#FFFFFF", fontWeight: 700, boxShadow: "var(--glow-selected)", transform: "translateY(-1px)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" }, "&[aria-pressed=true]": { transform: "none" } } },
      "(forced-colors: active)": {
        selectors: {
          "&[aria-current=date]": { borderColor: "Highlight" },
          "&[aria-pressed=true]": { background: "Highlight", color: "HighlightText", boxShadow: "none" },
        },
      },
    },
  },
]);

export const todayLabel = style({ ...text.caption, color: "inherit" });
