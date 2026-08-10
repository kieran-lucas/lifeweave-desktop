import { globalStyle, style } from "@vanilla-extract/css";
import { splitWorkspace } from "../../app/layout/layout.css";
import { space } from "../../app/layout/tokens.css";
import { button as sharedButton } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { text } from "../../design-system/visual/typography.css";

/*
 * Canvas leads, inspector is a bounded rail. The flexible track is `minmax(0, 1fr)` from the shared
 * primitive, so the inspector can never squeeze the canvas into page-level overflow (ADR 0044).
 */
export const workspace=style([splitWorkspace,{vars:{"--lw-split-columns":"minmax(0,1fr) minmax(260px,300px)"}}]);
export const canvasViewport=style({position:"relative",minWidth:0,minHeight:520,overflow:"auto",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-surface)",background:"color-mix(in srgb, var(--surface) 82%, var(--app-background))",scrollbarGutter:"stable"});
export const canvas=style({position:"relative",minWidth:"100%",minHeight:500});
export const links=style({position:"absolute",inset:0,pointerEvents:"none",overflow:"visible"});
export const positioner=style({position:"absolute",width:164,transform:"translate(var(--life-x),var(--life-y))"});
export const dndOwner=style({position:"relative"});
export const nodeCard=style([focusRing,{display:"grid",gridTemplateColumns:"30px minmax(0,1fr)",alignItems:"center",gap:8,width:"100%",minHeight:66,padding:"9px 10px",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-surface)",background:"var(--surface)",color:"var(--text-primary)",textAlign:"left",cursor:"grab",selectors:{"&[aria-pressed=true]":{borderInlineStart:"3px solid var(--accent)",background:"var(--active-background)"},"&:active":{cursor:"grabbing"}},'@media':{'(forced-colors: active)':{selectors:{'&[aria-pressed=true]':{borderInlineStart:"3px solid Highlight"}}}}}]);
export const compactTitle=style({whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",...text.cardTitle});
export const compactMeta=style({display:"block",color:"var(--text-muted)",marginTop:2,...text.caption});
export const dropBefore=style({position:"absolute",left:0,right:0,top:-7,height:10,border:0,background:"transparent",selectors:{"&[data-over=true]":{background:"var(--focus-ring)"}}});
export const inspector=style({position:"sticky",top:0,display:"grid",gap:space.x3,maxBlockSize:"calc(100dvh - 190px)",overflowY:"auto",padding:`${space.x1} 0 ${space.x3} ${space.x4}`,borderInlineStart:"1px solid var(--border-subtle)",background:"transparent",scrollbarGutter:"stable",'@media':{'(max-width: 700px)':{position:"static",maxBlockSize:"none",overflowY:"visible",padding:`${space.x4} 0 0`,borderInlineStart:0,borderBlockStart:"1px solid var(--border-subtle)"}}});
export const inspectorTitle=style({margin:0,...text.sectionTitle});
export const field=style({display:"grid",gap:5,color:"var(--text-muted)",...text.label});
export const input=style([focusRing,{width:"100%",minWidth:0,minBlockSize:36,border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-control)",padding:"7px 10px",background:"var(--surface)",color:"var(--text-primary)",font:"inherit"}]);
export const actions=style({display:"flex",gap:7,flexWrap:"wrap"});
export const button=sharedButton.secondary;
export const destructive=sharedButton.destructive;
export const archived=style({display:"grid",gap:8,paddingTop:8,borderTop:"1px solid var(--border-subtle)"});
export const archivedList=style({display:"grid",gap:6,listStyle:"none",padding:0,margin:0,maxHeight:180,overflow:"auto"});
export const archivedRow=style({display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",fontSize:13});
export const status=style({gridColumn:"1/-1",minHeight:24,color:"var(--text-muted)"});
export const instructions=style({color:"var(--text-muted)",...text.metadata});
export const overlay=style({width:164,padding:10,border:"2px solid var(--focus-ring)",borderRadius:"var(--radius-surface)",background:"var(--glass-surface-strong)",boxShadow: "var(--elevation-modal)",color:"var(--text-primary)",fontWeight:750});
export const preview=style({stroke:"var(--focus-ring)",strokeWidth:2,strokeDasharray:"5 4",fill:"none"});
globalStyle(`${links} path`,{stroke:"var(--border-subtle)",strokeWidth:1.25,fill:"none"});
globalStyle(`${workspace} textarea`,{resize:"vertical"});
globalStyle(`${inspector} > ${actions}, ${inspector} > section`,{borderBlockStart:"1px solid var(--border-subtle)",paddingBlockStart:space.x3});
