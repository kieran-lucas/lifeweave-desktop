import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { scrollRegion } from "../../app/layout/layout.css";
import { glass, glassStrong, progressBar } from "../../design-system/visual/atmosphere.css";
import { text } from "../../design-system/visual/typography.css";

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
export const periodControls=style([glass,{display:"flex",inlineSize:"fit-content",maxInlineSize:"100%",flexWrap:"wrap",alignItems:"center",justifyContent:"flex-start",gap:space.field,padding:space.x4,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
export const periodTabs=style({display:"flex",flexWrap:"wrap",gap:space.x1,minInlineSize:0});
/*
 * The period navigation used to be pushed to the far edge of a full-width module, leaving a void
 * between the Week/Month/Year tabs and it — a toolbar strip stretched for no semantic reason, which
 * ADR 0045 section 3 rules out. It now sits beside the tabs and the module stops where its content
 * stops.
 */
export const periodNav=style({display:"flex",flexWrap:"wrap",gap:space.x3,alignItems:"center",minInlineSize:0});

/** Every Analytics section shares one internal rhythm. */
export const section=style({display:"flex",flexDirection:"column",gap:space.group,minInlineSize:0});

/*
 * The headline metric is the page's centrepiece: a large tabular number on its own glass module,
 * with its label beneath. Typography carries it — no chart chrome, no card grid.
 */
/*
 * Rendered against the real surface, the headline sat alone on a 1440px-wide module with the number
 * left-aligned and the rest of the card empty — the dead card the adversarial review exists to
 * catch. It is no longer a module of its own: it is the lead of the facts block below it, so the
 * headline and the numbers that qualify it read as one analytical statement instead of two stacked
 * rectangles.
 *
 * `fit-content` stops the module spanning the frame just because it can. A statement should be as
 * wide as it needs to be.
 */
export const primary=style({display:"flex",flexDirection:"column",gap:space.x1,margin:0,minInlineSize:0});
/* The measured numeric role, rather than a viewport-scaled clamp that ignored the type system. */
globalStyle(`${primary} strong`,{...text.numericMetric,color:"var(--text-primary)"});
globalStyle(`${primary} span`,{...text.metadata,color:"var(--text-muted)"});

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
/*
 * One glass surface carrying the headline and its facts. The headline spans every column so the
 * facts sit beneath it as qualifiers rather than beside it as peers, and a hairline separates the
 * two registers without introducing a second box.
 */
export const summary=style([glass,{display:"flex",flexDirection:"column",margin:0,padding:space.x4,borderRadius:"var(--radius-surface)",minInlineSize:0}]);
/* The facts grid, unboxed, because the surface around it is already the box. */
export const summaryFacts=style({display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:0,margin:0,minInlineSize:0,paddingBlockStart:space.x3,marginBlockStart:space.x3,borderBlockStart:"1px solid var(--border-subtle)"});
globalStyle(`${facts} div, ${summaryFacts} div`,{padding:`${space.x2} ${space.x4} ${space.x2} 0`,minInlineSize:0});
globalStyle(`${facts} dt, ${summaryFacts} dt`,{color:"var(--text-muted)",fontSize:"0.8125rem"});
globalStyle(`${facts} dd, ${summaryFacts} dd`,{margin:0,fontSize:26,fontWeight:600,letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums",color:"var(--text-primary)"});

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
