import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "../../design-system/visual/contract.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { family, text } from "../../design-system/visual/typography.css";

/*
 * Task 51 prototype composition.
 *
 * Geometry is measured from `docs/visual/task-51/lifeweave-visual-baseline-v1.png` rather than
 * guessed. In the reference the application content box is 1570 × 976 and splits:
 *
 *     sidebar    x    8 →  275     268 px    17.07%
 *     workspace  x  277 → 1092     816 px    51.97%
 *     inspector  x 1095 → 1577     483 px    30.76%
 *
 * Scaled to the real maximized inner viewport of 1536, that is 262 / 799 / 473. The values below
 * are 260 / 1fr / 464, which reproduces the reference's workspace width almost exactly — 812
 * against 816 — and keeps the sidebar and inspector inside the ranges the activation prompt gave.
 *
 * NOTHING HERE TOUCHES A PRODUCTION SURFACE. This file is imported only by the prototype entry.
 */

/* ── Shell ───────────────────────────────────────────────────────────────────────────────── */

export const shell = style({
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr) 464px",
  blockSize: "100%",
  inlineSize: "100%",
  overflow: "hidden",
  background: vars.color.canvas,
  color: vars.color.textPrimary,
  fontFamily: family.ui,
  // Degradation preserves the visual DNA rather than the column count (spec §4). The inspector
  // narrows first, then leaves the flow entirely; the task area is never the thing that shrinks.
  "@media": {
    "(max-width: 1360px)": { gridTemplateColumns: "236px minmax(0, 1fr) 404px" },
    "(max-width: 1180px)": { gridTemplateColumns: "68px minmax(0, 1fr) 380px" },
    "(max-width: 940px)": { gridTemplateColumns: "68px minmax(0, 1fr)" },
  },
});

/**
 * No selection, no inspector column.
 *
 * The first capture pass reserved the inspector's 464 px even when nothing was selected, so the
 * empty and populated states rendered a dead band of canvas down the right third of the window —
 * and, because the ambient layer lives inside the workspace, the art stopped dead at an invisible
 * edge two thirds across. Reserving space for an absent panel is exactly the kind of defect that
 * only appears when the whole screen is composed at once, which is why the lock happens here rather
 * than after production restyling.
 */
export const shellNoInspector = style({
  gridTemplateColumns: "260px minmax(0, 1fr)",
  "@media": {
    "(max-width: 1360px)": { gridTemplateColumns: "236px minmax(0, 1fr)" },
    "(max-width: 1180px)": { gridTemplateColumns: "68px minmax(0, 1fr)" },
  },
});

/* ── Sidebar ─────────────────────────────────────────────────────────────────────────────── */

export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  minInlineSize: 0,
  paddingBlock: 18,
  paddingInline: 14,
  background: vars.color.surface,
  // A hairline, not a shadow and not a gap. This is the entire separation between two planes.
  borderInlineEnd: vars.hairline.structural,
});

export const brand = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minBlockSize: 34,
  paddingInline: 10,
  marginBlockEnd: 18,
});

export const brandMark = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 24,
  blockSize: 24,
  borderRadius: vars.radius.full,
  background: vars.color.accent,
  color: vars.color.textOnAccent,
  flexShrink: 0,
});

export const brandName = style({ ...text.control, fontWeight: 600, letterSpacing: "-0.01em" });

export const navGroup = style({ display: "flex", flexDirection: "column", gap: 2 });

/**
 * 45 px measured in the reference; 44 here. A *fill*, never an outline — the pill has no border and
 * no shadow, so a selected destination adds tone rather than an enclosure level.
 */
export const navItem = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minBlockSize: 44,
  inlineSize: "100%",
  paddingInline: 10,
  border: 0,
  borderRadius: vars.radius.control,
  background: "transparent",
  color: vars.color.textSecondary,
  textAlign: "left",
  cursor: "pointer",
  ...text.control,
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover },
    // Navigation selection uses its own darker tint. The reference separates it from task
    // selection deliberately, so the two never read as the same kind of state.
    "&[aria-current=page]": {
      background: vars.color.surfaceSelectedNav,
      color: vars.color.textPrimary,
      fontWeight: 600,
    },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
});

export const navIcon = style({
  flexShrink: 0,
  color: vars.color.textTertiary,
  selectors: { [`${navItem}[aria-current=page] &`]: { color: vars.color.accent } },
});

