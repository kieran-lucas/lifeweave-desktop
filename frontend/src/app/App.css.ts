import { globalStyle, keyframes, style } from "@vanilla-extract/css";

import "../design-system/visual/globalType.css";
import { button } from "../design-system/primitives/controls.css";
import { focusRing } from "../design-system/primitives/utilities.css";
import { text } from "../design-system/visual/typography.css";
import { duration, easing } from "../design-system/visual/motion.css";
import { gutter, space } from "./layout/tokens.css";

export const appRoot = style({
  display: "grid",
  gridTemplateColumns: "252px minmax(0, 1fr)",
  inlineSize: "100%",
  blockSize: "100%",
  overflow: "hidden",
  position: "relative",
  isolation: "isolate",
  background: "#FFFFFF",
  selectors: { "&[data-sidebar-mode=collapsed]": { gridTemplateColumns: "68px minmax(0, 1fr)" } },
});

/** One solid blue navigation plane. No tint, wash, gradient, blur or glow. */
export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: "26px 15px 18px",
  position: "relative",
  zIndex: 2,
  borderRight: "1px solid #1D4ED8",
  backgroundColor: "var(--accent)",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  "@media": { "(forced-colors: active)": { background: "Canvas", borderRight: "1px solid CanvasText" } },
});

export const brand = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 42,
  padding: "0 7px",
  marginBottom: 28,
  ...text.objectTitle,
  color: "#FFFFFF",
  letterSpacing: "-0.018em",
});

export const brandMark = style({
  display: "grid",
  placeItems: "center",
  width: 38,
  height: 38,
  flexShrink: 0,
  borderRadius: "var(--radius-control)",
  color: "var(--accent)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  border: "1px solid #FFFFFF",
  boxShadow: "none",
});

export const brandGlyph = style({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
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
    minHeight: 44,
    width: "100%",
    padding: "8px 11px",
    border: "1px solid transparent",
    borderRadius: "var(--radius-control)",
    background: "transparent",
    color: "#FFFFFF",
    ...text.navigation,
    textAlign: "left",
    cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
    selectors: {
      "&[aria-current=page]": {
        color: "var(--accent)",
        fontWeight: 700,
        borderColor: "#FFFFFF",
        backgroundColor: "#FFFFFF",
        backgroundImage: "var(--paint-grain-fine)",
        boxShadow: "none",
      },
      "&:hover:not([aria-current=page])": {
        color: "#FFFFFF",
        borderColor: "#1D4ED8",
        backgroundColor: "#1D4ED8",
        backgroundImage: "var(--paint-grain-fine)",
      },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
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
  background: "#1D4ED8",
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
    border: "1px solid #FFFFFF",
    borderRadius: "var(--radius-control)",
    backgroundColor: "var(--accent)",
    backgroundImage: "var(--paint-grain-fine)",
    color: "#FFFFFF",
    ...text.navigation,
    cursor: "pointer",
    selectors: {
      "&:hover": {
        color: "var(--accent)",
        borderColor: "#FFFFFF",
        backgroundColor: "#FFFFFF",
      },
    },
  },
]);

const routeIn = keyframes({
  from: { opacity: 0.72 },
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
  background: "#FFFFFF",
});

globalStyle(`${viewport} > :not(p)`, {
  animation: `${routeIn} ${duration.route} ${easing.standard} both`,
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
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  ...text.code,
  fontWeight: 600,
  whiteSpace: "nowrap",
});
export const dialogButton = button.secondary;
