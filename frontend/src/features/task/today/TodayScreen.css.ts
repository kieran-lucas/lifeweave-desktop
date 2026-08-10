import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { focusRing, focusRingInset } from "../../../design-system/primitives/utilities.css";
import { paintSheetStrong } from "../../../design-system/visual/atmosphere.css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { text } from "../../../design-system/visual/typography.css";

export const workspacePanel = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
export const eyebrow = style({ ...text.eyebrow, color: "var(--accent)", margin: 0 });
export const title = style({ ...text.display, color: "var(--text-primary)" });
export const create = button.primary;
export const timeline = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
export const period = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });

/** One opaque painted sheet per period: grain + ink separators, no transparent card stack. */
export const group_ = style([
  paintSheetStrong,
  {
    borderRadius: "var(--radius-surface)",
    overflow: "hidden",
    minInlineSize: 0,
    borderColor: "var(--paint-edge)",
    boxShadow: "var(--glow-crystal-strong)",
  },
]);

export const periodHeading = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, margin: 0, minInlineSize: 0, paddingInline: 2 });
export const periodLabel = style({ display: "inline-flex", alignItems: "center", gap: space.x1, minInlineSize: 0, ...text.cardTitle, textTransform: "uppercase", letterSpacing: "0.065em", color: "var(--text-primary)" });
export const periodIcon = style({ inlineSize: 20, blockSize: 20, flexShrink: 0, color: "var(--accent)" });
export const periodRange = style({ ...text.cardTitle, fontWeight: 400, letterSpacing: "-0.002em", color: "var(--text-muted)", textTransform: "none" });
export const empty = style({ color: "var(--text-muted)", margin: 0 });

export const group = style({
  display: "grid",
  gridTemplateColumns: "minmax(92px,116px) minmax(0,1fr)",
  gap: space.field,
  paddingBlock: space.x3,
  paddingInline: space.x4,
  minInlineSize: 0,
  selectors: { "&:not(:last-child)": { borderBottom: "1px solid var(--paint-edge)" } },
});
export const time = style({ fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" });

export const row = style([
  focusRing,
  {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: space.x3,
    alignItems: "start",
    padding: "9px 10px",
    cursor: "pointer",
    minInlineSize: 0,
    borderRadius: "var(--radius-control)",
    border: "1px solid transparent",
    backgroundColor: "transparent",
    transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover": {
        backgroundColor: "var(--surface-hover)",
        backgroundImage: "var(--paint-grain-fine)",
        borderColor: "var(--paint-edge)",
        boxShadow: "var(--glow-compact)",
        transform: "translateY(-1px)",
      },
    },
    "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
  },
]);

export const rowContent = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: space.control, minInlineSize: 0 });
globalStyle(`${rowContent} > strong`, { ...text.row, fontWeight: 650, color: "var(--text-primary)" });
export const rowDescription = style({ margin: 0, color: "var(--text-muted)" });
export const rowMeta = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minInlineSize: 0 });
export const rowChip = style([button.ghost, compact, { maxInlineSize: "20rem", minBlockSize: 0, textAlign: "left", justifyContent: "flex-start", alignItems: "flex-start", overflowWrap: "anywhere", whiteSpace: "normal", color: "var(--accent)", borderColor: "var(--paint-edge)", backgroundColor: "var(--paint-board)", backgroundImage: "var(--paint-grain-fine)" }]);
export const priorityDot = style({ display: "inline-block", inlineSize: 6, blockSize: 6, borderRadius: "var(--radius-full)", background: "var(--accent-violet)", boxShadow: "var(--glow-dot)", flexShrink: 0 });
export const rowActions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: space.control, minInlineSize: 0 });
export const rowEditButton = style([button.ghost, compact]);
export const selected = style({
  backgroundColor: "var(--paint-selected)",
  backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)",
  borderColor: "var(--paint-edge-strong)",
  boxShadow: "inset 3px 0 0 var(--accent), var(--glow-selected)",
});
export const assessment = style({ color: "var(--text-muted)", textAlign: "center" });
export const category = style({ ...text.metadata, color: "var(--text-muted)" });

