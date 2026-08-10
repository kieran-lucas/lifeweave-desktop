import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { focusRing, focusRingInset } from "../../../design-system/primitives/utilities.css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { text } from "../../../design-system/visual/typography.css";

const dawnDrift = keyframes({
  "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
  "50%": { transform: "translate3d(-20px, 12px, 0) scale(1.04)" },
});

const rayBreath = keyframes({
  "0%, 100%": { opacity: 0.34, transform: "translate3d(0, 0, 0) rotate(-7deg)" },
  "50%": { opacity: 0.58, transform: "translate3d(12px, -5px, 0) rotate(-5deg)" },
});

export const workspacePanel = style({
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: space.x5,
  minInlineSize: 0,
  padding: "clamp(20px, 2.5vw, 34px)",
  border: "1px solid rgba(183, 202, 233, 0.72)",
  borderRadius: "28px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,.91), rgba(246,250,255,.74)), radial-gradient(circle at 82% 10%, rgba(95,139,255,.20), transparent 34%), radial-gradient(circle at 12% 96%, rgba(160,124,255,.11), transparent 30%)",
  backdropFilter: "blur(18px) saturate(1.08)",
  boxShadow: "var(--glow-hero), inset 0 1px 0 rgba(255,255,255,.92)",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      zIndex: 0,
      inlineSize: "520px",
      blockSize: "520px",
      insetInlineEnd: "-150px",
      insetBlockStart: "-260px",
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(255,255,255,.98) 0 4%, rgba(119,167,255,.22) 24%, rgba(126,111,255,.12) 48%, transparent 70%)",
      filter: "blur(3px)",
      animation: `${dawnDrift} 13s ease-in-out infinite`,
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      zIndex: 0,
      inlineSize: "54%",
      blockSize: "135%",
      insetInlineEnd: "3%",
      insetBlockStart: "-20%",
      background:
        "linear-gradient(105deg, transparent 15%, rgba(255,255,255,.08) 28%, rgba(191,221,255,.42) 42%, rgba(255,255,255,.12) 53%, transparent 67%)",
      filter: "blur(7px)",
      transformOrigin: "center",
      animation: `${rayBreath} 9s ease-in-out infinite`,
      pointerEvents: "none",
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      selectors: {
        "&::before": { animation: "none" },
        "&::after": { animation: "none" },
      },
    },
    "(forced-colors: active)": {
      background: "Canvas",
      borderColor: "CanvasText",
      boxShadow: "none",
      selectors: { "&::before": { display: "none" }, "&::after": { display: "none" } },
    },
  },
});
globalStyle(`${workspacePanel} > *`, { position: "relative", zIndex: 1 });

export const eyebrow = style({ ...text.metadata, color: "var(--accent-muted)", margin: 0, letterSpacing: "0.045em", textTransform: "uppercase", fontWeight: 700 });
export const title = style({ ...text.display, color: "var(--text-primary)", letterSpacing: "-0.045em", textShadow: "0 1px 0 rgba(255,255,255,.85)" });
export const create = style([button.primary, { boxShadow: "var(--glow-primary)" }]);
export const timeline = style({ display: "flex", flexDirection: "column", gap: space.x6, minInlineSize: 0 });
export const period = style({ display: "flex", flexDirection: "column", gap: space.x2, minInlineSize: 0 });

export const group_ = style({
  minInlineSize: 0,
  overflow: "hidden",
  border: "1px solid rgba(190, 205, 229, 0.74)",
  borderRadius: "17px",
  background: "rgba(255, 255, 255, 0.70)",
  backdropFilter: "blur(14px)",
  boxShadow: "var(--glow-crystal)",
});

export const periodHeading = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: space.control,
  margin: 0,
  minInlineSize: 0,
  paddingInline: 3,
});
export const periodLabel = style({ display: "inline-flex", alignItems: "center", gap: 8, minInlineSize: 0, ...text.cardTitle, color: "var(--text-primary)", letterSpacing: "-0.012em" });
export const periodIcon = style({ inlineSize: 17, blockSize: 17, flexShrink: 0, color: "var(--accent)" });
export const periodRange = style({ ...text.metadata, fontWeight: 500, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" });
export const empty = style({ color: "var(--text-muted)", margin: 0 });

export const group = style({
  display: "grid",
  gridTemplateColumns: "minmax(84px, 104px) minmax(0,1fr)",
  gap: space.field,
  paddingBlock: space.x2,
  paddingInline: space.x2,
  minInlineSize: 0,
  selectors: { "&:not(:last-child)": { borderBottom: "1px solid rgba(206, 219, 238, 0.72)" } },
  "@container": { "(max-width: 620px)": { gridTemplateColumns: "minmax(0,1fr)", gap: 2 } },
});
export const time = style({ ...text.metadata, paddingBlock: 10, paddingInlineStart: 5, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" });

export const row = style([
  focusRing,
  {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: space.x2,
    alignItems: "center",
    padding: "10px 11px",
    cursor: "pointer",
    minInlineSize: 0,
    borderRadius: "12px",
    border: "1px solid transparent",
    background: "rgba(255,255,255,.54)",
    boxShadow: "none",
    transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
    selectors: {
      "&:hover": {
        background: "linear-gradient(100deg, rgba(246,249,255,.96), rgba(233,241,255,.84))",
        borderColor: "rgba(135, 160, 226, 0.35)",
        boxShadow: "var(--glow-hover)",
        transform: "translateY(-1px)",
      },
    },
    "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
  },
]);

export const rowContent = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, minInlineSize: 0 });
globalStyle(`${rowContent} > strong`, { ...text.row, fontWeight: 680, color: "var(--text-primary)", letterSpacing: "-0.012em" });
export const rowDescription = style({ display: "none" });
export const rowMeta = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, minInlineSize: 0, color: "var(--text-muted)" });
export const rowChip = style([button.ghost, compact, { maxInlineSize: "20rem", minBlockSize: 0, padding: 0, border: 0, textAlign: "left", justifyContent: "flex-start", overflowWrap: "anywhere", whiteSpace: "normal", color: "var(--accent-muted)", background: "transparent" }]);
export const priorityDot = style({ display: "inline-block", inlineSize: 6, blockSize: 6, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, var(--accent), var(--accent-violet))", boxShadow: "var(--glow-dot)", flexShrink: 0 });
export const rowActions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 5, minInlineSize: 0, opacity: 0.4, transition: `opacity ${duration.state} ${easing.standard}` });
globalStyle(`${row}:hover ${rowActions}`, { opacity: 1 });
globalStyle(`${row}:focus-within ${rowActions}`, { opacity: 1 });
export const rowEditButton = style([button.ghost, compact]);
export const selected = style({
  background: "linear-gradient(105deg, rgba(232,239,255,.98), rgba(245,242,255,.93))",
  borderColor: "rgba(78, 111, 255, 0.52)",
  boxShadow: "var(--glow-selected)",
});
export const assessment = style({ color: "var(--text-muted)", textAlign: "center" });
export const category = style({ ...text.metadata, color: "var(--text-muted)" });

