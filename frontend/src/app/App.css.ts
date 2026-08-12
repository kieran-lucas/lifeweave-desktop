import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import "../design-system/visual/globalType.css";
import { button } from "../design-system/primitives/controls.css";
import { focusRing } from "../design-system/primitives/utilities.css";
import { text } from "../design-system/visual/typography.css";
import { duration, easing, reduced } from "../design-system/visual/motion.css";
import { gutter, space } from "./layout/tokens.css";

export const appRoot = style({
  display: "grid",
  gridTemplateColumns: "246px minmax(0, 1fr)",
  inlineSize: "100%",
  blockSize: "100%",
  overflow: "hidden",
  position: "relative",
  isolation: "isolate",
  background: "var(--app-background)",
  selectors: { "&[data-sidebar-mode=collapsed]": { gridTemplateColumns: "68px minmax(0, 1fr)" } },
});

/** The navigation rail uses an opaque surface so its boundary stays visually explicit. */
export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: "24px 14px 17px",
  position: "relative",
  zIndex: 2,
  borderRight: "1px solid rgba(178, 198, 228, 0.72)",
  background: "#FFFFFF",
  boxShadow: "none",
  "@media": { "(forced-colors: active)": { background: "Canvas", borderRight: "1px solid CanvasText", boxShadow: "none" } },
});

export const brand = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 42,
  padding: "0 7px",
  marginBottom: 30,
  ...text.objectTitle,
  color: "var(--text-primary)",
  letterSpacing: "-0.024em",
});

export const brandMark = style({
  display: "grid",
  placeItems: "center",
  width: 39,
  height: 39,
  flexShrink: 0,
  borderRadius: "13px",
  color: "#FFFFFF",
  background: "var(--accent)",
  border: "1px solid var(--accent)",
  boxShadow: "none",
});

export const brandGlyph = style({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const navGroup = style({ display: "grid", gap: 5 });

export const navButton = style([
  focusRing,
  {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 43,
    width: "100%",
    padding: "8px 11px",
    border: "1px solid transparent",
    borderRadius: "12px",
    background: "transparent",
    color: "var(--text-muted)",
    ...text.navigation,
    textAlign: "left",
    cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
    selectors: {
      "&[aria-current=page]": {
        color: "var(--accent-muted)",
        fontWeight: 700,
        borderColor: "rgba(132, 158, 230, 0.34)",
        background: "var(--accent-soft)",
        boxShadow: "none",
      },
      "&:hover:not([aria-current=page])": {
        color: "var(--text-primary)",
        borderColor: "rgba(193, 208, 230, 0.65)",
        backgroundColor: "rgba(255, 255, 255, 0.66)",
      },
      "&:active": { transform: "translateY(1px) scale(0.995)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:active": { transform: "none" } } },
      "(forced-colors: active)": {
        selectors: { "&[aria-current=page]": { background: "Highlight", color: "HighlightText", boxShadow: "none" } },
      },
    },
  },
]);

export const navIcon = style({ flexShrink: 0, width: 20, height: 20, color: "currentColor" });
export const navLabel = style({ overflow: "hidden", whiteSpace: "nowrap" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${navLabel}`, { display: "none" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${brand}`, { fontSize: 0, paddingInline: 1, justifyContent: "center" });

export const divider = style({
  height: 1,
  margin: "13px 10px",
  background: "var(--border-subtle)",
});

export const collapseButton = style([
  focusRing,
  {
    marginTop: "auto",
    display: "flex",
    gap: 12,
    alignItems: "center",
    minHeight: 42,
    padding: "9px 11px",
    border: "1px solid transparent",
    borderRadius: "12px",
    background: "transparent",
    color: "var(--text-muted)",
    ...text.navigation,
    cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": { color: "var(--text-primary)", backgroundColor: "rgba(255, 255, 255, 0.72)" },
      "&:active": { transform: "translateY(1px)" },
    },
    "@media": {
      "screen and (max-width: 1180px)": { display: "none" },
      "(prefers-reduced-motion: reduce)": { selectors: { "&:active": { transform: "none" } } },
    },
  },
]);

const routeForward = keyframes({
  from: { opacity: 0.18, transform: "translateX(28px) scale(.992)" },
  to: { opacity: 1, transform: "translateX(0) scale(1)" },
});

const routeBack = keyframes({
  from: { opacity: 0.18, transform: "translateX(-28px) scale(.992)" },
  to: { opacity: 1, transform: "translateX(0) scale(1)" },
});

const routeFade = keyframes({
  from: { opacity: 0.62 },
  to: { opacity: 1 },
});

export const viewport = style({
  position: "relative",
  zIndex: 1,
  minInlineSize: 0,
  minBlockSize: 0,
  overflow: "auto",
  scrollbarGutter: "stable both-edges",
  padding: gutter,
  background: "transparent",
  selectors: {
    '&[data-destination="life"]': {
      overflow: "hidden",
      padding: 0,
      scrollbarGutter: "auto",
    },
  },
});

globalStyle(`${viewport}[data-navigation-motion="forward"] > :not(p)`, {
  animation: `${routeForward} ${duration.route} ${easing.standard} both`,
});
globalStyle(`${viewport}[data-navigation-motion="back"] > :not(p)`, {
  animation: `${routeBack} ${duration.route} ${easing.standard} both`,
});
globalStyle(`${viewport} > :not(p)`, {
  transformOrigin: "center",
  willChange: "transform, opacity",
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: `${routeFade} ${reduced.duration} ${reduced.easing} both`,
      transform: "none",
      willChange: "opacity",
    },
  },
});

