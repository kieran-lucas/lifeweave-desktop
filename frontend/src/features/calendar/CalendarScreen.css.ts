import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { duration, easing } from "../../design-system/visual/motion.css";

const orbitDrift = keyframes({
  "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(-8deg)", opacity: 0.48 },
  "50%": { transform: "translate3d(-16px, 10px, 0) rotate(-5deg)", opacity: 0.72 },
});

const selectedPulse = keyframes({
  "0%, 100%": { boxShadow: "0 0 0 1px rgba(255,255,255,.22), 0 12px 30px rgba(78,111,255,.18)" },
  "50%": { boxShadow: "0 0 0 1px rgba(255,255,255,.34), 0 16px 38px rgba(104,91,255,.24)" },
});

export const lede = style({ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" });

export const actions = style({
  display: "flex",
  alignItems: "center",
  gap: 5,
  minInlineSize: 0,
  padding: 4,
  border: "1px solid rgba(188, 204, 229, 0.70)",
  borderRadius: "14px",
  background: "rgba(255,255,255,.64)",
  backdropFilter: "blur(14px)",
  boxShadow: "var(--glow-compact)",
});

export const monthLabel = style({
  minInlineSize: "10.5rem",
  textAlign: "center",
  fontSize: "0.9375rem",
  fontWeight: 680,
  letterSpacing: "-0.018em",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-primary)",
});

export const iconAction = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 32,
  blockSize: 32,
  padding: 0,
  border: "1px solid transparent",
  borderRadius: "10px",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "rgba(234,240,255,.92)", borderColor: "rgba(125,151,224,.28)", color: "var(--accent-muted)", transform: "translateY(-1px)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
});

