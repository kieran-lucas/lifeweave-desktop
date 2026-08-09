import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";
import { duration, easing } from "../../design-system/visual/motion.css";

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
export const modeButton=style({border:0,borderBottom:"2px solid transparent",borderRadius:0,marginBottom:-1,padding:"8px 8px 10px",minBlockSize:34,background:"transparent",color:"var(--text-muted)",fontSize:"0.875rem",fontWeight:500,cursor:"pointer",transition:`color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,selectors:{"&:hover":{color:"var(--text-primary)",background:"transparent"},"&[aria-pressed=true]":{color:"var(--accent)",borderBottomColor:"var(--accent)",fontWeight:600},"&:focus-visible":{outline:"2px solid var(--focus-ring)",outlineOffset:2}}});
export const toolbar=style({display:"flex",flexWrap:"wrap",alignItems:"center",gap:space.control,minBlockSize:40,minInlineSize:0});
export const quietButton=style({justifySelf:"start",display:"inline-flex",alignItems:"center",gap:6,border:0,borderRadius:"var(--radius-control)",padding:"7px 9px",background:"transparent",color:"var(--text-muted)",cursor:"pointer",selectors:{"&:hover":{background:"var(--active-background)",color:"var(--text-primary)"},"&:disabled":{opacity:.45,cursor:"default"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const breadcrumb=style({display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",color:"var(--text-muted)"});
export const crumb=style({border:0,padding:3,background:"transparent",color:"inherit",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer"});
export const scene=style({position:"relative",display:"grid",gap:space.x5,width:"min(1040px,100%)",minBlockSize:360,minInlineSize:0});
export const connectors=style({position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible",zIndex:0});
export const focalWrap=style({position:"relative",zIndex:1,display:"flex",justifyContent:"flex-start"});
export const focal=style({width:"100%",padding:"20px 22px",border:"1px solid var(--glass-border)",borderLeft:"3px solid var(--accent)",borderRadius:"var(--radius-surface)",background:"color-mix(in srgb, var(--glass-surface-strong) 72%, transparent)",color:"var(--text-primary)",textAlign:"left"});
export const focalTitle=style({margin:"8px 0 6px",fontSize:"1.55rem"});
export const nodeDescription=style({margin:0,color:"var(--text-muted)",lineHeight:1.55,whiteSpace:"pre-wrap"});
export const nodeMeta=style({display:"flex",alignItems:"center",gap:8,color:"var(--text-muted)",fontSize:13});
export const children=style({position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:space.x3,listStyle:"none",padding:0,margin:0,minInlineSize:0,"@media":{"screen and (max-width: 900px)":{gridTemplateColumns:"minmax(0,1fr)"}}});
export const childItem=style({position:"relative",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",alignItems:"start",gap:6});
export const card=style({minHeight:118,width:"100%",border:"1px solid var(--glass-border)",borderRadius:"var(--radius-surface)",padding:"15px 72px 15px 16px",background:"color-mix(in srgb, var(--glass-surface-strong) 62%, transparent)",color:"var(--text-primary)",textAlign:"left",cursor:"pointer",transition:`background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}`,selectors:{"&:hover":{background:"var(--glass-surface-strong)",borderColor:"var(--focus-ring)"},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}},"@media":{"(prefers-reduced-motion: reduce)":{transition:"none"}}});
export const cardTitle=style({display:"block",fontWeight:760,margin:"8px 0 5px"});
export const pinButton=style({position:"absolute",top:10,right:10,zIndex:2,minBlockSize:30,padding:"5px 8px",border:0,borderRadius:"var(--radius-control)",background:"transparent",color:"var(--text-muted)",fontSize:12,fontWeight:650,cursor:"pointer",selectors:{"&:hover":{background:"var(--active-background)",color:"var(--text-primary)"}}});
export const icon=style({display:"inline-grid",placeItems:"center",width:34,height:34,borderRadius:"var(--radius-control)",background:"var(--icon-background)",fontWeight:800});
export const empty=style({padding:"48px 24px",border:"1px dashed var(--border-subtle)",borderRadius:"var(--radius-surface)",textAlign:"center",color:"var(--text-muted)"});
export const paging=style({display:"flex",justifyContent:"center",alignItems:"center",gap:12});
export const pinList=style({display:"grid",gridTemplateColumns:"minmax(0,760px)",justifyContent:"start",gap:space.x3,listStyle:"none",padding:0,margin:0,minInlineSize:0});
export const unavailable=style({opacity:.68});
export const readerHero=style({marginTop:24,padding:"clamp(28px,6vw,64px)",border:"1px solid var(--glass-border)",borderRadius:"var(--radius-floating)",background:"var(--glass-surface-strong)"});
export const readerEmpty=style({marginTop:32,paddingTop:24,borderTop:"1px solid var(--border-subtle)",color:"var(--text-muted)"});
export const status=style({padding:24,color:"var(--text-muted)"});
globalStyle(`${connectors} path`,{stroke:"var(--border-subtle)",strokeWidth:1.5,fill:"none",transition:`opacity ${duration.inspectorState} ${easing.standard}`});
globalStyle(`${card} p`,{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"});
globalStyle(`${pageFrame.wide} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
globalStyle(`${pageFrame.reading} button:focus-visible`,{outline:"3px solid var(--focus-ring)",outlineOffset:2});
