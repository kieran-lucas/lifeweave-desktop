import { style } from "@vanilla-extract/css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { vars } from "../../design-system/visual/contract.css";

export const root = style({
  display: "grid",
  gridTemplateColumns: "30px minmax(0, 1fr) 30px",
  alignItems: "center",
  gap: 5,
  paddingBlock: 5,
  borderBlock: `1px solid ${vars.color.borderHairline}`,
});

export const days = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 2,
});

export const move = style({
  inlineSize: 30,
  blockSize: 30,
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: vars.color.textTertiary,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover, color: vars.color.textPrimary },
    "&:active": { transform: "scale(.95)" },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
});
export const nextIcon = style({ transform: "rotate(180deg)" });

export const day = style({
  minInlineSize: 0,
  minBlockSize: 48,
  display: "grid",
  gridTemplateRows: "12px 20px 10px",
  placeItems: "center",
  gap: 0,
  padding: "3px 2px",
  border: 0,
  borderRadius: 9,
  background: "transparent",
  color: vars.color.textTertiary,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover, color: vars.color.textPrimary },
    "&:active": { transform: "scale(.97)" },
    "&[aria-current=date]": { color: vars.color.accentMuted, fontWeight: 760 },
    "&[aria-pressed=true]": { background: vars.color.surfaceSelected, color: vars.color.accentMuted, boxShadow: `inset 0 0 0 1px ${vars.color.selectionEdge}` },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
});

export const todayLabel = style({
  minBlockSize: 10,
  color: "inherit",
  fontSize: 7,
  lineHeight: "9px",
  fontWeight: 760,
  letterSpacing: ".06em",
  textTransform: "uppercase",
});