export const todayAction = style({
  minBlockSize: 32,
  marginInlineStart: 4,
  paddingInline: 11,
  border: "1px solid rgba(117, 144, 218, 0.32)",
  borderRadius: "10px",
  background: "linear-gradient(110deg, rgba(237,243,255,.96), rgba(247,244,255,.94))",
  color: "var(--accent-muted)",
  fontSize: "0.8125rem",
  fontWeight: 680,
  cursor: "pointer",
  boxShadow: "0 5px 14px rgba(78,111,255,.08)",
  transition: `border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { borderColor: "rgba(78,111,255,.52)", transform: "translateY(-1px)", boxShadow: "0 8px 20px rgba(78,111,255,.14)" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
});

export const grid = style({
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  display: "grid",
  minInlineSize: 0,
  border: "1px solid rgba(179, 199, 229, 0.76)",
  borderRadius: "24px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,.90), rgba(242,247,255,.74)), radial-gradient(circle at 82% 16%, rgba(89,136,255,.18), transparent 36%), radial-gradient(circle at 16% 88%, rgba(145,112,255,.10), transparent 34%)",
  backdropFilter: "blur(18px) saturate(1.06)",
  boxShadow: "var(--glow-hero), inset 0 1px 0 rgba(255,255,255,.88)",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      zIndex: 0,
      inlineSize: "640px",
      blockSize: "340px",
      insetInlineEnd: "-210px",
      insetBlockStart: "-185px",
      border: "1px solid rgba(91,124,214,.16)",
      borderRadius: "50%",
      boxShadow: "0 0 0 42px rgba(107,135,218,.045), 0 0 0 92px rgba(142,119,230,.03)",
      animation: `${orbitDrift} 16s ease-in-out infinite`,
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      zIndex: 0,
      inlineSize: 220,
      blockSize: 220,
      insetInlineStart: "-105px",
      insetBlockEnd: "-125px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,255,255,.88) 0 4%, rgba(102,185,255,.15) 28%, rgba(152,112,255,.08) 50%, transparent 72%)",
      pointerEvents: "none",
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { selectors: { "&::before": { animation: "none" } } },
    "(forced-colors: active)": {
      background: "Canvas",
      borderColor: "CanvasText",
      boxShadow: "none",
      selectors: { "&::before": { display: "none" }, "&::after": { display: "none" } },
    },
  },
});
globalStyle(`${grid} > *`, { position: "relative", zIndex: 1 });

export const weekdays = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  borderBottom: "1px solid rgba(190, 205, 229, 0.72)",
  background: "linear-gradient(90deg, rgba(239,244,255,.70), rgba(249,247,255,.68))",
  color: "var(--text-muted)",
  textAlign: "center",
  paddingBlock: 11,
  fontSize: "0.6875rem",
  fontWeight: 720,
  letterSpacing: "0.075em",
  textTransform: "uppercase",
});

export const week = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" });

export const cell = style({
  minWidth: 0,
  minHeight: 108,
  borderInlineStart: "1px solid rgba(205, 218, 237, 0.66)",
  selectors: {
    "&:first-child": { borderInlineStart: 0 },
    [`${week}:not(:last-child) &`]: { borderBottom: "1px solid rgba(205, 218, 237, 0.66)" },
  },
});

export const cellButton = style({
  position: "relative",
  overflow: "hidden",
  width: "100%",
  height: "100%",
  minHeight: 108,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "space-between",
  gap: space.x2,
  padding: "11px 12px",
  border: 0,
  background: "rgba(255,255,255,.46)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&[data-outside]": { color: "var(--text-disabled, #9AA8BE)", background: "rgba(248,250,255,.34)" },
    "&:hover": { background: "linear-gradient(145deg, rgba(255,255,255,.86), rgba(232,241,255,.72))", boxShadow: "inset 0 0 0 1px rgba(111,142,222,.16)" },
    "[aria-selected=true] &": {
      background: "linear-gradient(145deg, rgba(77,111,255,.96), rgba(112,91,236,.92))",
      color: "#FFFFFF",
      animation: `${selectedPulse} 4.8s ease-in-out infinite`,
    },
    "&:focus-visible": { zIndex: 2, outline: "2px solid var(--focus-ring)", outlineOffset: -3 },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { selectors: { "[aria-selected=true] &": { animation: "none" } } },
    "(forced-colors: active)": {
      selectors: { "[aria-selected=true] &": { background: "Highlight", color: "HighlightText", animation: "none" } },
    },
  },
});

export const dayNumber = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 29,
  blockSize: 29,
  border: "1px solid transparent",
  borderRadius: "var(--radius-full)",
  fontSize: "0.8125rem",
  fontWeight: 720,
  fontVariantNumeric: "tabular-nums",
  selectors: {
    [`${cellButton}[aria-current=date] &`]: {
      borderColor: "var(--accent)",
      color: "var(--accent-muted)",
      background: "rgba(235,241,255,.88)",
      boxShadow: "var(--glow-dot)",
    },
    [`${cellButton}[data-outside] &`]: { fontWeight: 500 },
    [`[aria-selected=true] ${cellButton} &`]: { borderColor: "rgba(255,255,255,.70)", color: "#FFFFFF", background: "rgba(255,255,255,.12)", boxShadow: "none" },
  },
});

export const summary = style({
  display: "flex",
  alignItems: "baseline",
  gap: 5,
  minInlineSize: 0,
  color: "var(--text-muted)",
  fontSize: "0.6875rem",
  lineHeight: 1.25,
  selectors: {
    "[aria-selected=true] &": { color: "rgba(255,255,255,.82)" },
  },
});

export const taskCount = style({ color: "currentColor", fontSize: "0.9rem", fontWeight: 780, fontVariantNumeric: "tabular-nums" });
export const duration = style({ marginInlineStart: "auto", color: "currentColor", fontVariantNumeric: "tabular-nums" });
export const needsAttention = style({
  marginInlineStart: 3,
  padding: "1px 5px",
  border: "1px solid currentColor",
  borderRadius: "var(--radius-small)",
  fontSize: "0.625rem",
  fontWeight: 680,
});
