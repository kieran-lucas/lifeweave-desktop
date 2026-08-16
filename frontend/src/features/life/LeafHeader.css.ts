import { keyframes, style } from "@vanilla-extract/css";

import { vars } from "../../design-system/visual/contract.css";
import { duration, easing, reduced } from "../../design-system/visual/motion.css";
import { family, text } from "../../design-system/visual/typography.css";
import { srOnly as sharedSrOnly } from "../../design-system/primitives/utilities.css";

export const srOnly = sharedSrOnly;

/**
 * Leaf header geometry.
 *
 * Two layers. The corner row spans the full reading page, so state and controls sit in the page's
 * own top corners rather than crowding the name. The identity below keeps its own centred measure,
 * narrower than the page and independent of the Markdown column, so a long leaf name wraps into a
 * shapely two lines instead of one wide ribbon.
 *
 * The header closes with the hairline that hands the page over to the document, and vertical rhythm
 * is carried by each element's own leading margin, so a leaf without a secondary name or without a
 * meaningful state simply closes the gap.
 */
export const header = style({
  inlineSize: "100%",
  paddingBlockEnd: 42,
  borderBlockEnd: `1px solid ${vars.color.borderHairline}`,
  "@media": {
    "(max-width: 760px)": { paddingBlockEnd: 32 },
  },
});

/**
 * The corner row keeps its height whether or not either corner is filled, so the identity below
 * never shifts between an empty leaf, a leaf in its default state, and a leaf with both.
 */
export const corners = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
  minBlockSize: 32,
});

export const commandSlot = style({
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const identity = style({
  display: "grid",
  justifyItems: "center",
  inlineSize: "100%",
  maxInlineSize: 720,
  marginInline: "auto",
  marginBlockStart: 18,
  textAlign: "center",
  "@media": {
    "(max-width: 760px)": { marginBlockStart: 12 },
  },
});

/** The mark and its two rules read as one quiet crest rather than an icon dropped on the page. */
export const crest = style({
  display: "flex",
  alignItems: "center",
  gap: 18,
  inlineSize: "min(300px, 100%)",
  marginBlockEnd: 26,
});

export const crestRule = style({
  flex: "1 1 auto",
  blockSize: 1,
  background: `linear-gradient(to right, transparent, ${vars.color.borderHairline})`,
  selectors: {
    "&:last-child": { background: `linear-gradient(to left, transparent, ${vars.color.borderHairline})` },
  },
  "@media": {
    "(forced-colors: active)": {
      background: "CanvasText",
      selectors: { "&:last-child": { background: "CanvasText" } },
    },
  },
});

export const crestMark = style({
  flex: "0 0 auto",
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 44,
  blockSize: 44,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.surface,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: 21,
  lineHeight: 1,
});

/**
 * The leaf name is set in the editorial family, not the productive one: it is the title of the
 * document below it, and the two should read as one artifact. The size ramps between the section
 * scale and a little above the display role — the display role is the largest fixed role in the
 * system and a centred object title needs the extra presence on a wide desktop window.
 */
export const title = style({
  // Wide enough that an ordinary two-word area name stays on one line, narrow enough that a long
  // one breaks into a shapely second line instead of a full-width ribbon.
  maxInlineSize: "22ch",
  margin: 0,
  fontFamily: family.editorial,
  fontSize: "clamp(30px, 3.9vw, 44px)",
  lineHeight: 1.08,
  fontWeight: 600,
  letterSpacing: "-.021em",
  color: vars.color.textPrimary,
  textWrap: "balance",
  overflowWrap: "break-word",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 8, borderRadius: 6 },
  },
});

export const subtitle = style({
  maxInlineSize: "50ch",
  margin: "13px 0 0",
  fontFamily: family.uiText,
  fontSize: 18,
  lineHeight: "26px",
  fontWeight: 400,
  letterSpacing: "-.004em",
  color: vars.color.textTertiary,
  textWrap: "balance",
});

