import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { focusRing, focusRingInset } from "../../../design-system/primitives/utilities.css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { text } from "../../../design-system/visual/typography.css";

export const workspacePanel = style({ display: "flex", flexDirection: "column", gap: space.x5, minInlineSize: 0 });
export const eyebrow = style({ ...text.metadata, color: "var(--text-muted)", margin: 0, letterSpacing: "0.01em", textTransform: "none" });
export const title = style({ ...text.display, color: "var(--text-primary)", letterSpacing: "-0.04em" });
export const create = button.primary;
export const timeline = style({ display: "flex", flexDirection: "column", gap: space.x6, minInlineSize: 0 });
export const period = style({ display: "flex", flexDirection: "column", gap: space.x2, minInlineSize: 0 });

export const group_ = style({
  minInlineSize: 0,
  borderBlock: "1px solid var(--border-subtle)",
  background: "#FFFFFF",
});

export const periodHeading = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: space.control,
  margin: 0,
  minInlineSize: 0,
  paddingInline: 2,
});
export const periodLabel = style({ display: "inline-flex", alignItems: "center", gap: space.x1, minInlineSize: 0, ...text.cardTitle, color: "var(--text-primary)", letterSpacing: "-0.01em" });
export const periodIcon = style({ inlineSize: 16, blockSize: 16, flexShrink: 0, color: "var(--text-primary)" });
export const periodRange = style({ ...text.metadata, fontWeight: 450, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
export const empty = style({ color: "var(--text-muted)", margin: 0 });

export const group = style({
  display: "grid",
  gridTemplateColumns: "minmax(84px, 104px) minmax(0,1fr)",
  gap: space.field,
  paddingBlock: space.x2,
  minInlineSize: 0,
  selectors: { "&:not(:last-child)": { borderBottom: "1px solid var(--border-subtle)" } },
  "@container": { "(max-width: 620px)": { gridTemplateColumns: "minmax(0,1fr)", gap: 2 } },
});
export const time = style({ ...text.metadata, paddingBlock: 9, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" });

export const row = style([
  focusRing,
  {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: space.x2,
    alignItems: "center",
    padding: "9px 10px",
    cursor: "pointer",
    minInlineSize: 0,
    borderRadius: "var(--radius-control)",
    border: "1px solid transparent",
    background: "#FFFFFF",
    boxShadow: "none",
    transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,
    selectors: {
      "&:hover": { backgroundColor: "#F6F6F6" },
    },
  },
]);

export const rowContent = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, minInlineSize: 0 });
globalStyle(`${rowContent} > strong`, { ...text.row, fontWeight: 650, color: "var(--text-primary)", letterSpacing: "-0.012em" });
export const rowDescription = style({ display: "none" });
export const rowMeta = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, minInlineSize: 0, color: "var(--text-muted)" });
export const rowChip = style([button.ghost, compact, { maxInlineSize: "20rem", minBlockSize: 0, padding: 0, border: 0, textAlign: "left", justifyContent: "flex-start", overflowWrap: "anywhere", whiteSpace: "normal", color: "var(--text-muted)", background: "transparent" }]);
export const priorityDot = style({ display: "inline-block", inlineSize: 5, blockSize: 5, borderRadius: "var(--radius-full)", background: "#111111", flexShrink: 0 });
export const rowActions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 5, minInlineSize: 0, opacity: 0.35, transition: `opacity ${duration.state} ${easing.standard}` });
globalStyle(`${row}:hover ${rowActions}`, { opacity: 1 });
globalStyle(`${row}:focus-within ${rowActions}`, { opacity: 1 });
export const rowEditButton = style([button.ghost, compact]);
export const selected = style({ backgroundColor: "#F3F3F3", borderColor: "#111111", boxShadow: "none" });
export const assessment = style({ color: "var(--text-muted)", textAlign: "center" });
export const category = style({ ...text.metadata, color: "var(--text-muted)" });

export const wheel = style({ display: "flex", alignItems: "center", gap: space.x1, minInlineSize: 0, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", backgroundColor: "#FFFFFF", boxShadow: "none", overflow: "hidden" });
export const wheelPart = style({ display: "flex", flex: 1, minInlineSize: 0 });
export const wheelSelect = focusRingInset;
globalStyle(`${wheel} select`, { border: 0, borderRadius: 0, background: "transparent", minBlockSize: 38 });
export const legend = style({ padding: `0 ${space.x1}`, fontWeight: 700 });
export const subGroup = style({ display: "flex", flexDirection: "column", gap: space.control, margin: 0, padding: space.x3, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", backgroundColor: "#FFFFFF", minInlineSize: 0 });
export const checkLabel = style({ display: "inline-flex", alignItems: "center", gap: space.x1, minInlineSize: 0 });
export const scopeList = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
export const previewList = style({ display: "flex", flexDirection: "column", gap: space.x1, margin: 0, paddingInlineStart: space.x5, color: "var(--text-muted)" });
export const textarea = style({ minBlockSize: "5.5rem", resize: "vertical" });
export const dateControl = style({ minInlineSize: 0, maxInlineSize: "12rem", boxSizing: "border-box" });
export const numberControl = style({ minInlineSize: 0, maxInlineSize: "8rem", boxSizing: "border-box" });
export const undo = style({ ...text.metadata, display: "flex", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", gap: space.x1, margin: 0, padding: `${space.x1} ${space.x2}`, borderBlock: "1px solid var(--border-subtle)", color: "var(--text-muted)" });
export const undoButton = button.ghost;
export const seriesTagsNote = style({ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" });
export const dialogError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid #111111", borderRadius: "var(--radius-control)", backgroundColor: "#FFFFFF", color: "#111111" });
export const dialogDelete = button.destructive;
export const dialogCancel = button.secondary;
export const dialogSave = button.primary;

export const timerStrip = style({ display: "flex", flexWrap: "wrap", gap: space.control, alignItems: "center", padding: `${space.x2} ${space.x3}`, borderBlock: "1px solid #111111", backgroundColor: "#FFFFFF", boxShadow: "none" });
export const timerRunning = style({ ...text.eyebrow, color: "#FFFFFF", borderRadius: "var(--radius-small)", padding: "2px 6px", backgroundColor: "#111111" });
export const timerTitle = style({ ...text.bodyStrong });
export const timerDate = style({ ...text.metadata, color: "var(--text-muted)" });
export const timerCounter = style({ fontVariantNumeric: "tabular-nums lining-nums", fontSize: 18, lineHeight: "24px", fontWeight: 650, marginInlineStart: "auto", color: "#111111" });
export const timerTotal = style({ ...text.numeric, color: "var(--text-muted)" });
export const timerStop = button.primary;
export const timerDiscard = button.destructive;
export const timerError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid #111111", borderRadius: "var(--radius-control)", backgroundColor: "#FFFFFF", color: "#111111" });
export const rowTimer = style({ display: "inline-flex", gap: space.x1, alignItems: "center" });
export const rowTimerTotal = style({ ...text.numeric, color: "var(--text-muted)" });
export const rowTimerButton = style([button.secondary, compact]);
export { srOnly } from "../../../design-system/primitives/utilities.css";
export const timelineColumn = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
