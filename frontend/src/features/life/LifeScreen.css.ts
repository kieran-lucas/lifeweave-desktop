import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";

/*
 * Life owns no page width. Browse, Edit, Pinned and Graph are WIDE_WORKSPACE surfaces and the
 * Reader is a READING_PAGE; all four consume the shared `PageFrame`, which is also the query
 * container the child grid reflows against (ADR 0044).
 */
export const heading=style({margin:0,color:"var(--text-primary)",fontSize:"clamp(1.8rem,3vw,2.5rem)",letterSpacing:"-0.04em"});
export const modes=style({display:"flex",gap:4,padding:4,border:"1px solid var(--glass-border)",borderRadius:12,background:"var(--glass-surface-strong)"});
export const modeButton=style({border:0,borderRadius:8,padding:"8px 14px",background:"transparent",color:"var(--text-muted)",fontWeight:700,cursor:"pointer",selectors:{"&[aria-pressed=true]":{background:"var(--active-background)",color:"var(--text-primary)"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const toolbar=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,minBlockSize:40,minInlineSize:0});
export const quietButton=style({border:"1px solid var(--glass-border)",borderRadius:9,padding:"7px 11px",background:"var(--glass-surface-strong)",color:"var(--text-primary)",cursor:"pointer",selectors:{"&:disabled":{opacity:.45,cursor:"default"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const breadcrumb=style({display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",color:"var(--text-muted)"});
export const crumb=style({border:0,padding:3,background:"transparent",color:"inherit",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer"});
export const scene=style({position:"relative",display:"grid",gap:space.x7,minBlockSize:360,minInlineSize:0});
export const connectors=style({position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible",zIndex:0});
export const focalWrap=style({position:"relative",zIndex:1,display:"flex",justifyContent:"center"});
export const focal=style({width:"min(520px,100%)",padding:24,border:"1px solid var(--glass-border)",borderRadius:20,background:"var(--glass-surface-strong)",boxShadow:"0 16px 44px color-mix(in srgb, var(--text-primary) 8%, transparent)",color:"var(--text-primary)",textAlign:"left"});
export const focalTitle=style({margin:"8px 0 6px",fontSize:"1.55rem"});
export const nodeDescription=style({margin:0,color:"var(--text-muted)",lineHeight:1.55,whiteSpace:"pre-wrap"});
export const nodeMeta=style({display:"flex",alignItems:"center",gap:8,color:"var(--text-muted)",fontSize:13});
/*
 * `auto-fit` with a capped track and centred packing. The child count must not drive the page
 * width, but `auto-fill` was worse than the old fixed grid: it keeps empty tracks, so a single
 * child sat marooned in column one while the focal node above it was centred. Capping the track
 * stops one child stretching to the full frame, and centring keeps the children on the focal
 * node's axis.
 */
export const children=style({position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,240px))",justifyContent:"center",gap:space.x3,listStyle:"none",padding:0,margin:0,minInlineSize:0});
export const childItem=style({position:"relative",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",alignItems:"start",gap:6});
export const card=style({minHeight:142,width:"100%",border:"1px solid var(--glass-border)",borderRadius:15,padding:16,background:"var(--glass-surface-strong)",color:"var(--text-primary)",textAlign:"left",cursor:"pointer",transition:"transform 360ms cubic-bezier(.2,.8,.2,1), border-color 180ms ease",selectors:{"&:hover":{transform:"translateY(-2px)",borderColor:"var(--focus-ring)"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}},"@media":{"(prefers-reduced-motion: reduce)":{transition:"opacity 100ms linear"}}});
export const cardTitle=style({display:"block",fontWeight:760,margin:"8px 0 5px"});
export const pinButton=style({position:"absolute",top:8,right:8,zIndex:2,width:32,height:32,padding:0,minBlockSize:0,border:"1px solid var(--glass-border)",borderRadius:9,background:"var(--app-background)",color:"var(--text-primary)",cursor:"pointer"});
export const icon=style({display:"inline-grid",placeItems:"center",width:34,height:34,borderRadius:11,background:"var(--icon-background)",fontWeight:800});
export const empty=style({padding:"48px 24px",border:"1px dashed var(--border-subtle)",borderRadius:16,textAlign:"center",color:"var(--text-muted)"});
export const paging=style({display:"flex",justifyContent:"center",alignItems:"center",gap:12});
export const pinList=style({display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,240px))",justifyContent:"center",gap:space.x3,listStyle:"none",padding:0,margin:0,minInlineSize:0});
export const unavailable=style({opacity:.68});
export const readerHero=style({marginTop:24,padding:"clamp(28px,6vw,64px)",border:"1px solid var(--glass-border)",borderRadius:24,background:"var(--glass-surface-strong)"});
export const readerEmpty=style({marginTop:32,paddingTop:24,borderTop:"1px solid var(--border-subtle)",color:"var(--text-muted)"});
export const status=style({padding:24,color:"var(--text-muted)"});
globalStyle(`${connectors} path`,{stroke:"var(--border-subtle)",strokeWidth:1.5,fill:"none",transition:"opacity 180ms ease"});
globalStyle(`${card} p`,{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"});
globalStyle(`${pageFrame.wide} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
globalStyle(`${pageFrame.reading} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
