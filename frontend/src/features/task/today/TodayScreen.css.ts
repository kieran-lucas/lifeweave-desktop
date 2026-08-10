import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, compact } from "../../../design-system/primitives/controls.css";
import { focusRing, focusRingInset } from "../../../design-system/primitives/utilities.css";
import { duration, easing } from "../../../design-system/visual/motion.css";
import { text } from "../../../design-system/visual/typography.css";

/*
 * Today owns no page width. It is a STANDARD_PAGE and consumes the shared `PageFrame`; what remains
 * here is the timeline's own domain grid (ADR 0044).
 */
export const workspacePanel=style({display:"flex",flexDirection:"column",gap:space.section,minInlineSize:0});
/** v2 sets the date line in the accent, which is the reference's one use of blue in the header. */
export const eyebrow=style({...text.bodyStrong,color:"var(--accent)",margin:0});
export const title=style({...text.display});
export const create=button.primary;
export const timeline=style({display:"flex",flexDirection:"column",gap:space.section,minInlineSize:0});
export const period=style({display:"flex",flexDirection:"column",gap:space.control,minInlineSize:0});
/**
 * The v2 row group.
 *
 * Baseline v2 puts each period's rows inside one bounded region: a 1 px hairline, a 12 px radius,
 * and an interior a shade whiter than the canvas. Measured at x 320-1033 in the reference. It is a
 * single enclosure level, not a card — no shadow, no heavy border — and it is what makes the list
 * read as one object instead of loose lines.
 */
/*
 * The row group is the product's primary glass surface.
 *
 * It uses `glassStrong` rather than `glass`: this is the densest text on the screen, and a more
 * opaque tint keeps a full day of task titles effortless to read while the atmosphere still shows
 * at its edges. The border and highlight come from the shared material, so it cannot drift from the
 * inspector, Calendar or the dialogs.
 */
export const group_=style({border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-surface)",background:"var(--surface-raised)",overflow:"hidden",minInlineSize:0});
/** Name and range are two spaced boxes; the separation is layout, never a literal space in text. */
export const periodHeading=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,margin:0,minInlineSize:0,...text.eyebrow});
export const periodLabel=style({display:"inline-flex",alignItems:"center",gap:space.x1,minInlineSize:0});
export const periodIcon=style({inlineSize:17,blockSize:17,flexShrink:0,color:"var(--accent)"});
export const periodRange=style({...text.metadata,color:"var(--text-muted)",textTransform:"none"});
export const empty=style({color:"var(--text-muted)",margin:0});
export const group=style({display:"grid",gridTemplateColumns:"minmax(92px,116px) minmax(0,1fr)",gap:space.field,paddingBlock:space.x3,paddingInline:space.x4,minInlineSize:0,selectors:{"&:not(:last-child)":{borderBottom:"1px solid var(--border-subtle)"}}});
export const time=style({fontVariantNumeric:"tabular-nums",color:"var(--text-muted)"});
/*
 * Two declared tracks: content, then one action region. The action region is a flex container, so
 * the row can never grow an undeclared implicit column the way it did with three tracks and four
 * children.
 */
export const row=style([focusRing,{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:space.x3,alignItems:"start",padding:"8px 0",cursor:"pointer",minInlineSize:0,borderRadius:"var(--radius-control)",transition:`background-color ${duration.state} ${easing.standard}`,selectors:{"&:hover":{background:"var(--icon-background)"}}}]);
/*
 * The row's content column. Title, description, metadata and tags are four stacked units; the
 * metadata itself is a wrapping group with a parent gap, so the category can never run into the
 * Life-area chip the way it did in bare inline flow.
 */
export const rowContent=style({display:"flex",flexDirection:"column",alignItems:"flex-start",gap:space.control,minInlineSize:0});
globalStyle(`${rowContent} > strong`, {...text.row,fontWeight:600});
export const rowDescription=style({margin:0,color:"var(--text-muted)"});
export const rowMeta=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,minInlineSize:0});
/*
 * Life-area and Focus-Plan chips are native buttons. They are bounded so a long Plan title stops
 * stretching one metadata chip across the whole row, and they *wrap* rather than truncate — the
 * title stays fully readable, which an ellipsis would have taken away from sighted users even
 * though the accessible name kept it.
 */
/*
 * The Focus Plan chip.
 *
 * Rendered against real data it was the loudest thing in the row: a saturated 448px fill wrapping
 * onto two lines, so a Plan name outweighed the task title it belonged to. Task 50 chose wrapping
 * over truncation deliberately, so no information is lost — that decision stands. What changes is
 * the *material*: a quiet hairline chip with accent text instead of a filled panel, and a narrower
 * cap so it reads as an annotation on the row rather than as a second heading.
 */
export const rowChip=style([button.ghost,compact,{maxInlineSize:"20rem",minBlockSize:0,textAlign:"left",justifyContent:"flex-start",alignItems:"flex-start",overflowWrap:"anywhere",whiteSpace:"normal",color:"var(--accent)"}]);

/*
 * The priority indicator was a literal "•" character, so it carried the document font's weight and
 * baseline rather than the icon vocabulary's — the one text-glyph icon left in a task row. It is now
 * a drawn dot. The accessible name it already had is unchanged, so this is presentation only.
 */