export const lifeRoute = style({
  inlineSize: "100%",
  blockSize: "100%",
  minInlineSize: 0,
  minBlockSize: 0,
  overflow: "hidden",
});

export const heading = style({ ...text.pageTitle, margin: 0, color: "var(--text-primary)" });
export const lede = style({ ...text.body, margin: 0, color: "var(--text-muted)", maxInlineSize: "72ch" });

export const settingsSection = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x2,
  minInlineSize: 0,
  paddingBlockStart: space.x5,
  borderTop: "1px solid var(--paint-edge)",
});
globalStyle(`${settingsSection} > h2`, { ...text.sectionTitle, margin: 0 });
globalStyle(`${settingsSection} > h2 + p`, { ...text.compactBody, margin: 0, color: "var(--text-muted)", maxInlineSize: "72ch" });
globalStyle(`${settingsSection} > h2 + p + *`, { marginBlockStart: space.x3 });

export const settingsToolGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: space.x3,
  "@media": { "screen and (max-width: 760px)": { gridTemplateColumns: "1fr" } },
});

export const settingsToolButton = style([
  focusRing,
  {
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 1fr)",
    alignItems: "center",
    gap: 12,
    minInlineSize: 0,
    minBlockSize: 82,
    padding: "14px 16px",
    border: "1px solid var(--paint-edge)",
    borderRadius: "var(--radius-surface)",
    backgroundColor: "var(--surface-raised)",
    backgroundImage: "var(--paint-grain-fine)",
    color: "var(--text-primary)",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "var(--glow-crystal)",
    transition: `border-color ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": { borderColor: "var(--accent)", transform: "translateY(-1px)" },
      "&:active": { transform: "translateY(1px)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:hover": { transform: "none" }, "&:active": { transform: "none" } } },
    },
  },
]);

globalStyle(`${settingsToolButton} > span`, { display: "grid", gap: 4, minInlineSize: 0 });
globalStyle(`${settingsToolButton} strong`, { ...text.objectTitle });
globalStyle(`${settingsToolButton} small`, { ...text.metadata, color: "var(--text-muted)" });

export const settingsToolIcon = style({
  inlineSize: 24,
  blockSize: 24,
  justifySelf: "center",
});

export const settingsSubpage = style({ display: "grid", gap: space.x3 });
export const settingsBackButton = style([button.ghost, { justifySelf: "start" }]);

export const coreStatus = style({ ...text.body, margin: 0, color: "var(--text-muted)" });
export const recovery = style({ paddingBlockStart: space.x6 });
export const recoveryCopy = style({ maxInlineSize: "62ch", margin: 0, color: "var(--text-muted)" });
export const recoveryAction = button.primary;
export const shortcutList = style({ display: "grid", gridTemplateColumns: "1fr auto", gap: `${space.control} ${space.field}`, margin: 0, alignItems: "center" });
globalStyle(`${shortcutList} dd`, { margin: 0, justifySelf: "end" });
export const shortcutChord = style({
  padding: "4px 9px",
  borderRadius: "var(--radius-small)",
  border: "1px solid var(--paint-edge)",
  backgroundColor: "var(--surface-raised)",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  ...text.code,
  fontWeight: 600,
  whiteSpace: "nowrap",
});
export const dialogButton = button.secondary;
