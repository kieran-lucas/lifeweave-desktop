import { globalStyle, keyframes, style, styleVariants } from "@vanilla-extract/css";

import { duration, easing, reduced } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";
import { dialogInset, dialogWidth, frame, space } from "./tokens.css";

/* ── Baseline native-control geometry ────────────────────────────────────────────────────────
 *
 * A `<button>` or `<select>` with no rule of its own renders at the UA default `padding: 1px 6px`,
 * which reads as a cramped browser control rather than part of the application. The maximized audit
 * found that on the week strip, the Analytics period controls, the tag actions, the planning and
 * saved-view actions, the plan table, and every `<select>` in the Task dialog.
 *
 * These are deliberately **element** selectors, specificity 0-0-1, so any component that already
 * declares its own padding still wins.
 *
 * **Task 51 extends this to appearance.** Task 50 deliberately set no colour, border, radius or
 * shadow here, because art direction was unallocated then. The consequence was visible the moment
 * the art pass rendered: every control that had never been styled individually — the Analytics
 * period buttons, the tag actions, the plan table controls, the Foundation tools, every `<select>`
 * in the Task dialog — still drew as a grey Windows button in the middle of a luminous page. Those
 * were the last "unstyled enterprise app" surfaces in the product, and there were dozens of them
 * across screens nobody would think to restyle by hand.
 *
 * Giving the base element the low-chrome material lifts all of them at once, and the 0-0-1
 * specificity means every component that already made its own decision is untouched.
 */
globalStyle("button, select", {
  minBlockSize: 34,
  paddingBlock: space.x2,
  paddingInline: space.x3,
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-control)",
  background: "var(--glass-surface)",
  color: "var(--text-primary)",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
});
globalStyle("button:hover, select:hover", {
  background: "var(--glass-surface-strong)",
  borderColor: "color-mix(in srgb, var(--accent) 28%, var(--border-subtle))",
});
globalStyle("button:disabled, select:disabled", { cursor: "not-allowed", opacity: 0.55 });
/*
 * Inputs join the same material so a form does not mix two centuries of control design.
 *
 * `:not([type=checkbox]):not([type=radio])` is load-bearing. The bare `input` selector also matched
 * checkboxes and radios, so every one of them was being given a 10px radius and a glass fill on top
 * of its native box — the control gallery rendered that and it is why they are excluded here and
 * designed explicitly below.
 */
