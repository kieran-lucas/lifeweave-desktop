import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";

/*
 * Today owns no page width. It is a STANDARD_PAGE and consumes the shared `PageFrame`; what remains
 * here is the timeline's own domain grid (ADR 0044).
 */
export const workspacePanel=style({display:"flex",flexDirection:"column",gap:space.section,minInlineSize:0});
/** v2 sets the date line in the accent, which is the reference's one use of blue in the header. */
export const eyebrow=style({color:"var(--accent)",fontWeight:600,fontSize:"0.9375rem",letterSpacing:"-0.01em",margin:0});
export const create=style({padding:"10px 16px"});
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
export const group_=style({background:"var(--surface)",border:"1px solid var(--border-subtle)",borderRadius:12,overflow:"hidden",minInlineSize:0});
/** Name and range are two spaced boxes; the separation is layout, never a literal space in text. */
export const periodHeading=style({display:"flex",flexWrap:"wrap",alignItems:"baseline",gap:space.control,margin:0,minInlineSize:0});
export const periodRange=style({fontVariantNumeric:"tabular-nums",fontWeight:400,color:"var(--text-muted)",fontSize:"1rem"});
export const empty=style({color:"var(--text-muted)",margin:0});
export const group=style({display:"grid",gridTemplateColumns:"minmax(92px,116px) minmax(0,1fr)",gap:space.field,paddingBlock:space.x3,paddingInline:space.x4,minInlineSize:0,selectors:{"&:not(:last-child)":{borderBottom:"1px solid var(--border-subtle)"}}});
export const time=style({fontVariantNumeric:"tabular-nums",color:"var(--text-muted)"});
/*
 * Two declared tracks: content, then one action region. The action region is a flex container, so
 * the row can never grow an undeclared implicit column the way it did with three tracks and four
 * children.
 */
export const row=style({display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:space.x3,alignItems:"start",padding:"8px 0",cursor:"pointer",minInlineSize:0,borderRadius:8,transition:"background-color 100ms cubic-bezier(0.2,0,0,1)",selectors:{"&:hover":{background:"var(--icon-background)"}}});
/*
 * The row's content column. Title, description, metadata and tags are four stacked units; the
 * metadata itself is a wrapping group with a parent gap, so the category can never run into the
 * Life-area chip the way it did in bare inline flow.
 */
export const rowContent=style({display:"flex",flexDirection:"column",alignItems:"flex-start",gap:space.control,minInlineSize:0});
export const rowDescription=style({margin:0,color:"var(--text-muted)"});
export const rowMeta=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,minInlineSize:0});
/*
 * Life-area and Focus-Plan chips are native buttons. They are bounded so a long Plan title stops
 * stretching one metadata chip across the whole row, and they *wrap* rather than truncate — the
 * title stays fully readable, which an ellipsis would have taken away from sighted users even
 * though the accessible name kept it.
 */
export const rowChip=style({maxInlineSize:"28rem",textAlign:"left",overflowWrap:"anywhere",border:0,borderRadius:"0.375rem",background:"var(--active-background)",color:"var(--accent)",fontSize:"0.8125rem",padding:"0.2rem 0.5rem",cursor:"pointer",selectors:{"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const rowActions=style({display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"flex-end",gap:space.control,minInlineSize:0});
export const rowEditButton=style({border:0,borderRadius:"0.375rem",background:"transparent",color:"var(--text-muted)",fontSize:"0.8125rem",padding:"0.25rem 0.5rem",cursor:"pointer",whiteSpace:"nowrap",selectors:{"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
/**
 * v2 selection is a pale blue fill, not an outline. The 2 px focus-ring outline this used to draw
 * made a selected row read as a focused control, and stacked a hard edge on top of a hairline the
 * row already had.
 */
export const selected=style({background:"var(--icon-background)"});
export const assessment=style({color:"var(--text-muted)",textAlign:"center"});
export const category=style({color:"var(--text-muted)",fontSize:12});

/* ── Task dialog form geometry ─────────────────────────────────────────────────────────────
 * The dialog surface, grid, and field units come from the shared layout authority. What lives
 * here is only what is specific to this form.
 */
/** Hour and minute share one bounded row; the pair is one field unit on the form grid. */
export const wheel=style({display:"flex",alignItems:"center",gap:space.x1,minInlineSize:0});
export const wheelPart=style({display:"flex",flex:1,minInlineSize:0});
export const legend=style({padding:`0 ${space.x1}`,fontWeight:700});
export const subGroup=style({display:"flex",flexDirection:"column",gap:space.control,margin:0,padding:space.x3,border:"1px solid var(--border-subtle)",borderRadius:10,minInlineSize:0});
export const checkLabel=style({display:"inline-flex",alignItems:"center",gap:space.x1,minInlineSize:0});
export const scopeList=style({display:"flex",flexDirection:"column",gap:space.control,minInlineSize:0});
export const previewList=style({display:"flex",flexDirection:"column",gap:space.x1,margin:0,paddingInlineStart:space.x5,color:"var(--text-muted)"});
export const textarea=style({minBlockSize:"5.5rem",resize:"vertical"});
/** Date and number inputs keep a compact intrinsic width inside their own bounded row. */
export const dateControl=style({minInlineSize:0,maxInlineSize:"12rem",boxSizing:"border-box"});
export const numberControl=style({minInlineSize:0,maxInlineSize:"8rem",boxSizing:"border-box"});
export const undo=style({margin:0,color:"var(--text-muted)"});
export const seriesTagsNote=style({fontSize:11,color:"var(--text-muted, var(--text-muted))",margin:"4px 0 0"});

// ── Actual time (Task 43). Running state is conveyed by text and a border, never colour alone.
export const timerStrip = style({ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBlock: "0.6rem", padding: "0.55rem 0.75rem", border: "1px solid currentColor", borderRadius: "0.6rem" });
export const timerRunning = style({ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.75rem", border: "1px solid currentColor", borderRadius: "0.4rem", padding: "0.1rem 0.4rem" });
export const timerTitle = style({ fontWeight: 600 });
export const timerDate = style({ opacity: 0.8 });
export const timerCounter = style({ fontVariantNumeric: "tabular-nums", fontSize: "1.1rem", fontWeight: 700, marginInlineStart: "auto" });
export const timerTotal = style({ opacity: 0.8, fontVariantNumeric: "tabular-nums" });
export const timerButton = style({ border: "1px solid currentColor", borderRadius: "0.5rem", background: "transparent", color: "inherit", padding: "0.35rem 0.7rem", cursor: "pointer", selectors: { "&:disabled": { cursor: "not-allowed", opacity: 0.6 } } });
export const timerError = style({ margin: 0, border: "2px solid currentColor", padding: "0.5rem" });
export const rowTimer = style({ display: "inline-flex", gap: "0.4rem", alignItems: "center" });
export const rowTimerTotal = style({ fontVariantNumeric: "tabular-nums", opacity: 0.85 });
export const rowTimerButton = style({ border: "1px solid currentColor", borderRadius: "0.5rem", background: "transparent", color: "inherit", padding: "0.25rem 0.55rem", cursor: "pointer", selectors: { "&:disabled": { cursor: "not-allowed", opacity: 0.5 } } });
export const srOnly = style({ position: "absolute", inlineSize: "1px", blockSize: "1px", overflow: "hidden", clipPath: "inset(50%)" });
/** The timeline half of the master/detail split. */
export const timelineColumn=style({display:"flex",flexDirection:"column",gap:space.section,minInlineSize:0});