export const wheel = style({ display: "flex", alignItems: "center", gap: space.x1, minInlineSize: 0, border: "1px solid var(--glass-border)", borderRadius: "var(--radius-control)", backgroundColor: "var(--glass-surface-strong)", boxShadow: "var(--glow-compact)", overflow: "hidden" });
export const wheelPart = style({ display: "flex", flex: 1, minInlineSize: 0 });
export const wheelSelect = focusRingInset;
globalStyle(`${wheel} select`, { border: 0, borderRadius: 0, background: "transparent", minBlockSize: 38 });
export const legend = style({ padding: `0 ${space.x1}`, fontWeight: 700 });
export const subGroup = style({ display: "flex", flexDirection: "column", gap: space.control, margin: 0, padding: space.x3, border: "1px solid var(--glass-border)", borderRadius: "var(--radius-control)", backgroundColor: "var(--glass-surface)", backdropFilter: "blur(var(--glass-blur))", minInlineSize: 0 });
export const checkLabel = style({ display: "inline-flex", alignItems: "center", gap: space.x1, minInlineSize: 0 });
export const scopeList = style({ display: "flex", flexDirection: "column", gap: space.control, minInlineSize: 0 });
export const previewList = style({ display: "flex", flexDirection: "column", gap: space.x1, margin: 0, paddingInlineStart: space.x5, color: "var(--text-muted)" });
export const textarea = style({ minBlockSize: "5.5rem", resize: "vertical" });
export const dateControl = style({ minInlineSize: 0, maxInlineSize: "12rem", boxSizing: "border-box" });
export const numberControl = style({ minInlineSize: 0, maxInlineSize: "8rem", boxSizing: "border-box" });
export const undo = style({ ...text.metadata, display: "flex", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", gap: space.x1, margin: 0, padding: `${space.x1} ${space.x2}`, border: "1px solid var(--glass-border)", borderRadius: "var(--radius-control)", background: "var(--glass-surface)", backdropFilter: "blur(12px)", color: "var(--text-muted)", boxShadow: "var(--glow-compact)" });
export const undoButton = button.ghost;
export const seriesTagsNote = style({ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" });
export const dialogError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid rgba(217,78,114,.42)", borderRadius: "var(--radius-control)", backgroundColor: "rgba(255,240,244,.92)", color: "var(--danger)", boxShadow: "var(--glow-danger)" });
export const dialogDelete = button.destructive;
export const dialogCancel = button.secondary;
export const dialogSave = button.primary;

export const timerStrip = style({ display: "flex", flexWrap: "wrap", gap: space.control, alignItems: "center", padding: `${space.x2} ${space.x3}`, border: "1px solid rgba(78,111,255,.34)", borderRadius: "14px", background: "linear-gradient(100deg, rgba(239,244,255,.93), rgba(247,245,255,.88))", backdropFilter: "blur(14px)", boxShadow: "var(--glow-selected)" });
export const timerRunning = style({ ...text.eyebrow, color: "#FFFFFF", borderRadius: "var(--radius-small)", padding: "3px 7px", background: "linear-gradient(135deg, var(--accent), var(--accent-violet))", boxShadow: "var(--glow-primary)" });
export const timerTitle = style({ ...text.bodyStrong });
export const timerDate = style({ ...text.metadata, color: "var(--text-muted)" });
export const timerCounter = style({ fontVariantNumeric: "tabular-nums lining-nums", fontSize: 18, lineHeight: "24px", fontWeight: 680, marginInlineStart: "auto", color: "var(--accent-muted)" });
export const timerTotal = style({ ...text.numeric, color: "var(--text-muted)" });
export const timerStop = button.primary;
export const timerDiscard = button.destructive;
export const timerError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid rgba(217,78,114,.42)", borderRadius: "var(--radius-control)", backgroundColor: "rgba(255,240,244,.92)", color: "var(--danger)" });
export const rowTimer = style({ display: "inline-flex", gap: space.x1, alignItems: "center" });
export const rowTimerTotal = style({ ...text.numeric, color: "var(--text-muted)" });
export const rowTimerButton = style([button.secondary, compact]);
export { srOnly } from "../../../design-system/primitives/utilities.css";
export const timelineColumn = style({ display: "flex", flexDirection: "column", gap: space.section, minInlineSize: 0 });
