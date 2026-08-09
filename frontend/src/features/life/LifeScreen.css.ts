import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";

/*
 * Life owns no page width. Browse, Edit, Pinned and Graph are WIDE_WORKSPACE surfaces and the
 * Reader is a READING_PAGE; all four consume the shared `PageFrame`, which is also the query
 * container the child grid reflows against (ADR 0044).
 */
export const heading=style({margin:0,color:"var(--text-primary)",fontSize:"clamp(1.8rem,3vw,2.5rem)",letterSpacing:"-0.04em"});
/*
 * The Life mode switch, finally de-boxed.
 *
 * This was the last instance of the anti-pattern the Phase 0 census flagged first: a filled,
 * bordered segmented container floating above the page's other bordered containers — a box of boxes
 * on top of a box. It is now the same low-chrome inline navigation the Today workspace tabs and the
 * inspector facets use, so the three tab strips in the product finally share one language.
 */
export const modes=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:16,borderBottom:"1px solid var(--border-subtle)",minInlineSize:0});
export const modeButton=style({border:0,borderBottom:"2px solid transparent",borderRadius:0,marginBottom:-1,padding:"8px 8px 10px",minBlockSize:34,background:"transparent",color:"var(--text-muted)",fontSize:"0.875rem",fontWeight:500,cursor:"pointer",transition:"color 100ms cubic-bezier(0.2,0,0,1), border-color 100ms cubic-bezier(0.2,0,0,1)",selectors:{"&:hover":{color:"var(--text-primary)",background:"transparent"},"&[aria-pressed=true]":{color:"var(--accent)",borderBottomColor:"var(--accent)",fontWeight:600},"&:focus-visible":{outline:"2px solid var(--focus-ring)",outlineOffset:2}}});
export const toolbar=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,minBlockSize:40,minInlineSize:0});
export const quietButton=style({border:"1px solid var(--glass-border)",borderRadius:"var(--radius-control)",padding:"7px 11px",background:"var(--glass-surface-strong)",color:"var(--text-primary)",cursor:"pointer",selectors:{"&:disabled":{opacity:.45,cursor:"default"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const breadcrumb=style({display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",color:"var(--text-muted)"});
export const crumb=style({border:0,padding:3,background:"transparent",color:"inherit",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer"});
export const scene=style({position:"relative",display:"grid",gap:space.x7,minBlockSize:360,minInlineSize:0});
export const connectors=style({position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible",zIndex:0});
export const focalWrap=style({position:"relative",zIndex:1,display:"flex",justifyContent:"center"});
export const focal=style({width:"min(520px,100%)",padding:24,border:"1px solid var(--glass-border)",borderRadius:"var(--radius-floating)",background:"var(--glass-surface-strong)",boxShadow: "var(--elevation-modal)",color:"var(--text-primary)",textAlign:"left"});
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
export const card=style({minHeight:142,width:"100%",border:"1px solid var(--glass-border)",borderRadius:"var(--radius-surface)",padding:16,background:"var(--glass-surface-strong)",color:"var(--text-primary)",textAlign:"left",cursor:"pointer",transition:"transform 360ms cubic-bezier(.2,.8,.2,1), border-color 180ms ease",selectors:{"&:hover":{transform:"translateY(-2px)",borderColor:"var(--focus-ring)"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}},"@media":{"(prefers-reduced-motion: reduce)":{transition:"opacity 100ms linear"}}});
export const cardTitle=style({display:"block",fontWeight:760,margin:"8px 0 5px"});
export const pinButton=style({position:"absolute",top:8,right:8,zIndex:2,width:32,height:32,padding:0,minBlockSize:0,border:"1px solid var(--glass-border)",borderRadius:"var(--radius-control)",background:"var(--app-background)",color:"var(--text-primary)",cursor:"pointer"});
export const icon=style({display:"inline-grid",placeItems:"center",width:34,height:34,borderRadius:"var(--radius-control)",background:"var(--icon-background)",fontWeight:800});
export const empty=style({padding:"48px 24px",border:"1px dashed var(--border-subtle)",borderRadius:"var(--radius-surface)",textAlign:"center",color:"var(--text-muted)"});
export const paging=style({display:"flex",justifyContent:"center",alignItems:"center",gap:12});
export const pinList=style({display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,240px))",justifyContent:"center",gap:space.x3,listStyle:"none",padding:0,margin:0,minInlineSize:0});
export const unavailable=style({opacity:.68});
export const readerHero=style({marginTop:24,padding:"clamp(28px,6vw,64px)",border:"1px solid var(--glass-border)",borderRadius:"var(--radius-floating)",background:"var(--glass-surface-strong)"});
export const readerEmpty=style({marginTop:32,paddingTop:24,borderTop:"1px solid var(--border-subtle)",color:"var(--text-muted)"});
export const status=style({padding:24,color:"var(--text-muted)"});
globalStyle(`${connectors} path`,{stroke:"var(--border-subtle)",strokeWidth:1.5,fill:"none",transition:"opacity 180ms ease"});
globalStyle(`${card} p`,{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"});
globalStyle(`${pageFrame.wide} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
globalStyle(`${pageFrame.reading} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
