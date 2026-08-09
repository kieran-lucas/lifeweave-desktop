import { globalStyle, style } from "@vanilla-extract/css";
import { splitWorkspace } from "../../app/layout/layout.css";

/*
 * Canvas leads, inspector is a bounded rail. The flexible track is `minmax(0, 1fr)` from the shared
 * primitive, so the inspector can never squeeze the canvas into page-level overflow (ADR 0044).
 */
export const workspace=style([splitWorkspace,{vars:{"--lw-split-columns":"minmax(0,1fr) minmax(260px,300px)"}}]);
export const canvasViewport=style({position:"relative",minWidth:0,minHeight:520,overflow:"auto",border:"1px solid var(--glass-border)",borderRadius:18,background:"color-mix(in srgb, var(--surface) 75%, var(--app-background))",scrollbarGutter:"stable"});
export const canvas=style({position:"relative",minWidth:"100%",minHeight:500});
export const links=style({position:"absolute",inset:0,pointerEvents:"none",overflow:"visible"});
export const positioner=style({position:"absolute",width:164,transform:"translate(var(--life-x),var(--life-y))"});
export const dndOwner=style({position:"relative"});
export const nodeCard=style({display:"grid",gridTemplateColumns:"30px minmax(0,1fr)",alignItems:"center",gap:8,width:"100%",minHeight:66,padding:"9px 10px",border:"1px solid var(--glass-border)",borderRadius:12,background:"var(--glass-surface-strong)",color:"var(--text-primary)",textAlign:"left",cursor:"grab",selectors:{"&[aria-pressed=true]":{borderColor:"var(--focus-ring)",boxShadow:"0 0 0 2px color-mix(in srgb, var(--focus-ring) 25%, transparent)"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2},"&:active":{cursor:"grabbing"}}});
export const compactTitle=style({fontWeight:750,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"});
export const compactMeta=style({display:"block",fontSize:11,color:"var(--text-muted)",marginTop:2});
export const dropBefore=style({position:"absolute",left:0,right:0,top:-7,height:10,border:0,background:"transparent",selectors:{"&[data-over=true]":{background:"var(--focus-ring)"}}});
export const inspector=style({position:"sticky",top:0,display:"grid",gap:12,padding:16,border:"1px solid var(--glass-border)",borderRadius:16,background:"var(--glass-surface-strong)"});
export const inspectorTitle=style({margin:0,fontSize:"1.05rem"});
export const field=style({display:"grid",gap:5,color:"var(--text-muted)",fontSize:13});
export const input=style({width:"100%",minWidth:0,border:"1px solid var(--glass-border)",borderRadius:9,padding:"8px 10px",background:"var(--app-background)",color:"var(--text-primary)",font:"inherit",selectors:{"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:1}}});
export const actions=style({display:"flex",gap:7,flexWrap:"wrap"});
export const button=style({border:"1px solid var(--glass-border)",borderRadius:9,padding:"7px 10px",background:"var(--app-background)",color:"var(--text-primary)",cursor:"pointer",fontWeight:650,selectors:{"&:disabled":{opacity:.45,cursor:"default"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const destructive=style([button,{color:"#b93838"}]);
export const archived=style({display:"grid",gap:8,paddingTop:8,borderTop:"1px solid var(--border-subtle)"});
export const archivedList=style({display:"grid",gap:6,listStyle:"none",padding:0,margin:0,maxHeight:180,overflow:"auto"});
export const archivedRow=style({display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",fontSize:13});
export const status=style({gridColumn:"1/-1",minHeight:24,color:"var(--text-muted)"});
export const instructions=style({fontSize:12,color:"var(--text-muted)",lineHeight:1.45});
export const overlay=style({width:164,padding:10,border:"2px solid var(--focus-ring)",borderRadius:12,background:"var(--glass-surface-strong)",boxShadow:"0 12px 30px color-mix(in srgb, var(--text-primary) 16%, transparent)",color:"var(--text-primary)",fontWeight:750});
export const preview=style({stroke:"var(--focus-ring)",strokeWidth:2,strokeDasharray:"5 4",fill:"none"});
globalStyle(`${links} path`,{stroke:"var(--border-subtle)",strokeWidth:1.25,fill:"none",transition:"d 360ms cubic-bezier(.2,.8,.2,1)"});
globalStyle(`${workspace} textarea`,{resize:"vertical"});
globalStyle(`${workspace} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
