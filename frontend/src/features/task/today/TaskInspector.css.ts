import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";

/*
 * Inspector styles live beside the lazily-loaded inspector, not in `TodayScreen.css.ts`.
 *
 * vanilla-extract compiles each export into a class-name constant in JavaScript. Sixteen of them in
 * the eagerly-imported Today stylesheet put 797 bytes into `index.js` and pushed it past its locked
 * ceiling even after the component itself was made lazy. Co-locating the styles with the component
 * moves those constants into the lazy chunk, where they belong.
 */
/*
 * The separator follows the layout.
 *
 * `splitWorkspace` stacks below 900px of *container* width, and a leading vertical hairline on a
 * full-width stacked block reads as a stray line rather than as a division. The same container
 * query the split uses switches it to a top rule, so the separator always sits between the two
 * regions it actually separates. `position: sticky` is likewise only meaningful beside the
 * timeline.
 */
export const inspector=style({
  display:"flex",flexDirection:"column",minInlineSize:0,
  paddingBlockStart:space.field,marginBlockStart:space.x3,
  borderBlockStart:"1px solid var(--border-subtle)",
  "@container":{"(min-width: 900px)":{
    paddingInlineStart:space.x5,paddingBlockStart:0,marginBlockStart:0,
    borderBlockStart:"none",borderInlineStart:"1px solid var(--border-subtle)",
    position:"sticky",top:0,alignSelf:"start",
  }},
});
export const inspectorHeader=style({display:"flex",alignItems:"center",gap:space.control,minInlineSize:0});
export const inspectorContext=style({display:"inline-flex",alignItems:"center",gap:6,marginInlineEnd:"auto",minInlineSize:0,color:"var(--text-muted)",fontSize:"0.8125rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"});
export const inspectorClose=style({display:"grid",placeItems:"center",inlineSize:28,blockSize:28,minBlockSize:0,padding:0,border:0,borderRadius:8,background:"transparent",color:"var(--text-muted)",cursor:"pointer",selectors:{"&:hover":{background:"var(--icon-background)",color:"var(--text-primary)"},"&:focus-visible":{outline:"2px solid var(--focus-ring)",outlineOffset:2}}});
/** Sans, semibold — v2 removed the editorial serif from object titles. */
export const inspectorTitle=style({margin:`${space.x3} 0 0`,color:"var(--text-primary)",fontSize:"1.375rem",fontWeight:600,letterSpacing:"-0.018em",lineHeight:1.3,overflowWrap:"anywhere"});
export const inspectorTabs=style({display:"flex",alignItems:"center",flexWrap:"wrap",gap:space.field,marginBlockStart:space.field,borderBottom:"1px solid var(--border-subtle)",minInlineSize:0});
export const inspectorTab=style({display:"inline-flex",alignItems:"center",gap:5,minBlockSize:32,padding:"0 0 8px",marginBottom:-1,border:0,borderBottom:"2px solid transparent",background:"transparent",color:"var(--text-muted)",fontSize:"0.8125rem",fontWeight:500,cursor:"pointer",selectors:{"&:hover":{color:"var(--text-primary)"},"&[aria-selected=true]":{color:"var(--accent)",borderBottomColor:"var(--accent)",fontWeight:600},"&:focus-visible":{outline:"2px solid var(--focus-ring)",outlineOffset:2}}});
export const inspectorTabCount=style({color:"var(--text-muted)",fontSize:"0.75rem"});
export const inspectorBody=style({display:"flex",flexDirection:"column",gap:space.control,marginBlockStart:space.field,minInlineSize:0});
export const inspectorNote=style({margin:0,color:"var(--text-muted)",fontSize:"0.875rem",lineHeight:1.6,overflowWrap:"anywhere"});
/** Metadata reads as editorial information, not a form: label column, value column, no field boxes. */
export const metaGrid=style({display:"grid",gridTemplateColumns:"auto minmax(0,1fr)",columnGap:space.group,rowGap:space.control,margin:0,alignItems:"baseline",minInlineSize:0});
export const metaLabel=style({display:"inline-flex",alignItems:"center",gap:7,color:"var(--text-muted)",fontSize:"0.8125rem"});
export const metaValue=style({margin:0,color:"var(--text-primary)",fontSize:"0.8125rem",minInlineSize:0,overflowWrap:"anywhere"});
export const inspectorLinks=style({display:"flex",flexDirection:"column",gap:space.control,minInlineSize:0});
export const inspectorLink=style({display:"flex",alignItems:"flex-start",gap:8,inlineSize:"100%",padding:`${space.control} ${space.x3}`,border:0,borderRadius:8,background:"var(--icon-background)",color:"var(--accent)",fontSize:"0.8125rem",textAlign:"left",cursor:"pointer",minInlineSize:0,overflowWrap:"anywhere",selectors:{"&:focus-visible":{outline:"2px solid var(--focus-ring)",outlineOffset:2}}});
export const inspectorLinkMeta=style({display:"block",marginBlockStart:2,color:"var(--text-muted)",fontSize:"0.75rem"});
