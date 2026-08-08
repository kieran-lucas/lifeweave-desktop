import { style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";

/*
 * Calendar owns no page width. It is a WIDE_WORKSPACE and consumes the shared `PageFrame`, which
 * is also the query container its cells reflow against (ADR 0044).
 */
export const eyebrow=style({margin:0,color:"var(--text-muted)"});
export const actions=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,minInlineSize:0});
export const actionButton=style({minHeight:36,border:"1px solid var(--border-subtle)",borderRadius:9,background:"var(--surface)",color:"var(--text-primary)",cursor:"pointer"});
export const grid=style({display:"grid",gap:1,border:"1px solid var(--border-subtle)",background:"var(--border-subtle)",minInlineSize:0});
export const weekdays=style({display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",background:"var(--surface)",color:"var(--text-muted)",textAlign:"center",paddingBlock:8,fontSize:12});
export const week=style({display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:1});
export const cell=style({minWidth:0,minHeight:116,background:"var(--surface)"});
export const cellButton=style({width:"100%",height:"100%",minHeight:116,display:"flex",flexDirection:"column",alignItems:"stretch",gap:8,padding:10,border:0,background:"transparent",color:"var(--text-primary)",textAlign:"left",cursor:"pointer",selectors:{"&[data-outside]":{opacity:.42},"&[aria-current=date]":{boxShadow:"inset 0 0 0 2px var(--accent)"},"[aria-selected=true] &":{background:"var(--active-background)"},"&:focus-visible":{position:"relative",outline:"3px solid var(--focus-ring)",outlineOffset:-3}}});
export const dayNumber=style({fontWeight:750,fontVariantNumeric:"tabular-nums"});
export const summary=style({display:"grid",gap:6,fontSize:11,color:"var(--text-muted)"});
export const icons=style({display:"flex",gap:5,alignItems:"center"});
export const loads=style({display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3});
export const load=style({width:"100%",height:4,accentColor:"var(--accent)"});
export const missed=style({display:"grid",placeItems:"center",width:16,height:16,border:"1px solid currentColor",borderRadius:"50%",fontWeight:800,color:"#a34b24"});