export const priorityDot=style({display:"inline-block",inlineSize:6,blockSize:6,borderRadius:"var(--radius-full)",background:"var(--text-muted)",flexShrink:0});
export const rowActions=style({display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"flex-end",gap:space.control,minInlineSize:0});
export const rowEditButton=style([button.ghost,compact]);
/**
 * v2 selection is a pale blue fill, not an outline. The 2 px focus-ring outline this used to draw
 * made a selected row read as a focused control, and stacked a hard edge on top of a hairline the
 * row already had.
 */
export const selected=style({background:"var(--icon-background)",boxShadow:"inset 2px 0 0 var(--accent)"});
export const assessment=style({color:"var(--text-muted)",textAlign:"center"});
export const category=style({...text.metadata,color:"var(--text-muted)"});

/* ── Task dialog form geometry ─────────────────────────────────────────────────────────────
 * The dialog surface, grid, and field units come from the shared layout authority. What lives
 * here is only what is specific to this form.
 */
/** Hour and minute share one bounded row; the pair is one field unit on the form grid. */
export const wheel=style({display:"flex",alignItems:"center",gap:space.x1,minInlineSize:0,border:"1px solid var(--glass-border)",borderRadius:"var(--radius-control)",background:"var(--glass-surface-strong)",overflow:"hidden"});
export const wheelPart=style({display:"flex",flex:1,minInlineSize:0});
export const wheelSelect=focusRingInset;
globalStyle(`${wheel} select`,{border:0,borderRadius:0,background:"transparent",minBlockSize:38});
export const legend=style({padding:`0 ${space.x1}`,fontWeight:700});
export const subGroup=style({display:"flex",flexDirection:"column",gap:space.control,margin:0,padding:space.x3,border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-control)",minInlineSize:0});
export const checkLabel=style({display:"inline-flex",alignItems:"center",gap:space.x1,minInlineSize:0});
export const scopeList=style({display:"flex",flexDirection:"column",gap:space.control,minInlineSize:0});
export const previewList=style({display:"flex",flexDirection:"column",gap:space.x1,margin:0,paddingInlineStart:space.x5,color:"var(--text-muted)"});
export const textarea=style({minBlockSize:"5.5rem",resize:"vertical"});
/** Date and number inputs keep a compact intrinsic width inside their own bounded row. */
export const dateControl=style({minInlineSize:0,maxInlineSize:"12rem",boxSizing:"border-box"});
export const numberControl=style({minInlineSize:0,maxInlineSize:"8rem",boxSizing:"border-box"});
export const undo=style({...text.metadata,display:"flex",flexWrap:"wrap",alignItems:"center",alignSelf:"flex-start",gap:space.x1,margin:0,padding:`${space.x1} ${space.x2}`,border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-control)",background:"var(--surface-subtle)",color:"var(--text-muted)"});
export const undoButton=button.ghost;
export const seriesTagsNote=style({fontSize:11,color:"var(--text-muted, var(--text-muted))",margin:"4px 0 0"});
export const dialogError=style({...text.compactBody,margin:0,padding:`${space.x2} ${space.x3}`,border:"1px solid color-mix(in srgb, var(--danger) 32%, var(--border-subtle))",borderRadius:"var(--radius-control)",background:"color-mix(in srgb, var(--danger) 6%, var(--surface-raised))",color:"var(--danger)"});
export const dialogDelete=button.destructive;
export const dialogCancel=button.secondary;
export const dialogSave=button.primary;

// ── Actual time (Task 43). Running state is conveyed by text and a border, never colour alone.
export const timerStrip = style({ display: "flex", flexWrap: "wrap", gap: space.control, alignItems: "center", padding: `${space.x2} ${space.x3}`, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-control)", background:"var(--surface-subtle)" });
export const timerRunning = style({ ...text.eyebrow, color:"var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 24%, transparent)", borderRadius: "var(--radius-small)", padding: "2px 6px" });
export const timerTitle = style({ ...text.bodyStrong });
export const timerDate = style({ ...text.metadata, color:"var(--text-muted)" });
export const timerCounter = style({ fontVariantNumeric: "tabular-nums lining-nums", fontSize: 18, lineHeight:"24px", fontWeight: 600, marginInlineStart: "auto" });
export const timerTotal = style({ ...text.numeric, color:"var(--text-muted)" });
export const timerStop = button.primary;
export const timerDiscard = button.destructive;
export const timerError = style({ ...text.compactBody, margin: 0, padding: `${space.x2} ${space.x3}`, border: "1px solid color-mix(in srgb, var(--danger) 32%, var(--border-subtle))", borderRadius:"var(--radius-control)", background:"color-mix(in srgb, var(--danger) 6%, var(--surface-raised))", color:"var(--danger)" });
export const rowTimer = style({ display: "inline-flex", gap: space.x1, alignItems: "center" });
export const rowTimerTotal = style({ ...text.numeric, color:"var(--text-muted)" });
export const rowTimerButton = style([button.secondary,compact]);
export { srOnly } from "../../../design-system/primitives/utilities.css";
/** The timeline half of the master/detail split. */
export const timelineColumn=style({display:"flex",flexDirection:"column",gap:space.section,minInlineSize:0});
