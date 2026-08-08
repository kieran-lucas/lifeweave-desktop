import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";

/*
 * Analytics owns no page width. It is a STANDARD_PAGE and consumes the shared `PageFrame`; what
 * remains here is its own section and fact-grid geometry (ADR 0044).
 */
export const eyebrow=style({margin:0,color:"var(--text-muted)"});

/** One region for the period controls, so they read as governing the summary below them. */
export const periodControls=style({display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:space.field,padding:space.x3,border:"1px solid var(--border-subtle)",borderRadius:12,minInlineSize:0});
export const periodTabs=style({display:"flex",flexWrap:"wrap",gap:space.x1,minInlineSize:0});
export const periodNav=style({display:"flex",flexWrap:"wrap",gap:space.x3,alignItems:"center",minInlineSize:0});

/** Every Analytics section shares one internal rhythm. */
export const section=style({display:"flex",flexDirection:"column",gap:space.group,minInlineSize:0});

export const primary=style({display:"flex",flexDirection:"column",gap:space.x1,margin:0});
globalStyle(`${primary} strong`,{fontSize:"clamp(2rem,5vw,4rem)",fontVariantNumeric:"tabular-nums"});
globalStyle(`${primary} span`,{color:"var(--text-muted)"});

/*
 * Facts step 3 → 2 → 1 against the page frame rather than the window, and `auto-fit` means the grid
 * never demands more width than it has. A fixed `repeat(3, …)` was the previous authority and could
 * not step down at all.
 */
export const facts=style({display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 260px))",justifyContent:"start",gap:space.field,margin:0,minInlineSize:0});
globalStyle(`${facts} div`,{borderTop:"1px solid var(--border-subtle)",paddingTop:10,minInlineSize:0});
globalStyle(`${facts} dt`,{color:"var(--text-muted)"});
globalStyle(`${facts} dd`,{margin:0,fontSize:24});

export const categories=style({listStyle:"none",padding:0,margin:0,display:"grid",gap:space.group,minInlineSize:0});
globalStyle(`${categories} li`,{borderTop:"1px solid var(--border-subtle)",paddingTop:12,minInlineSize:0});
globalStyle(`${categories} progress`,{display:"block",width:"min(100%,520px)",accentColor:"var(--accent)"});

export const distribution=style({display:"grid",gap:3,maxInlineSize:520});
globalStyle(`${distribution} progress`,{width:"100%",height:8,accentColor:"var(--accent)"});

/** Tables own their horizontal scroll so the page never does. */
export const tableScroll=scrollRegion;
export const planTableWrap=scrollRegion;
export const table=style({borderCollapse:"collapse",width:"100%",textAlign:"left"});
export const planTable=style({borderCollapse:"collapse",width:"100%",textAlign:"left"});
globalStyle(`${table} th, ${table} td`,{borderTop:"1px solid var(--border-subtle)",padding:"8px 12px 8px 0",verticalAlign:"top"});
globalStyle(`${planTable} th, ${planTable} td`,{borderTop:"1px solid var(--border-subtle)",padding:"8px 12px 8px 0",verticalAlign:"top"});