export const navLabel = style({ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" });

export const sidebarDivider = style({
  blockSize: 1,
  marginBlock: 12,
  marginInline: 10,
  background: vars.color.borderHairline,
});

export const sidebarFooter = style({
  marginBlockStart: "auto",
  paddingBlockStart: 12,
  borderBlockStart: vars.hairline.structural,
  display: "flex",
  alignItems: "center",
  gap: 8,
});

/* ── Workspace ───────────────────────────────────────────────────────────────────────────── */

export const workspace = style({
  position: "relative",
  minInlineSize: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: vars.color.canvas,
});

/*
 * Measured: the reference's content column starts 35 px into the workspace and its rows end 82 px
 * before the divider. That right margin is not waste — it is where the ambient field and the
 * overflow control live, and it is what stops the timeline running into the inspector hairline.
 */
/**
 * Scroll containers style their own scrollbar.
 *
 * The first capture pass showed why this is not cosmetic: the default WebView2 scrollbar is a light
 * grey column, and on the dark theme it rendered as a bright vertical bar down the middle of the
 * composition — the single most visually wrong thing in the frame. `scrollbar-color` is supported
 * in WebView2 151 and degrades to the platform default if it ever is not.
 *
 * `stable` gutter is kept from Task 50: it is what stops the content shifting when the scrollbar
 * appears.
 */
const scroller = {
  scrollbarWidth: "thin",
  scrollbarColor: `${vars.color.borderHairline} transparent`,
  scrollbarGutter: "stable",
} as const;

export const workspaceScroll = style({
  flex: 1,
  minBlockSize: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "26px 84px 24px 36px",
  ...scroller,
});

export const pageHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 24,
  marginBlockEnd: 26,
});

export const pageTitle = style({ ...text.pageTitle, margin: 0, color: vars.color.textPrimary });
export const pageDate = style({ ...text.pageDate, margin: "6px 0 0", color: vars.color.accent });
export const pageSummary = style({ ...text.pageSummary, margin: "6px 0 0", color: vars.color.textTertiary });

export const dateNav = style({ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 });

/** Low-chrome controls: a hairline and a radius, no fill, no shadow. */
export const quietButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minBlockSize: 32,
  paddingInline: 10,
  border: vars.hairline.structural,
  borderRadius: vars.radius.control,
  background: vars.color.surfaceRaised,
  color: vars.color.textSecondary,
  cursor: "pointer",
  ...text.control,
  transition: `background-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
});

/** An icon-only control with no border at all — the quietest affordance in the system. */
export const bareButton = style({
  display: "inline-grid",
  placeItems: "center",
  inlineSize: 30,
  blockSize: 30,
  padding: 0,
  border: 0,
  borderRadius: vars.radius.control,
  background: "transparent",
  color: vars.color.textTertiary,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover, color: vars.color.textSecondary },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
});

/* ── Timeline ────────────────────────────────────────────────────────────────────────────── */

export const period = style({ marginBlockEnd: 26 });

export const periodHeading = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "0 0 6px",
  paddingInline: 8,
});

export const periodIcon = style({ color: vars.color.warning, flexShrink: 0 });
export const periodName = style({ ...text.sectionHeading, color: vars.color.textPrimary });
export const periodRange = style({ ...text.sectionMeta, color: vars.color.textTertiary });

export const periodCount = style({
  ...text.micro,
  display: "inline-grid",
  placeItems: "center",
  minInlineSize: 20,
  blockSize: 18,
  paddingInline: 6,
  borderRadius: vars.radius.full,
  background: vars.color.surfaceSubtle,
  color: vars.color.textTertiary,
});

/**
 * The rows list. Measured against the reference: there is **no container**. The workspace canvas
 * and the area behind the rows are the same colour, so what looks like a panel is only the rows'
 * shared left edge and their hairline separators. Adding a box here would be the single easiest
 * way to lose the composition.
 */
export const rows = style({ display: "flex", flexDirection: "column" });

export const row = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  minBlockSize: 40,
  paddingBlock: 8,
  paddingInline: 8,
  borderRadius: vars.radius.control,
  border: 0,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  color: vars.color.textPrimary,
  transition: `background-color ${duration.state} ${easing.standard}`,
  selectors: {
    // The separator is on the row, not on a wrapper, so a selected row's fill covers it cleanly.
    "&:not(:last-child)": { boxShadow: `inset 0 -1px 0 ${vars.color.borderHairline}` },
    "&:hover": { background: vars.color.surfaceHover },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: -2 },
  },
});

/**
 * Selection. The pale fill is exactly the reference's `#EFEFF4`, and measurement showed it sits at
 * 1.10:1 against the canvas — far below the 3:1 WCAG 2.2 SC 1.4.11 asks of a state indicator.
 *
 * So selection is carried by two signals: the fill, plus a 2 px accent edge that measures 3.15:1.
 * The fill alone would be decorative; the edge alone would be thin. Together they are legible
 * without the aggression ADR 0045 forbids — no strong border, no saturated fill, no shadow.
 */