/** The compact insignia resolves after the reading plane without calling attention to itself. */
const badgeSettle = keyframes({
  from: { opacity: 0, transform: "translateY(3px) scale(.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

/** Reduced motion keeps the arrival, drops the movement. */
const badgeFade = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

/** Confidence rises from a shared baseline; no glow or elastic finish is needed on the matte mark. */
const rankRise = keyframes({
  "0%": { opacity: 0.35, transform: "scaleY(.4)" },
  "100%": { opacity: 1, transform: "scaleY(1)" },
});

/**
 * Direction confidence is a compact matte insignia. Colour is carried by a restrained blue-grey
 * surface and the meter itself; there are deliberately no gradients, glass highlights or shadows.
 * The result should feel printed into the reading plane rather than floating above it.
 */
export const state = style({
  boxSizing: "border-box",
  flex: "0 1 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minBlockSize: 30,
  margin: 0,
  padding: "4px 9px 4px 5px",
  border: `1px solid color-mix(in srgb, ${vars.color.accent} 24%, ${vars.color.borderStrong})`,
  borderRadius: vars.radius.control,
  background: `color-mix(in srgb, ${vars.color.accentSoft} 44%, ${vars.color.surfaceSubtle})`,
  color: vars.color.textSecondary,
  ...text.metadata,
  fontSize: 11,
  lineHeight: "14px",
  fontWeight: 700,
  letterSpacing: ".055em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  animation: `${badgeSettle} ${duration.popover} ${easing.standard} 55ms both`,
  selectors: {
    '&[data-level="exploring"]': {
      borderColor: `color-mix(in srgb, ${vars.color.accent} 22%, ${vars.color.borderStrong})`,
      background: `color-mix(in srgb, ${vars.color.accentSoft} 38%, ${vars.color.surfaceSubtle})`,
      color: vars.color.textSecondary,
    },
    '&[data-level="leaning"]': {
      borderColor: `color-mix(in srgb, ${vars.color.accent} 28%, ${vars.color.borderStrong})`,
      background: `color-mix(in srgb, ${vars.color.accentSoft} 44%, ${vars.color.surfaceSubtle})`,
      color: vars.color.textSecondary,
    },
    '&[data-level="committed"]': {
      borderColor: `color-mix(in srgb, ${vars.color.accent} 36%, ${vars.color.borderStrong})`,
      background: `color-mix(in srgb, ${vars.color.accentSoft} 50%, ${vars.color.surfaceSubtle})`,
      color: vars.color.textPrimary,
    },
    '&[data-level="core"]': {
      borderColor: `color-mix(in srgb, ${vars.color.accent} 44%, ${vars.color.borderStrong})`,
      background: `color-mix(in srgb, ${vars.color.accentSoft} 58%, ${vars.color.surfaceSubtle})`,
      color: vars.color.textPrimary,
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: `${badgeFade} ${reduced.duration} ${reduced.easing} both`,
    },
    "(forced-colors: active)": {
      borderColor: "CanvasText",
      background: "Canvas",
      color: "CanvasText",
    },
  },
});

/**
 * Give the label the same 20px alignment box as the meter. A two-pixel optical correction aligns
 * the visible glyph bottom with the meter's solid baseline on Windows without disturbing its grid.
 */
export const stateLabel = style({
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  blockSize: 20,
  lineHeight: "11px",
  position: "relative",
  top: 2,
});

/**
 * The meter is geometrically centred: its tallest 12px bar sits inside a 20px well with exactly
 * 4px above and 4px below. This keeps the top and bottom visual margins balanced.
 */
export const stateMark = style({
  boxSizing: "border-box",
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 2,
  inlineSize: 30,
  blockSize: 20,
  padding: 4,
  borderRadius: vars.radius.small,
  background: `color-mix(in srgb, ${vars.color.accentSoft} 72%, ${vars.color.surfaceSubtle})`,
});

/**
 * The four bars sit on an integer pixel grid: 4px wide, 2px gaps and 6/8/10/12px heights. Inactive
 * bars are solid muted shapes rather than 1px outlines, avoiding uneven rasterisation at this size.
 */
export const statePip = style({
  boxSizing: "border-box",
  flex: "0 0 auto",
  inlineSize: 4,
  border: 0,
  borderRadius: 1,
  background: `color-mix(in srgb, ${vars.color.accent} 24%, ${vars.color.surface})`,
  opacity: 1,
  transformOrigin: "50% 100%",
  selectors: {
    "&:nth-child(1)": { blockSize: 6 },
    "&:nth-child(2)": { blockSize: 8 },
    "&:nth-child(3)": { blockSize: 10 },
    "&:nth-child(4)": { blockSize: 12 },
    '&[data-active="true"]': {
      background: vars.color.accentMuted,
      animation: `${rankRise} ${duration.check} ${easing.standard} both`,
    },
    '&[data-active="true"]:nth-child(1)': { animationDelay: "120ms" },
    '&[data-active="true"]:nth-child(2)': { animationDelay: "170ms" },
    '&[data-active="true"]:nth-child(3)': { animationDelay: "220ms" },
    '&[data-active="true"]:nth-child(4)': { animationDelay: "270ms" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      selectors: { '&[data-active="true"]': { animation: "none" } },
    },
    "(forced-colors: active)": {
      background: "Canvas",
      border: "1px solid CanvasText",
      selectors: { '&[data-active="true"]': { background: "CanvasText" } },
    },
  },
});
