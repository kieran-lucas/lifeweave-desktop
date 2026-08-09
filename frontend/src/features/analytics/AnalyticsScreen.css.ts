import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";
import { glass, glassStrong, progressBar } from "../../design-system/visual/atmosphere.css";

/*
 * Analytics owns no page width. It is a STANDARD_PAGE and consumes the shared `PageFrame`; what
 * remains here is its own section and fact-grid geometry (ADR 0044).
 */
export const eyebrow=style({margin:0,color:"var(--accent)",fontWeight:600,fontSize:"0.9375rem",letterSpacing:"-0.01em"});

/** One region for the period controls, so they read as governing the summary below them. */
/*
 * Analytics as calm evidence, not a KPI dashboard.
 *
 * The period controls become one glass module that visibly governs the summary beneath them, rather
 * than a bordered strip floating above unrelated content.
 */
export const periodControls=style([glass,{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:space.field,padding:space.x4,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
export const periodTabs=style({display:"flex",flexWrap:"wrap",gap:space.x1,minInlineSize:0});
export const periodNav=style({display:"flex",flexWrap:"wrap",gap:space.x3,alignItems:"center",minInlineSize:0});

/** Every Analytics section shares one internal rhythm. */
export const section=style({display:"flex",flexDirection:"column",gap:space.group,minInlineSize:0});

/*
 * The headline metric is the page's centrepiece: a large tabular number on its own glass module,
 * with its label beneath. Typography carries it — no chart chrome, no card grid.
 */
export const primary=style([glassStrong,{display:"flex",flexDirection:"column",gap:space.x1,margin:0,padding:`${space.x5} ${space.x5}`,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
globalStyle(`${primary} strong`,{fontSize:"clamp(2rem,5vw,3.5rem)",fontWeight:700,letterSpacing:"-0.03em",lineHeight:1.05,fontVariantNumeric:"tabular-nums",color:"var(--text-primary)"});
globalStyle(`${primary} span`,{color:"var(--text-muted)"});

/*
 * Facts step 3 → 2 → 1 against the page frame rather than the window, and `auto-fit` means the grid
 * never demands more width than it has. A fixed `repeat(3, …)` was the previous authority and could
 * not step down at all.
 */
/*
 * The facts are ONE module, not one card per number.
 *
 * A card per metric is the generic BI look the direction rules out; grouping them on a single glass
 * surface and separating them with hairlines makes them read as one analytical statement.
 */
export const facts=style([glass,{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:0,margin:0,padding:space.x4,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
globalStyle(`${facts} div`,{padding:`${space.x2} ${space.x4} ${space.x2} 0`,minInlineSize:0});
globalStyle(`${facts} dt`,{color:"var(--text-muted)",fontSize:"0.8125rem"});
globalStyle(`${facts} dd`,{margin:0,fontSize:26,fontWeight:600,letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums",color:"var(--text-primary)"});

export const categories=style([glass,{listStyle:"none",padding:space.x4,margin:0,display:"grid",gap:space.field,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
globalStyle(`${categories} li`,{minInlineSize:0});
globalStyle(`${categories} li:not(:first-child)`,{borderTop:"1px solid var(--border-subtle)",paddingTop:space.x3});
globalStyle(`${categories} progress`,{display:"block",width:"min(100%,520px)",height:6});

export const distribution=style({display:"grid",gap:3,maxInlineSize:520});
globalStyle(`${distribution} progress`,{width:"100%",height:8});

/** Tables own their horizontal scroll so the page never does. */
export const tableScroll=scrollRegion;
export const planTableWrap=scrollRegion;
export const table=style({borderCollapse:"collapse",width:"100%",textAlign:"left",fontVariantNumeric:"tabular-nums"});
export const planTable=style({borderCollapse:"collapse",width:"100%",textAlign:"left",fontVariantNumeric:"tabular-nums"});
globalStyle(`${table} th, ${table} td`,{borderTop:"1px solid var(--border-subtle)",padding:"8px 12px 8px 0",verticalAlign:"top"});
globalStyle(`${planTable} th, ${planTable} td`,{borderTop:"1px solid var(--border-subtle)",padding:"8px 12px 8px 0",verticalAlign:"top"});

/** Every `<progress>` in Analytics composes the one shared material, so none can render green. */
export const progress=progressBar;
globalStyle(`${categories} progress, ${distribution} progress`,{
  appearance:"none",WebkitAppearance:"none",border:0,borderRadius:"var(--radius-full)",overflow:"hidden",
  accentColor:"var(--accent)",background:"var(--border-subtle)",color:"var(--accent)",
});
globalStyle(`${categories} progress::-webkit-progress-bar, ${distribution} progress::-webkit-progress-bar`,{background:"var(--border-subtle)",borderRadius:"var(--radius-full)"});
globalStyle(`${categories} progress::-webkit-progress-value, ${distribution} progress::-webkit-progress-value`,{background:"var(--accent)",borderRadius:"var(--radius-full)"});

/** Analytics sections sit on the page ground; the modules above provide the material. */
export const module_=style([glass,{padding:space.x4,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
