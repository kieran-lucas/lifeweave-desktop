import { globalStyle, style } from "@vanilla-extract/css";

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
  background: "transparent",
  selectors: { "&[data-sidebar-mode=collapsed]": { gridTemplateColumns: "68px minmax(0, 1fr)" } },
});

export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: "26px 15px 18px",
  position: "relative",
  zIndex: 2,
  borderRight: "1px solid color-mix(in srgb, var(--accent) 18%, var(--border-subtle))",
  background: "linear-gradient(180deg, color-mix(in srgb, white 72%, transparent), color-mix(in srgb, var(--surface) 78%, transparent)), color-mix(in srgb, var(--sidebar-background) 74%, transparent)",
  boxShadow: "18px 0 56px color-mix(in srgb, var(--accent) 8%, transparent), inset -1px 0 0 color-mix(in srgb, white 52%, transparent)",
  "@supports": { "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": { backdropFilter: "blur(26px) saturate(1.28)", WebkitBackdropFilter: "blur(26px) saturate(1.28)" } },
  "@media": { "(forced-colors: active)": { background: "Canvas", borderRight: "1px solid CanvasText", boxShadow: "none" } },
});

export const brand = style({ display: "flex", alignItems: "center", gap: 12, minHeight: 42, padding: "0 7px", marginBottom: 28, ...text.objectTitle, color: "var(--text-primary)", letterSpacing: "-0.018em" });
export const brandMark = style({
  display: "grid", placeItems: "center", width: 38, height: 38, flexShrink: 0, borderRadius: "var(--radius-full)", color: "var(--accent)",
  background: "radial-gradient(circle at 35% 28%, color-mix(in srgb, white 80%, transparent), transparent 34%), linear-gradient(145deg, color-mix(in srgb, var(--accent-cyan) 18%, white), color-mix(in srgb, var(--accent-violet) 16%, white))",
  border: "1px solid color-mix(in srgb, var(--accent) 28%, white)",
  boxShadow: "0 10px 30px color-mix(in srgb, var(--accent) 18%, transparent), 0 0 26px color-mix(in srgb, var(--accent-violet) 12%, transparent), inset 0 1px 0 white",
});
export const brandGlyph = style({ fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", filter: "drop-shadow(0 2px 5px color-mix(in srgb, var(--accent) 24%, transparent))" });
export const navGroup = style({ display: "grid", gap: 5 });

export const navButton = style([
  focusRing,
  {
    display: "flex", alignItems: "center", gap: 12, minHeight: 44, width: "100%", padding: "8px 11px", border: "1px solid transparent", borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text-muted)", ...text.navigation, textAlign: "left", cursor: "pointer",
    transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}`,
    selectors: {
      "&[aria-current=page]": { color: "white", fontWeight: 650, borderColor: "color-mix(in srgb, white 28%, var(--accent))", background: "linear-gradient(135deg, var(--accent-cyan) -25%, var(--accent) 44%, var(--accent-violet) 118%)", boxShadow: "0 12px 30px color-mix(in srgb, var(--accent) 25%, transparent), 0 4px 14px color-mix(in srgb, var(--accent-violet) 18%, transparent), inset 0 1px 0 color-mix(in srgb, white 42%, transparent)", transform: "translateX(2px)" },
      "&:hover:not([aria-current=page])": { color: "var(--text-primary)", borderColor: "color-mix(in srgb, var(--accent) 16%, transparent)", background: "linear-gradient(105deg, color-mix(in srgb, var(--accent-cyan) 8%, transparent), color-mix(in srgb, var(--accent-violet) 7%, transparent))", transform: "translateX(2px)" },
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&[aria-current=page]": { transform: "none" }, "&:hover:not([aria-current=page])": { transform: "none" } } },
      "(forced-colors: active)": { selectors: { "&[aria-current=page]": { background: "Highlight", color: "HighlightText", boxShadow: "none", transform: "none" } } },
    },
  },
]);

export const navIcon = style({ flexShrink: 0, width: 20, height: 20, color: "currentColor", filter: "drop-shadow(0 2px 5px color-mix(in srgb, currentColor 18%, transparent))" });
export const navLabel = style({ overflow: "hidden", whiteSpace: "nowrap" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${navLabel}`, { display: "none" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${brand}`, { fontSize: 0, paddingInline: 1, justifyContent: "center" });
export const divider = style({ height: 1, margin: "13px 10px", background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 24%, var(--border-subtle)), transparent)" });
export const collapseButton = style([
  focusRing,
  {
    marginTop: "auto", display: "flex", gap: 12, alignItems: "center", minHeight: 42, padding: "9px 11px", border: "1px solid color-mix(in srgb, var(--accent) 10%, var(--border-subtle))", borderRadius: "var(--radius-control)", background: "color-mix(in srgb, var(--glass-surface) 74%, transparent)", color: "var(--text-muted)", ...text.navigation, cursor: "pointer",
    selectors: { "&:hover": { color: "var(--text-primary)", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border-subtle))", background: "var(--glass-surface-strong)" } },
  },
]);

export const viewport = style({ position: "relative", zIndex: 1, minInlineSize: 0, minBlockSize: 0, overflow: "auto", scrollbarGutter: "stable both-edges", padding: gutter, background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--app-background) 24%, transparent) 100%)" });
export const heading = style({ ...text.pageTitle, margin: 0, color: "var(--text-primary)", textShadow: "0 10px 30px color-mix(in srgb, var(--accent) 12%, transparent)" });
export const lede = style({ ...text.body, margin: 0, color: "var(--text-muted)", maxInlineSize: "72ch" });
export const settingsSection = style({ display: "flex", flexDirection: "column", gap: space.x2, minInlineSize: 0, paddingBlockStart: space.x5, borderTop: "1px solid color-mix(in srgb, var(--accent) 13%, var(--border-subtle))" });
globalStyle(`${settingsSection} > h2`, { ...text.sectionTitle, margin: 0 });
globalStyle(`${settingsSection} > h2 + p`, { ...text.compactBody, margin: 0, color: "var(--text-muted)", maxInlineSize: "72ch" });
globalStyle(`${settingsSection} > h2 + p + *`, { marginBlockStart: space.x3 });
export const coreStatus = style({ ...text.body, margin: 0, color: "var(--text-muted)" });
export const recovery = style({ paddingBlockStart: space.x6 });
export const recoveryCopy = style({ maxInlineSize: "62ch", margin: 0, color: "var(--text-muted)" });
export const recoveryAction = button.primary;
export const shortcutList = style({ display: "grid", gridTemplateColumns: "1fr auto", gap: `${space.control} ${space.field}`, margin: 0, alignItems: "center" });
globalStyle(`${shortcutList} dd`, { margin: 0, justifySelf: "end" });
export const shortcutChord = style({ padding: "4px 9px", borderRadius: "var(--radius-small)", border: "1px solid var(--glass-border)", background: "var(--glass-surface-strong)", boxShadow: "inset 0 1px 0 var(--glass-highlight)", ...text.code, fontWeight: 600, whiteSpace: "nowrap" });
export const dialogButton = button.secondary;