export const rowSelected = style({
  background: vars.color.surfaceSelected,
  selectors: {
    "&:hover": { background: vars.color.surfaceSelected },
    "&::before": {
      content: '""',
      position: "absolute",
      insetBlock: 4,
      insetInlineStart: 0,
      inlineSize: 2,
      borderRadius: vars.radius.full,
      background: vars.color.selectionEdge,
    },
    "&:not(:last-child)": { boxShadow: "none" },
  },
});

export const check = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 20,
  blockSize: 20,
  flexShrink: 0,
  border: 0,
  padding: 0,
  background: "transparent",
  cursor: "pointer",
  transition: `color ${duration.check} ${easing.standard}`,
});

/**
 * Lifeweave evaluates a task into a *state*, not a boolean, so the check has four appearances
 * rather than two. Colour is never the only carrier: each state also differs in fill and glyph, and
 * each control carries its state in its accessible name.
 */
export const checkState = styleVariants({
  none: [check, { color: vars.color.textTertiary }],
  completed: [check, { color: vars.color.accent }],
  partial: [check, { color: vars.color.textSecondary }],
  missed: [check, { color: vars.color.danger }],
});

export const rowMain = style({ minInlineSize: 0, display: "flex", flexDirection: "column", gap: 3 });

export const rowTitleLine = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minInlineSize: 0,
});

export const rowTitle = style({
  ...text.row,
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

/** Completed work stays readable. Strikethrough plus a tone step, never a fade into illegibility. */
export const rowTitleDone = style({ color: vars.color.textSecondary, textDecoration: "line-through" });

export const rowMeta = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  minInlineSize: 0,
  ...text.meta,
  color: vars.color.textTertiary,
});

/**
 * A metadata chip is a tinted label, not an outlined box. The current product draws a 1 px border
 * around each of these, which puts boxes inside a row inside a page — the exact shape the
 * continuous-surface law exists to remove.
 */
export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  maxInlineSize: "22rem",
  paddingInline: 7,
  paddingBlock: 2,
  borderRadius: vars.radius.small,
  background: vars.color.surfaceSubtle,
  color: vars.color.textTertiary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  border: 0,
  ...text.meta,
});

export const chipAccent = style({ background: vars.color.accentSoft, color: vars.color.accent });
export const chipDanger = style({ background: vars.color.dangerSoft, color: vars.color.danger });

export const rowTail = style({ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 });
export const rowTime = style({ ...text.numeric, color: vars.color.textTertiary });
export const rowFlag = style({ color: vars.color.warning, flexShrink: 0 });

/** A running timer is text plus tone, never colour alone. */
export const rowTimer = style({
  ...text.meta,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  paddingInline: 7,
  paddingBlock: 2,
  borderRadius: vars.radius.small,
  background: vars.color.warningSoft,
  color: vars.color.warning,
  fontVariantNumeric: "tabular-nums",
});

export const timerDot = style({
  inlineSize: 6,
  blockSize: 6,
  borderRadius: vars.radius.full,
  background: "currentColor",
  flexShrink: 0,
});

/* ── Workspace footer ────────────────────────────────────────────────────────────────────── */

export const workspaceFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "12px 36px",
  borderBlockStart: vars.hairline.structural,
  ...text.meta,
  color: vars.color.textTertiary,
  background: vars.color.canvas,
});

export const footerFacts = style({ display: "flex", alignItems: "center", gap: 10, minInlineSize: 0 });

/* ── Empty state ─────────────────────────────────────────────────────────────────────────── */

export const empty = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minBlockSize: 340,
  textAlign: "center",
});

export const emptyTitle = style({ ...text.objectTitle, margin: 0, color: vars.color.textSecondary });
export const emptyBody = style({ ...text.body, margin: 0, color: vars.color.textTertiary, maxInlineSize: "34ch" });

/* ── Inspector ───────────────────────────────────────────────────────────────────────────── */

