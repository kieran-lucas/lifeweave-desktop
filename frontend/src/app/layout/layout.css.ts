import { style, styleVariants } from "@vanilla-extract/css";

import { dialogInset, dialogWidth, frame, space } from "./tokens.css";

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

export const dialogBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: "var(--layer-overlay)",
  display: "grid",
  placeItems: "center",
  padding: space.group,
  background: "rgba(0, 0, 0, 0.55)",
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
  // Existing surface/border tokens only — this creates the common region the dialog was missing,
  // it does not introduce a new visual treatment.
  border: "1px solid var(--border-subtle)",
  borderRadius: 16,
  background: "var(--surface)",
  color: "var(--text-primary)",
  containerType: "inline-size",
  containerName: "dialog",
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
});

export const fieldHelp = style({
  margin: 0,
  // The muted token the application already uses for secondary text throughout.
  color: "var(--text-muted)",
});

/** A semantic common region — a real Palmer grouping, used only where the group is real. */
export const fieldGroup = style({
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: space.field,
  minInlineSize: 0,
  margin: 0,
  padding: space.field,
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
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
