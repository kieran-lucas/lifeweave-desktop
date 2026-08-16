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

/**
 * Active bars change only ink. Their geometry never animates, so fractional Windows DPI scaling
 * cannot put individual bars onto separate compositor baselines.
 */
const rankInk = keyframes({
  from: { opacity: 0.58 },
  to: { opacity: 1 },
});

/**
 * Direction confidence is a compact matte insignia. Colour is carried by a restrained blue-grey
 * surface and the meter itself; there are deliberately no gradients, glass highlights or shadows.
 * The badge is locked to a 30px outer box so every confidence label shares identical geometry.
 */
export const state = style({
  boxSizing: "border-box",
  flex: "0 1 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  blockSize: 30,
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
 * Label and meter share the exact same 20px lane. The label's content is bottom-aligned to the same
 * y=16px baseline that the bars use (4px bottom inset); the text itself is trimmed separately below.
 */
export const stateLabel = style({
  boxSizing: "border-box",
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "flex-end",
  blockSize: 20,
  paddingBlock: 4,
});

/**
 * Chrome/WebView2 133+ can trim font half-leading to the cap-height/alphabetic metrics. That removes
 * the state-dependent visible drift caused by different glyph shapes without any per-label offsets.
 * Older engines simply keep the deterministic 11px line box as a stable fallback.
 */
export const stateLabelText = style({
  display: "inline-block",
  lineHeight: "11px",
  textBoxTrim: "trim-both",
  textBoxEdge: "cap alphabetic",
});

/**
 * The meter is one 12px-high raster lane inside a 20px well. Every bar occupies an identical
 * 4x12px slot; only the painted pseudo-element inside that slot changes height. This gives all four
 * bars one shared physical bottom edge even at fractional device scales such as Windows 125% DPI.
 */
export const stateMark = style({
  boxSizing: "border-box",
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  inlineSize: 30,
  blockSize: 20,
  padding: 4,
  borderRadius: vars.radius.small,
  background: `color-mix(in srgb, ${vars.color.accentSoft} 72%, ${vars.color.surfaceSubtle})`,
});

/**
 * Each flex item is the same 4x12px slot. The visible bar is an absolutely positioned ::before
 * anchored to bottom: 0, so 6/8/10/12px heights can never participate in flex alignment or baseline
 * rounding. Bottom corners are square as well, removing the final 1px anti-alias ambiguity at 125%.
 */
export const statePip = style({
  boxSizing: "border-box",
  position: "relative",
  flex: "0 0 4px",
  inlineSize: 4,
  blockSize: 12,
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      insetInline: 0,
      insetBlockEnd: 0,
      borderRadius: "1px 1px 0 0",
      background: `color-mix(in srgb, ${vars.color.accent} 36%, ${vars.color.surface})`,
    },
    "&:nth-child(1)::before": { blockSize: 6 },
    "&:nth-child(2)::before": { blockSize: 8 },
    "&:nth-child(3)::before": { blockSize: 10 },
    "&:nth-child(4)::before": { blockSize: 12 },
    '&[data-active="true"]::before': {
      background: vars.color.accentMuted,
      animation: `${rankInk} ${duration.check} ${easing.standard} both`,
    },
    '&[data-active="true"]:nth-child(1)::before': { animationDelay: "120ms" },
    '&[data-active="true"]:nth-child(2)::before': { animationDelay: "170ms" },
    '&[data-active="true"]:nth-child(3)::before': { animationDelay: "220ms" },
    '&[data-active="true"]:nth-child(4)::before': { animationDelay: "270ms" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      selectors: { '&[data-active="true"]::before': { animation: "none" } },
    },
    "(forced-colors: active)": {
      selectors: {
        "&::before": { background: "Canvas", border: "1px solid CanvasText" },
        '&[data-active="true"]::before': { background: "CanvasText" },
      },
    },
  },
});
