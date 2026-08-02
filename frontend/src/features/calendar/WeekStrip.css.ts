import { style } from "@vanilla-extract/css";
export const root=style({display:"grid",gridTemplateColumns:"40px minmax(0,1fr) 40px",gap:8});
export const days=style({display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:4});
export const move=style({border:"1px solid var(--border-subtle)",borderRadius:10,background:"var(--surface)",color:"var(--text-primary)",cursor:"pointer",selectors:{"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:2}}});
export const day=style({minWidth:0,minHeight:58,display:"grid",placeContent:"center",gap:2,border:"1px solid transparent",borderRadius:10,background:"transparent",color:"var(--text-muted)",cursor:"pointer",selectors:{"&[aria-pressed=true]":{background:"var(--active-background)",color:"var(--text-primary)",borderColor:"var(--accent)"},"&[aria-current=date]":{textDecoration:"underline",textUnderlineOffset:3},"&:focus-visible":{outline:"3px solid var(--focus-ring)",outlineOffset:1}}});