export const wheel = style({ display: "flex", alignItems: "center", gap: space.x1, minInlineSize: 0, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", backgroundColor: "var(--paint-sheet-strong)", backgroundImage: "var(--paint-grain-fine)", boxShadow: "var(--glow-compact)", overflow: "hidden" });
export const wheelPart = style({ display: "flex", flex: 1, minInlineSize: 0 });
export const wheelSelect = focusRingInset;
globalStyle(`${wheel} select`, { border: 0, borderRadius: 0, background: "transparent", minBlockSize: 38 });
export const legend = style({ padding: `0 ${space.x1}`, fontWeight: 700 });
export const subGroup = style({ display: "flex", flexDirection: "column", gap: space.control, margin: 0, padding: space.x3, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", backgroundColor: "var(--paint-board)", backgroundImage: "var(--paint-grain-fine)", minInlineSize: 0 });
export const checkLabel = style({ display: "inline-flex", alignItems: "center", gap: space.x1, minInlineSize: 0 });
export const scopeList = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
export const previewList = style({ display: "flex", flexDirection: "column", gap: space.x1, margin: 0, paddingInlineStart: space.x5, color: "var(--text-muted)" });
export const textarea = style({ minBlockSize: "5.5rem", resize: "vertical" });
export const dateControl = style({ minInlineSize: 0, maxInlineSize: "12rem", boxSizing: "border-box" });
export const numberControl = style({ minInlineSize: 0, maxInlineSize: "8rem", boxSizing: "border-box" });
export const undo = style({ ...text.metadata, display: "flex", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", gap: space.x1, margin: 0, padding: `${space.x1} ${space.x2}`, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", backgroundColor: "var(--paint-sheet)", backgroundImage: "var(--paint-grain-fine)", color: "var(--text-muted)", boxShadow: "var(--glow-compact)" });
export const undoButton = button.ghost;
export const seriesTagsNote = style({ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" });
export const dialogError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid color-mix(in srgb, var(--danger) 32%, var(--paint-edge))", borderRadius: "var(--radius-control)", backgroundColor: "color-mix(in srgb, var(--danger) 6%, var(--paint-sheet-strong))", backgroundImage: "var(--paint-grain-fine)", color: "var(--danger)" });
export const dialogDelete = button.destructive;
export const dialogCancel = button.secondary;
export const dialogSave = button.primary;

export const timerStrip = style({ display: "flex", flexWrap: "wrap", gap: space.control, alignItems: "center", padding: `${space.x2} ${space.x3}`, border: "1px solid var(--paint-edge-strong)", borderRadius: "var(--radius-control)", backgroundColor: "var(--paint-board)", backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)", boxShadow: "var(--glow-compact)" });
export const timerRunning = style({ ...text.eyebrow, color: "var(--accent)", border: "1px solid var(--paint-edge-strong)", borderRadius: "var(--radius-small)", padding: "2px 6px", backgroundColor: "var(--paint-sheet)" });
export const timerTitle = style({ ...text.bodyStrong });
export const timerDate = style({ ...text.metadata, color: "var(--text-muted)" });
export const timerCounter = style({ fontVariantNumeric: "tabular-nums lining-nums", fontSize: 18, lineHeight: "24px", fontWeight: 650, marginInlineStart: "auto", color: "var(--accent)" });
export const timerTotal = style({ ...text.numeric, color: "var(--text-muted)" });
export const timerStop = button.primary;
export const timerDiscard = button.destructive;
export const timerError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid color-mix(in srgb, var(--danger) 32%, var(--paint-edge))", borderRadius: "var(--radius-control)", backgroundColor: "color-mix(in srgb, var(--danger) 6%, var(--paint-sheet-strong))", backgroundImage: "var(--paint-grain-fine)", color: "var(--danger)" });
export const rowTimer = style({ display: "inline-flex", gap: space.x1, alignItems: "center" });
export const rowTimerTotal = style({ ...text.numeric, color: "var(--text-muted)" });
export const rowTimerButton = style([button.secondary, compact]);
export { srOnly } from "../../../design-system/primitives/utilities.css";
export const timelineColumn = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