/**
 * The inspector is the **same plane** as the workspace. Measured: both are `#FBFAF9`, and the only
 * thing between them is a 1 px hairline. It is not a card, it has no shadow, and it has no
 * background of its own. That single measurement is the strongest evidence for the
 * continuous-surface law in the whole reference.
 */
export const inspector = style({
  display: "flex",
  flexDirection: "column",
  minInlineSize: 0,
  overflow: "hidden",
  background: vars.color.canvas,
  borderInlineStart: vars.hairline.structural,
  "@media": { "(max-width: 940px)": { display: "none" } },
});

export const inspectorHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "16px 20px 0",
});

export const inspectorContext = style({
  ...text.meta,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: vars.color.textTertiary,
  marginInlineEnd: "auto",
});

export const inspectorScroll = style({
  flex: 1,
  minBlockSize: 0,
  overflowY: "auto",
  padding: "0 20px 20px",
  ...scroller,
});

export const inspectorTitle = style({
  ...text.objectTitle,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  margin: "14px 0 0",
  color: vars.color.textPrimary,
});

/**
 * Low-chrome navigation (spec §4.4 / ADR 0045 §3). Text and icon with an underline indicator on the
 * active tab — no filled segmented control, no bordered strip, no box beneath the title box. The
 * only line is the hairline the whole row sits on.
 */
export const tabs = style({
  display: "flex",
  alignItems: "center",
  gap: 18,
  margin: "16px 0 0",
  borderBlockEnd: vars.hairline.structural,
});

export const tab = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0 0 9px",
  minBlockSize: 32,
  border: 0,
  borderBlockEnd: "2px solid transparent",
  marginBlockEnd: -1,
  background: "transparent",
  color: vars.color.textTertiary,
  cursor: "pointer",
  ...text.control,
  transition: `color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { color: vars.color.textSecondary },
    "&[aria-selected=true]": { color: vars.color.accent, borderBlockEndColor: vars.color.accent },
    "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 },
  },
});

export const tabCount = style({ ...text.meta, color: vars.color.textTertiary });

export const note = style({ ...text.body, color: vars.color.textSecondary, margin: "18px 0 0" });

export const noteList = style({
  ...text.body,
  color: vars.color.textSecondary,
  margin: "12px 0 0",
  paddingInlineStart: 20,
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

/**
 * Metadata reads as editorial information, not a form dashboard: a label column, a value column,
 * no field boxes, no input chrome, no inner background.
 */
export const metaGrid = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  columnGap: 20,
  rowGap: 10,
  margin: "22px 0 0",
  alignItems: "center",
});

export const metaLabel = style({
  ...text.meta,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: vars.color.textTertiary,
});

export const metaValue = style({ ...text.meta, color: vars.color.textPrimary, minInlineSize: 0 });

export const metaDot = style({
  display: "inline-block",
  inlineSize: 7,
  blockSize: 7,
  borderRadius: vars.radius.full,
  marginInlineEnd: 7,
  verticalAlign: "middle",
});

/* ── Life System preview ─────────────────────────────────────────────────────────────────── */

/**
 * The one deliberate enclosure in the whole composition, and the reason it earns its border: the
 * preview is a *different kind of thing* from the metadata above it — a spatial diagram rather than
 * a list of facts — and Palmer's common-region grouping is exactly what communicates that.
 *
 * Measured from the reference, it has a hairline and a radius and **no fill**: its interior is the
 * same `#FBFAF9` as everything else.
 */
export const lifePreview = style({
  margin: "24px 0 0",
  border: vars.hairline.structural,
  borderRadius: vars.radius.surface,
  background: "transparent",
  padding: 14,
});

export const lifePreviewHead = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBlockEnd: 10,
  ...text.meta,
  color: vars.color.textSecondary,
});

export const lifePreviewOpen = style({
  marginInlineStart: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: 0,
  background: "transparent",
  color: vars.color.accent,
  cursor: "pointer",
  ...text.meta,
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 } },
});

export const lifeCanvas = style({ position: "relative", blockSize: 250, minInlineSize: 0 });

export const lifeNode = style({
  position: "absolute",
  transform: "translate(-50%, -50%)",
  maxInlineSize: 116,
  padding: "7px 9px",
  borderRadius: vars.radius.control,
  ...text.meta,
  color: vars.color.textSecondary,
  textAlign: "center",
  lineHeight: "15px",
});

