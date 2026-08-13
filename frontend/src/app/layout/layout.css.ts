import { globalStyle, keyframes, style, styleVariants } from "@vanilla-extract/css";

import { duration, easing, reduced } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";
import { dialogInset, dialogWidth, frame, space } from "./tokens.css";

/* Native controls share one literal white-paper material. */
globalStyle("button, select", {
  minBlockSize: 34,
  paddingBlock: space.x2,
  paddingInline: space.x3,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-primary)",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
});
globalStyle("button:hover, select:hover", {
  backgroundColor: "#F5F5F5",
  borderColor: "var(--accent)",
});
globalStyle("button:disabled, select:disabled", { cursor: "not-allowed", opacity: 0.55 });

globalStyle("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea", {
  minBlockSize: 34,
  paddingBlock: space.x2,
  paddingInline: space.x3,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-primary)",
  boxShadow: "none",
  transition: `border-color ${duration.state} ${easing.standard}`,
});
globalStyle("textarea", { padding: space.control, minBlockSize: 68 });
globalStyle("input:focus-visible, textarea:focus-visible, select:focus-visible", { borderColor: "var(--accent)" });
globalStyle("input[aria-invalid=true], textarea[aria-invalid=true]", { borderColor: "var(--danger)" });
globalStyle("input:disabled, textarea:disabled", { cursor: "not-allowed", opacity: 0.55 });

globalStyle("input[type=checkbox], input[type=radio]", {
  appearance: "none",
  WebkitAppearance: "none",
  inlineSize: 17,
  blockSize: 17,
  margin: 0,
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  border: "1.5px solid var(--border-strong, var(--border-subtle))",
  background: "#FFFFFF",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
});
globalStyle("input[type=checkbox]", { borderRadius: "var(--radius-small)" });
globalStyle("input[type=radio]", { borderRadius: "var(--radius-full)" });
globalStyle("input[type=checkbox]:hover:not(:disabled), input[type=radio]:hover:not(:disabled)", { borderColor: "var(--accent)" });
globalStyle("input[type=checkbox]:checked, input[type=radio]:checked", { background: "var(--accent)", borderColor: "var(--accent)" });
globalStyle("input[type=checkbox]:checked::after", {
  content: '""',
  inlineSize: 11,
  blockSize: 11,
  background: "#FFFFFF",
  clipPath: 'polygon(41% 71%, 16% 47%, 9% 54%, 41% 85%, 92% 33%, 85% 26%)',
});
globalStyle("input[type=radio]:checked::after", {
  content: '""',
  inlineSize: 7,
  blockSize: 7,
  borderRadius: "var(--radius-full)",
  background: "#FFFFFF",
});
globalStyle("input[type=checkbox]:disabled, input[type=radio]:disabled", { cursor: "not-allowed", opacity: 0.5 });
globalStyle("input[type=checkbox], input[type=radio], input[type=range], progress", { accentColor: "var(--accent)" });
globalStyle("input[type=checkbox], input[type=radio]", {
  "@media": {
    "(forced-colors: active)": {
      appearance: "auto",
      border: 0,
      background: "none",
      inlineSize: "auto",
      blockSize: "auto",
    },
  },
});

globalStyle("fieldset", {
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
});
globalStyle("legend", { padding: `0 ${space.x2}`, color: "var(--text-muted)", fontWeight: 600 });

const pageFrameBase = style({
  inlineSize: "100%",
  marginInline: "auto",
  minInlineSize: 0,
  display: "flex",
  flexDirection: "column",
  gap: space.section,
  paddingBlockEnd: space.page,
  containerType: "inline-size",
  containerName: "page",
  selectors: {
    "&[data-page-flush]": {
      blockSize: "100%",
      minBlockSize: 0,
      gap: 0,
      paddingBlockEnd: 0,
    },
  },
});

export const pageFrame = styleVariants({
  standard: [pageFrameBase, { maxInlineSize: frame.standard }],
  wide: [pageFrameBase, { maxInlineSize: frame.wide }],
  focused: [pageFrameBase, { maxInlineSize: frame.focused }],
  reading: [pageFrameBase, { maxInlineSize: frame.reading }],
});

export const pageHeader = style({ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: space.group, minInlineSize: 0 });
export const pageIdentity = style({ display: "flex", flexDirection: "column", gap: space.x1, minInlineSize: 0 });
export const pageActions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minInlineSize: 0 });
export const sectionStack = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });

const backdropIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

/** Flat dimming plane only. Backdrop blur is globally forbidden by the current visual authority. */
export const dialogBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: "var(--layer-overlay)",
  display: "grid",
  placeItems: "center",
  padding: space.group,
  background: "var(--backdrop)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  animation: `${backdropIn} ${duration.popover} ${easing.standard}`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: `${backdropIn} ${reduced.duration} linear` },
    "(forced-colors: active)": { background: "Canvas" },
  },
});

const dialogIn = keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "none" },
});

const dialogSurfaceBase = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  minInlineSize: 0,
  maxBlockSize: `calc(100dvh - ${dialogInset})`,
  overflowY: "auto",
  padding: space.group,
  borderRadius: "var(--radius-floating)",
  backgroundColor: "#FFFFFF",
  backgroundImage: "var(--paint-grain-fine)",
  border: "1px solid var(--accent)",
  boxShadow: "none",
  color: "var(--text-primary)",
  containerType: "inline-size",
  containerName: "dialog",
  animation: `${dialogIn} ${duration.inspector} ${easing.standard}`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: `${backdropIn} ${reduced.duration} linear` },
    "(forced-colors: active)": { background: "Canvas", backgroundImage: "none", border: "1px solid CanvasText" },
  },
});

export const dialogSurface = styleVariants({
  compact: [dialogSurfaceBase, { inlineSize: `min(${dialogWidth.compact}, calc(100vw - ${dialogInset}))` }],
  standard: [dialogSurfaceBase, { inlineSize: `min(${dialogWidth.standard}, calc(100vw - ${dialogInset}))` }],
  wide: [dialogSurfaceBase, { inlineSize: `min(${dialogWidth.wide}, calc(100vw - ${dialogInset}))` }],
});

export const dialogHeader = style({ display: "flex", flexDirection: "column", gap: space.x1, minInlineSize: 0 });
export const dialogBody = style({ display: "flex", flexDirection: "column", gap: space.group, minInlineSize: 0 });
export const dialogFooter = style({ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: space.control, minInlineSize: 0 });

const stackAtNarrow = { "@container": { "(max-width: 560px)": { gridColumn: "span 6" } } } as const;
export const fieldSpan = styleVariants({
  full: { gridColumn: "span 6" },
  half: { gridColumn: "span 3", ...stackAtNarrow },
  third: { gridColumn: "span 2", ...stackAtNarrow },
});
export const field = style({ display: "flex", flexDirection: "column", gap: space.x1, minInlineSize: 0 });
export const fieldHelp = style({ margin: 0, color: "var(--text-muted)" });
globalStyle(`${dialogHeader} > h2`, { ...text.objectTitle, margin: 0 });
globalStyle(`${dialogHeader} > p`, { ...text.compactBody, margin: 0, color: "var(--text-muted)" });

export const scrollRegion = style({ overflowX: "auto", maxInlineSize: "100%", minInlineSize: 0 });
