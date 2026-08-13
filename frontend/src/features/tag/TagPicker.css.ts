import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import { button, compact } from "../../design-system/primitives/controls.css";
import { text } from "../../design-system/visual/typography.css";
import { duration, easing } from "../../design-system/visual/motion.css";

const panelEnter = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(.978)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const fieldset = style({
  border: 0,
  borderRadius: 0,
  padding: 0,
  margin: 0,
  position: "relative",
});

export const legend = style({
  color: "#70706D",
  padding: "0 0 8px",
  fontSize: 11,
  lineHeight: "14px",
  fontWeight: 650,
});

export const trigger = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  inlineSize: "100%",
  minBlockSize: 52,
  boxSizing: "border-box",
  justifyContent: "flex-start",
  padding: "11px 38px 11px 42px",
  border: "1px solid #CBCBC8",
  borderRadius: 11,
  background: "#FAFAF8",
  color: "#555555",
  fontSize: 12,
  lineHeight: "18px",
  fontWeight: 650,
  textAlign: "start",
  cursor: "pointer",
  transition: `border-color ${duration.inspectorState} ${easing.standard}, background-color ${duration.inspectorState} ${easing.standard}, box-shadow ${duration.inspectorState} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&::before": { content: '"#"', position: "absolute", insetInlineStart: 14, color: "#232323", fontSize: 17, fontWeight: 760 },
    "&::after": { content: "", position: "absolute", insetInlineEnd: 16, insetBlockStart: 20, inlineSize: 6, blockSize: 6, borderInlineEnd: "1.5px solid #5F5F5F", borderBlockEnd: "1.5px solid #5F5F5F", transform: "rotate(45deg)" },
    "&:hover:not(:disabled)": { borderColor: "#8D8D89", background: "#FFFFFF", color: "#222222", boxShadow: "0 7px 18px rgb(0 0 0 / .055)" },
    "&:active:not(:disabled)": { transform: "translateY(1px)" },
    "&[aria-expanded=true]": { borderColor: "#111111", background: "#FFFFFF", color: "#222222", boxShadow: "0 0 0 3px rgb(17 17 17 / .07)" },
    "&:focus-visible": { outline: "2px solid #111111", outlineOffset: 2 },
    "&:disabled": { cursor: "not-allowed", opacity: .52 },
  },
});

export const panel = style({
  position: "absolute",
  zIndex: 70,
  insetInline: 0,
  insetBlockEnd: "calc(100% + 7px)",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  padding: 10,
  border: "1px solid #171717",
  borderRadius: 13,
  background: "#FFFFFF",
  boxShadow: "0 2px 5px rgb(0 0 0 / .09), 0 18px 46px rgb(0 0 0 / .18), 0 42px 88px rgb(0 0 0 / .10)",
  animation: `${panelEnter} ${duration.inspector} ${easing.standard} both`,
  transformOrigin: "bottom left",
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const searchLabel = style({
  ...text.label,
  color: "#696969",
  display: "block",
  marginBottom: 2,
});

export const search = style({
  width: "100%",
  minBlockSize: 40,
  padding: "8px 10px",
  border: "1px solid #CBCBC8",
  borderRadius: 9,
  outline: 0,
  background: "#FAFAF8",
  ...text.compactBody,
  boxSizing: "border-box",
  selectors: { "&:focus": { borderColor: "#111111", background: "#FFFFFF", boxShadow: "0 0 0 3px rgb(17 17 17 / .07)" } },
});

export const status = style({
  margin: "2px 0",
  ...text.metadata,
  color: "var(--text-muted, var(--text-muted))",
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: 200,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const checkLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minBlockSize: 36,
  padding: "6px 8px",
  border: "1px solid transparent",
  borderRadius: 8,
  ...text.compactBody,
  cursor: "pointer",
  transition: `background-color ${duration.inspectorState} ${easing.standard}, border-color ${duration.inspectorState} ${easing.standard}`,
  selectors: {
    "&:hover": { borderColor: "#D5D5D2", background: "#F2F2EF" },
  },
});
globalStyle(`${checkLabel} input`, { inlineSize: 15, blockSize: 15, accentColor: "#111111" });

export const checkLabelDisabled = style({
  opacity: 0.5,
  cursor: "default",
});

export const selectedCount = style({
  ...text.metadata,
  color: "var(--text-muted, var(--text-muted))",
});

export const limitWarning = style({
  ...text.metadata,
  color: "var(--danger)",
  fontWeight: 600,
});

export const createButton = style([button.ghost, compact, { alignSelf: "flex-start", color: "#333333", textAlign: "left" }]);

export const footer = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 6,
  borderTop: "1px solid #E0E0DD",
  paddingTop: 9,
  marginTop: 2,
});

export const doneButton = style([button.primary, compact]);

export const errorMsg = style({
  ...text.metadata,
  color: "var(--danger)",
  marginTop: 2,
});

export const retryButton = style([button.secondary, compact, { marginTop: 2 }]);
