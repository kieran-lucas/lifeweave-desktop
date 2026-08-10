import { style } from "@vanilla-extract/css";
import { space } from "../../../app/layout/tokens.css";
import { button, iconButton } from "../../../design-system/primitives/controls.css";
import { tab, tabList } from "../../../design-system/primitives/navigation.css";
import { text } from "../../../design-system/visual/typography.css";

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
/*
 * The inspector is glass.
 *
 * It was a bare column with a leading hairline, which read as an unfinished edge of the page rather
 * than as a detail surface — the "stiff" quality the art pass exists to remove. `glass` rather than
 * `glassStrong` because its content is shorter than the timeline's and it sits over the strongest
 * part of the aura, so a lighter tint lets the field through and makes the column feel lifted.
 *
 * Radius and padding keep it a surface rather than a floating card: it still shares the workspace
 * plane and still separates with a hairline, exactly as the v2 reference draws it.
 */
export const inspector=style({
  display:"flex",flexDirection:"column",minInlineSize:0,
  paddingBlockStart:space.field,
  borderBlockStart:"1px solid var(--border-subtle)",
  "@container":{"(min-width: 900px)":{
    paddingBlockStart:0,paddingInlineStart:space.x4,
    borderBlockStart:0,borderInlineStart:"1px solid var(--border-subtle)",
    position:"sticky",top:0,alignSelf:"start",
  }},
});
export const inspectorHeader=style({display:"flex",alignItems:"center",gap:space.control,minInlineSize:0});
export const inspectorContext=style({...text.metadata,display:"inline-flex",alignItems:"center",gap:6,marginInlineEnd:"auto",minInlineSize:0,color:"var(--text-muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"});
export const inspectorClose=style([iconButton,{inlineSize:28,blockSize:28,minBlockSize:0,color:"var(--text-muted)"}]);
/** Sans, semibold — v2 removed the editorial serif from object titles. */
export const inspectorTitle=style({...text.objectTitle,margin:`${space.x3} 0 0`,color:"var(--text-primary)",overflowWrap:"anywhere"});
export const inspectorTabs=style([tabList,{flexWrap:"wrap",gap:space.x2,marginBlockStart:space.field}]);
export const inspectorTab=style([tab,{display:"inline-flex",alignItems:"center",gap:5}]);
export const inspectorTabCount=style({...text.caption,color:"var(--text-muted)"});
export const inspectorBody=style({display:"flex",flexDirection:"column",gap:space.control,marginBlockStart:space.field,minInlineSize:0});
export const inspectorNote=style({...text.body,margin:0,color:"var(--text-muted)",lineHeight:1.6,overflowWrap:"anywhere"});
/** Metadata reads as editorial information, not a form: label column, value column, no field boxes. */
export const metaGrid=style({display:"grid",gridTemplateColumns:"auto minmax(0,1fr)",columnGap:space.group,rowGap:space.control,margin:0,alignItems:"baseline",minInlineSize:0});
export const metaLabel=style({...text.metadata,display:"inline-flex",alignItems:"center",gap:7,color:"var(--text-muted)"});
export const metaValue=style({...text.metadata,margin:0,color:"var(--text-primary)",minInlineSize:0,overflowWrap:"anywhere",fontVariantNumeric:"tabular-nums lining-nums"});
export const inspectorLinks=style({display:"flex",flexDirection:"column",gap:space.control,minInlineSize:0});
export const inspectorLink=style([button.ghost,{justifyContent:"flex-start",alignItems:"flex-start",inlineSize:"100%",whiteSpace:"normal",textAlign:"left",color:"var(--accent)",minInlineSize:0,overflowWrap:"anywhere"}]);
export const inspectorLinkMeta=style({...text.caption,display:"block",marginBlockStart:2,color:"var(--text-muted)"});