globalStyle("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea", {
  minBlockSize: 34,
  paddingBlock: space.x2,
  paddingInline: space.x3,
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-control)",
  background: "var(--glass-surface-strong)",
  color: "var(--text-primary)",
  transition: `border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
});
/*
 * The gallery also caught this: `input` had a border, a radius and a background but **no padding**,
 * so every text field in the product sat on the user-agent default of roughly 1px and read as
 * cramped against its own edge. Only `textarea` had ever been given any.
 */
globalStyle("textarea", { padding: space.control, minBlockSize: 68 });

/* A field that is being edited earns a quiet ring rather than a heavier border. */
globalStyle("input:focus-visible, textarea:focus-visible, select:focus-visible", {
  borderColor: "var(--accent)",
});
globalStyle("input[aria-invalid=true], textarea[aria-invalid=true]", {
  borderColor: "var(--danger)",
});
globalStyle("input:disabled, textarea:disabled", { cursor: "not-allowed", opacity: 0.55 });

/*
 * Selection controls, drawn rather than inherited.
 *
 * These were the last genuinely native Windows controls in the product. `accent-color` alone gets
 * the tick blue but leaves the box drawn by the platform, at the platform's radius and border
 * weight, which is visibly not the rest of this interface.
 */
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
  background: "var(--surface)",
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
});
globalStyle("input[type=checkbox]", { borderRadius: "var(--radius-small)" });
globalStyle("input[type=radio]", { borderRadius: "var(--radius-full)" });
globalStyle("input[type=checkbox]:hover:not(:disabled), input[type=radio]:hover:not(:disabled)", {
  borderColor: "var(--accent)",
});
globalStyle("input[type=checkbox]:checked, input[type=radio]:checked", {
  background: "var(--accent)",
  borderColor: "var(--accent)",
});
/*
 * The mark is drawn with a mask rather than a pseudo-element glyph, so it scales with the box and
 * carries no font dependency — a text tick inherits the document family and would change shape with
 * the type system.
 */
globalStyle("input[type=checkbox]:checked::after", {
  content: '""',
  inlineSize: 11,
  blockSize: 11,
  background: "var(--accent-contrast)",
  clipPath:
    'polygon(41% 71%, 16% 47%, 9% 54%, 41% 85%, 92% 33%, 85% 26%)',
});
globalStyle("input[type=radio]:checked::after", {
  content: '""',
  inlineSize: 7,
  blockSize: 7,
  borderRadius: "var(--radius-full)",
  background: "var(--accent-contrast)",
});
globalStyle("input[type=checkbox]:disabled, input[type=radio]:disabled", {
  cursor: "not-allowed",
  opacity: 0.5,
});
globalStyle("input[type=checkbox], input[type=radio], input[type=range], progress", {
  accentColor: "var(--accent)",
});
/*
 * Forced colors: hand the drawing back to the platform rather than keeping a tinted approximation.
 * `appearance: none` plus a `background` means nothing in a high-contrast palette, and the user has
 * asked the OS for exactly the native rendering we removed.
 */
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
/*
 * `<fieldset>` is the last native element that still drew its own century-old chrome: a thin inset
 * groove with a notch cut for the legend. It appears in Settings' goal editors, the Task dialog's
 * schedule and recurrence groups, and the tag editors, so it gets the material here rather than in
 * three feature files.
 */
globalStyle("fieldset", {
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-control)",
  background: "var(--glass-surface)",
});
globalStyle("legend", { padding: `0 ${space.x2}`, color: "var(--text-muted)", fontWeight: 600 });

/**
 * The shared layout classes (ADR 0044).
 *
 * Every class here has at least two immediate concrete consumers; anything with one consumer stays
 * in its domain CSS. This is not a UI framework, and nothing here defines colour, typography,
 * radius, shadow, icon, or motion beyond reusing the surface/border tokens the application already
 * uses for containment.
 */

/* ── Page frames ─────────────────────────────────────────────────────────────────────────── */

const pageFrameBase = style({
  inlineSize: "100%",
  marginInline: "auto",
  minInlineSize: 0,
  display: "flex",
  flexDirection: "column",
  gap: space.section,
  paddingBlockEnd: space.page,
  // One query container per page, so domain grids can reflow against the frame they actually sit
  // in rather than against the window.
  containerType: "inline-size",
  containerName: "page",
});

/**
 * The finite taxonomy. A top-level surface picks exactly one; there is no fourth width and no
 * page-local override.
 */
export const pageFrame = styleVariants({
  standard: [pageFrameBase, { maxInlineSize: frame.standard }],
  wide: [pageFrameBase, { maxInlineSize: frame.wide }],
  reading: [pageFrameBase, { maxInlineSize: frame.reading }],
});

export const pageHeader = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: space.group,
  minInlineSize: 0,
});

export const pageIdentity = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  minInlineSize: 0,
});

export const pageActions = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: space.control,
  minInlineSize: 0,
});

/* ── Vertical rhythm ─────────────────────────────────────────────────────────────────────── */

/** Between major sections. Large gap: "this is a new part of the page". */
export const sectionStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space.section,
  minInlineSize: 0,
});

/** Within one section. Medium gap: "this belongs to the same idea". */
export const groupStack = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  minInlineSize: 0,
});

/* ── Modal geometry ──────────────────────────────────────────────────────────────────────── */

/*
 * The backdrop is part of the world, not a flat black wash over it. It takes the contract's own
 * `backdrop` role — a deep tint of the text colour rather than raw black — so the page beneath
 * recedes without being extinguished, and the same rule reads correctly in both themes.
 *
 * The fade is the only thing that animates. Blur is not transitioned: interpolating a backdrop
 * filter is real per-frame GPU work on integrated graphics, which is exactly the cost ADR 0045 §8
 * rules out on an interaction path.
 */
const backdropIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

export const dialogBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: "var(--layer-overlay)",
  display: "grid",
  placeItems: "center",
  padding: space.group,
  background: "var(--backdrop)",
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
  animation: `${backdropIn} ${duration.popover} ${easing.standard}`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: `${backdropIn} ${reduced.duration} linear` },
    "(forced-colors: active)": { background: "Canvas", backdropFilter: "none" },
  },
});

/*
 * A dialog arrives from slightly below and slightly small — 8px and 2% — which reads as the surface
 * settling into place rather than as a card being pasted onto the screen. The travel is deliberately
 * tiny: anything larger becomes a transition the user waits through.
 *
 * Reduced motion keeps the fade and drops the travel and the scale, so the change is still perceived
 * without any movement across the field.
 */
const dialogIn = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(0.98)" },
  to: { opacity: 1, transform: "none" },
});

const dialogSurfaceBase = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  // The surface, not the page behind it, owns the overflow. Without `min-inline-size: 0` an
  // intrinsically wide child (a long select option, a wide table) would push the surface past the
  // viewport instead of being constrained by it.
  minInlineSize: 0,
  maxBlockSize: `calc(100dvh - ${dialogInset})`,
  overflowY: "auto",
  padding: space.group,
  /*
   * Task 51: the dialog surface is glass.
   *
   * Every modal in the product takes its surface from here, so materialising this one base migrates
   * the Task dialog, Search, shortcut help, the restore confirmation, the Saved View editor, Life
   * links and all four import previews at once — the edge flows that would otherwise keep the old
   * flat look long after the main screens were done.
   *
   * `glassStrong` because dialogs carry forms and dense prose; the tint stays high so reading is
   * unaffected and the blur is only ever an enhancement.
   */
  /*
   * `floating`, not `surface`. A dialog is the largest object that ever leaves the page plane, and
   * corner softness reads in proportion to the object — the same radius that suits a 200px card
   * looks tight on a 720px surface.
   */
  borderRadius: "var(--radius-floating)",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  boxShadow: "var(--elevation-modal)",
  color: "var(--text-primary)",
  containerType: "inline-size",
  containerName: "dialog",
  animation: `${dialogIn} ${duration.inspector} ${easing.standard}`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: `${backdropIn} ${reduced.duration} linear`,
    },
  },
});

export const dialogSurface = styleVariants({
  compact: [
    dialogSurfaceBase,
    { inlineSize: `min(${dialogWidth.compact}, calc(100vw - ${dialogInset}))` },
  ],
  standard: [
    dialogSurfaceBase,
    { inlineSize: `min(${dialogWidth.standard}, calc(100vw - ${dialogInset}))` },
  ],
  wide: [
    dialogSurfaceBase,
    { inlineSize: `min(${dialogWidth.wide}, calc(100vw - ${dialogInset}))` },
  ],
});

export const dialogHeader = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  minInlineSize: 0,
});

export const dialogBody = style({
  display: "flex",
  flexDirection: "column",
  gap: space.group,
  minInlineSize: 0,
});

/**
 * The action footer scrolls with the surface rather than sticking. §39 warns that a sticky footer
 * must be proven not to cover fields; scrolling the whole surface has no such failure mode and the
 * footer stays reachable because the surface itself is the scroll container.
 */
export const dialogFooter = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: space.control,
  minInlineSize: 0,
});

/** Leading placement for controls that are not the primary confirm/cancel pair, such as Delete. */
export const dialogFooterLeading = style({ marginInlineEnd: "auto" });

/* ── Form geometry ───────────────────────────────────────────────────────────────────────── */

/**
 * Six tracks so a row can be halves (3+3) or thirds (2+2+2) without a second grid. Below 560px of
 * container width every semantic field takes the full row; compact sub-controls such as an
 * hour/minute pair keep their own local row inside their field.
 */
export const formGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: space.field,
  minInlineSize: 0,
});

const stackAtNarrow = { "@container": { "(max-width: 560px)": { gridColumn: "span 6" } } } as const;

export const fieldSpan = styleVariants({
  full: { gridColumn: "span 6" },
  half: { gridColumn: "span 3", ...stackAtNarrow },
  third: { gridColumn: "span 2", ...stackAtNarrow },
});

/** label → control → help/error as one vertical unit. */
export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: space.x1,
  minInlineSize: 0,
});

/** Controls fill their field and never size themselves from their intrinsic content. */
export const fieldControl = style({
  inlineSize: "100%",
  minInlineSize: 0,
  boxSizing: "border-box",
  minBlockSize: 38,
  paddingBlock: space.control,
  paddingInline: space.x3,
});

export const fieldHelp = style({
  margin: 0,
  // The muted token the application already uses for secondary text throughout.
  color: "var(--text-muted)",
});
globalStyle(`${dialogHeader} > h2`, { ...text.objectTitle, margin: 0 });
globalStyle(`${dialogHeader} > p`, { ...text.compactBody, margin: 0, color: "var(--text-muted)" });

/** A semantic common region — a real Palmer grouping, used only where the group is real. */
export const fieldGroup = style({
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: space.field,
  minInlineSize: 0,
  margin: 0,
  padding: space.field,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
});

/** A row of compact related controls that legitimately share one line. */
export const controlRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: space.control,
  minInlineSize: 0,
});

/* ── Local scroll ownership ──────────────────────────────────────────────────────────────── */

/**
 * A region that owns its own horizontal overflow so the page does not. Used by every wide table
 * that cannot reflow without losing meaning.
 */
export const scrollRegion = style({
  overflowX: "auto",
  maxInlineSize: "100%",
  minInlineSize: 0,
});

/* ── Split workspaces ────────────────────────────────────────────────────────────────────── */

/**
 * Master/detail and canvas/inspector geometry. Consumers set `--lw-split-columns`; the flexible
 * track is always `minmax(0, 1fr)` so the bounded rail can never squeeze it into overflow. Below
 * 900px of container width the workspace stacks, which preserves DOM order and therefore reading
 * and focus order.
 */
export const splitWorkspace = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: space.group,
  alignItems: "start",
  minInlineSize: 0,
  "@container": {
    "(min-width: 900px)": {
      gridTemplateColumns: "var(--lw-split-columns, minmax(0, 1fr) minmax(260px, 320px))",
    },
  },
});