export const lifeNodeTone = styleVariants({
  cream: [lifeNode, { background: vars.color.lifeCream }],
  mint: [lifeNode, { background: vars.color.lifeMint }],
  blue: [lifeNode, { background: vars.color.lifeBlue }],
  lavender: [lifeNode, { background: vars.color.lifeLavender }],
  peach: [lifeNode, { background: vars.color.lifePeach }],
});

/**
 * Node placement lives here rather than in a `style` prop.
 *
 * `scripts/verify_security.py` forbids React inline-style props across the frontend, listing them
 * beside raw-HTML injection and dynamic code evaluation, because the Tauri CSP is
 * `style-src 'self'` with no `unsafe-inline`. The whole application honours that — there is not one
 * inline style prop in `frontend/src` — and the prototype is not an exception to a security rule.
 *
 * The preview is a fixed six-node diagram, so its geometry is static and belongs in CSS anyway.
 */
export const lifeNodeAt = styleVariants({
  creative: [{ left: "50%", top: "8%" }],
  learning: [{ left: "10%", top: "40%" }],
  impact: [{ left: "90%", top: "40%" }],
  focus: [{ left: "50%", top: "46%" }],
  health: [{ left: "26%", top: "82%" }],
  relationships: [{ left: "74%", top: "82%" }],
});

export const lifeFocusNode = style({ color: vars.color.textPrimary, fontWeight: 600 });

export const lifeEdges = style({
  position: "absolute",
  inset: 0,
  inlineSize: "100%",
  blockSize: "100%",
  pointerEvents: "none",
});

globalStyle(`${lifeEdges} path`, {
  fill: "none",
  stroke: vars.color.borderHairline,
  strokeWidth: 1,
  strokeDasharray: "3 4",
});

/* ── Ambient art ─────────────────────────────────────────────────────────────────────────── */

/**
 * Light blue, per Product Owner direction, and confined to this layer.
 *
 * `pointer-events: none` and `aria-hidden` are load-bearing: art must never intercept a click or
 * reach a screen reader. There is no animation here at all — Today requires none (spec §10), and on
 * the measured target machine (two cores, integrated GPU) a continuously animated field would be
 * real work spent on something the user is meant to notice only peripherally.
 */
export const ambient = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
  zIndex: 0,
});

export const ambientLayer = style({ position: "absolute", inset: 0, inlineSize: "100%", blockSize: "100%" });

/**
 * The light-blue glow field, as a static rule rather than a `style` prop — same CSP reason as
 * `lifeNodeAt` above.
 *
 * Three radial gradients whose centres sit outside or at the edge of the content column. The first
 * capture pass had them nearer the middle and the field washed across the task titles; pulling them
 * out and shortening each fade keeps the reading area clean canvas while the atmosphere stays
 * present at the margins.
 */
export const ambientGlow = style({
  backgroundImage: `radial-gradient(520px 360px at 100% -14%, ${vars.color.ambientGlowPrimary}, transparent 62%),
                    radial-gradient(440px 320px at 116% 44%, ${vars.color.ambientGlowSecondary}, transparent 64%),
                    radial-gradient(400px 300px at -12% 112%, ${vars.color.ambientGlowPrimary}, transparent 66%)`,
});

/** Fills the theme wrapper, which is the prototype's root box. */
export const fill = style({ blockSize: "100%" });

/**
 * Density response (spec §10). Art occupies empty space and retreats as information arrives, so the
 * prototype dims the whole layer on a dense day rather than removing it — a hard cut would read as
 * a bug, and this is one multiply-free opacity change on a composited layer.
 */
export const ambientDensity = styleVariants({
  quiet: { opacity: 0.9 },
  normal: { opacity: 0.5 },
  dense: { opacity: 0.22 },
});

export const workspaceContent = style({ position: "relative", zIndex: 1 });

/* ── Prototype chrome (not part of the design) ───────────────────────────────────────────── */

export const harness = style({
  position: "fixed",
  insetBlockEnd: 12,
  insetInlineStart: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 4,
  padding: 5,
  borderRadius: vars.radius.floating,
  background: vars.color.surfaceRaised,
  border: vars.hairline.structural,
  boxShadow: vars.elevation.modal,
  zIndex: 50,
});

export const harnessButton = style({
  ...text.meta,
  padding: "5px 10px",
  border: 0,
  borderRadius: vars.radius.control,
  background: "transparent",
  color: vars.color.textSecondary,
  cursor: "pointer",
  selectors: {
    "&[aria-pressed=true]": { background: vars.color.surfaceSelectedNav, color: vars.color.textPrimary },
  },
});
