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

/** The badge settles in as the page arrives: a short rise, never a slide across the corner. */
const badgeSettle = keyframes({
  from: { opacity: 0, transform: "translateY(5px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

/** Reduced motion keeps the arrival, drops the movement. */
const badgeFade = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

/** Each filled step lands after the one before it, so the mark reads as a level being counted out. */
const pipLand = keyframes({
  from: { opacity: 0, transform: "scale(.35)" },
  to: { opacity: 1, transform: "scale(1)" },
});

/**
 * State is metadata, so it is drawn at metadata weight: a hairline pill in the top-left corner, no
 * fill of its own beyond the quiet surface, and the level spelled out. The one-to-four mark repeats
 * the level without relying on colour, which is what ADR 0050 asks of every surface that shows it —
 * and it is the same mark the Life tree card carries, so the two read as one fact. Every leaf has a
 * level, so the badge is always present; the mark, not its presence, carries the difference.
 *
 * The ramp is drawn in ink, not hue. This theme reserves blue for interactive emphasis and gives
 * hierarchy to neutral grey, so a firmer direction reads as a firmer edge and darker text rather
 * than as a new colour: quiet and tertiary at `exploring`, full contrast and a perceivable border by
 * `core`. Colour therefore adds nothing the label and the mark do not already say.
 */
export const state = style({
  flex: "0 1 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minBlockSize: 28,
  margin: 0,
  paddingInline: 11,
  border: `1px solid ${vars.color.borderHairline}`,
  borderRadius: vars.radius.full,
  background: vars.color.surfaceSubtle,
  color: vars.color.textSecondary,
  ...text.metadata,
  fontWeight: 600,
  letterSpacing: ".012em",
  whiteSpace: "nowrap",
  // The reading canvas is already arriving under it, so the badge waits a beat and lands after the
  // page rather than travelling with it. One motion at a time, in order.
  animation: `${badgeSettle} ${duration.popover} ${easing.standard} 60ms both`,
  selectors: {
    '&[data-level="exploring"]': { color: vars.color.textTertiary },
    '&[data-level="leaning"]': { color: vars.color.textSecondary },
    '&[data-level="committed"]': { borderColor: vars.color.borderStrong, color: vars.color.textPrimary },
    '&[data-level="core"]': {
      borderColor: vars.color.borderStrong,
      background: vars.color.surfaceHover,
      color: vars.color.textPrimary,
      fontWeight: 700,
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: `${badgeFade} ${reduced.duration} ${reduced.easing} both`,
    },
    "(forced-colors: active)": { borderColor: "CanvasText", background: "Canvas", color: "CanvasText" },
  },
});

export const stateMark = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3.5,
});

/**
 * A step is either reached or not: reached steps are solid and inherit the badge's ink, the rest are
 * hairline rings of the same size, so the mark keeps its shape at every level and only its weight
 * changes. Reached steps land in sequence; the rings are already there, because an empty step is not
 * an event worth animating.
 */
export const statePip = style({
  inlineSize: 5,
  blockSize: 5,
  borderRadius: vars.radius.full,
  background: "transparent",
  boxShadow: `inset 0 0 0 1px ${vars.color.borderStrong}`,
  selectors: {
    '&[data-active="true"]': {
      background: "currentColor",
      boxShadow: "none",
      animation: `${pipLand} ${duration.check} ${easing.standard} both`,
    },
    '&[data-active="true"]:nth-child(1)': { animationDelay: "130ms" },
    '&[data-active="true"]:nth-child(2)': { animationDelay: "170ms" },
    '&[data-active="true"]:nth-child(3)': { animationDelay: "210ms" },
    '&[data-active="true"]:nth-child(4)': { animationDelay: "250ms" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      selectors: { '&[data-active="true"]': { animation: "none" } },
    },
    "(forced-colors: active)": {
      background: "Canvas",
      boxShadow: "none",
      border: "1px solid CanvasText",
      selectors: { '&[data-active="true"]': { background: "CanvasText" } },
    },
  },
});
