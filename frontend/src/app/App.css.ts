import { globalStyle, style } from "@vanilla-extract/css";

import { glass, aboveAtmosphere } from "../design-system/visual/atmosphere.css";
// Side-effect import: this is what puts the type system and its one authorized @font-face into the
// production bundle. Before it, `visual/typography.css.ts` was reachable only from the excluded
// prototype entry, so the scale shipped to nothing.
import "../design-system/visual/globalType.css";
import { text } from "../design-system/visual/typography.css";
import { gutter, space } from "./layout/tokens.css";

/**
 * Application shell geometry only. Page width, page gutter, dialog width, and page-level section
 * gaps live in `layout/` (ADR 0044); nothing in this file may declare them again.
 */

/*
 * Sized in percentage terms, never viewport units. `100vw`/`100vh` include the classic scrollbar
 * gutter by definition, so before Task 50 a vertical scrollbar made the root 15 px wider than the
 * space available to it, that horizontal scrollbar shrank the available height, and the two axes
 * fed each other. Measured evidence is in `docs/audits/task-50-layout-baseline.md` §2.1.
 */
export const appRoot = style({ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", inlineSize: "100%", blockSize: "100%", overflow: "hidden", background: "transparent", selectors: { "&[data-sidebar-mode=collapsed]": { gridTemplateColumns: "68px minmax(0, 1fr)" } } });
export const sidebar = style({ display: "flex", flexDirection: "column", minWidth: 0, padding: "18px 14px", borderRight: "1px solid var(--glass-border)", background: "color-mix(in srgb, var(--sidebar-background) 82%, transparent)", position: "relative", zIndex: 1, transition: "width 160ms ease, padding 160ms ease" });
export const brand = style({ display: "flex", alignItems: "center", gap: 10, minHeight: 34, padding: "0 10px", marginBottom: 18, fontWeight: 650, fontSize: "0.9rem", letterSpacing: "-0.01em", color: "var(--text-primary)" });
/** The product mark. A filled accent disc, as in the v2 reference — not a letter in a grey tile. */
export const brandMark = style({ display: "grid", placeItems: "center", width: 24, height: 24, flexShrink: 0, borderRadius: "var(--radius-full)", background: "var(--accent)", color: "#fff" });
export const navGroup = style({ display: "grid", gap: 2 });
export const navButton = style({ display: "flex", alignItems: "center", gap: 12, minHeight: 44, width: "100%", padding: "8px 10px", border: 0, borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 500, textAlign: "left", cursor: "pointer", transition: "background-color 100ms cubic-bezier(0.2,0,0,1), color 100ms cubic-bezier(0.2,0,0,1)", selectors: { "&[aria-current=page]": { background: "var(--active-background)", color: "var(--text-primary)", fontWeight: 600 }, "&:hover": { background: "var(--active-background)" }, "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 } } });
/**
 * v2 replaces the grey letter tile with a real 20 px outline icon that takes the accent when its
 * destination is current. The tile was the single most dated element in the shell: it put a filled
 * box behind every navigation row, which is exactly the enclosure the design law removes.
 */
export const navIcon = style({ flexShrink: 0, width: 20, height: 20, color: "var(--text-muted)", selectors: { [`${navButton}[aria-current=page] &`]: { color: "var(--accent)" } } });
export const navLabel = style({ overflow: "hidden", whiteSpace: "nowrap" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${navLabel}`, { display: "none" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${brand}`, { fontSize: 0, paddingInline: 11 });
export const divider = style({ height: 1, margin: "12px 10px", background: "var(--border-subtle)" });
export const collapseButton = style({ marginTop: "auto", display: "flex", gap: 12, alignItems: "center", minHeight: 40, padding: "8px 10px", border: 0, borderTop: "1px solid var(--border-subtle)", borderRadius: 0, paddingTop: 14, background: "transparent", color: "var(--text-muted)", fontSize: "0.875rem", cursor: "pointer" });

/*
 * The one main viewport. It owns the single responsive gutter and reserves its scrollbar gutter on
 * *both* edges, so a page frame is optically centred whether or not the scrollbar is drawn.
 *
 * `stable` alone reserves the gutter on the inline-end edge only. That keeps the content box a
 * constant width — which is what stops the frame jumping as content grows — but leaves the visible
 * composition 15.2px heavier on one side, and native phase 21 measured exactly that imbalance.
 * `both-edges` costs one gutter of width and makes the equilibrium real rather than nominal.
 *
 * `position: relative` is load-bearing, not decoration. Without it the viewport is not a containing
 * block, so an absolutely positioned descendant with no positioned ancestor — every `srOnly`
 * clipping span, and there are several deep in Settings — resolves against the initial containing
 * block instead. It then escapes this element's `overflow: auto`, lands at its static offset
 * hundreds of pixels down the document, and gives the *document* a vertical scrollbar. That
 * scrollbar was the second half of the measured Settings defect: it shrank `clientWidth` by 15px,
 * which the old `100vw` root then turned into horizontal overflow.
 */
export const viewport = style({ position: "relative", zIndex: 1, minInlineSize: 0, minBlockSize: 0, overflow: "auto", scrollbarGutter: "stable both-edges", padding: gutter });

/** v2 sets every heading in the platform sans. Weight and scale carry the hierarchy, not a serif. */
export const heading = style({ margin: 0, color: "var(--text-primary)", fontSize: "clamp(1.75rem, 2.4vw, 2.125rem)", fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1.2 });
export const lede = style({ margin: 0, color: "var(--text-muted)", fontSize: "0.9375rem" });
/*
 * Settings sits at the quiet end of the art scale, but quiet is not dead: each section becomes a
 * soft material region so the page reads as composed rather than as a form dumped on a background.
 *
 * The rhythm is deliberately uneven. Rendering the section stack showed title, description and
 * controls all separated by the same `group` gap, so nothing grouped: a heading floated as far from
 * its own description as from the controls below it. Title and description are now one unit with a
 * tight gap, and the content is pushed away from both.
 */
export const settingsSection = style([glass, { display: "flex", flexDirection: "column", gap: space.x2, minInlineSize: 0, padding: space.x5, borderRadius: "var(--radius-surface)" }]);

/*
 * A settings heading is `sectionTitle`, not the global `h2` role.
 *
 * The global rule sets every `h2` to the 23px object title, which is right for the one heading that
 * names an object and wrong for six stacked settings groups — the rendered stack read as a sequence
 * of headlines rather than as a page with sections.
 */
globalStyle(`${settingsSection} > h2`, { ...text.sectionTitle, margin: 0 });
/* The description belongs to its heading, so it carries no top gap of its own. */
globalStyle(`${settingsSection} > h2 + p`, { ...text.compactBody, margin: 0, color: "var(--text-muted)", maxInlineSize: "72ch" });
/* Everything after the description is content, and content gets air. */
globalStyle(`${settingsSection} > h2 + p + *`, { marginBlockStart: space.x3 });
export const coreStatus = style({ color: "var(--text-muted)" });
export const shortcutList = style({ display: "grid", gridTemplateColumns: "1fr auto", gap: `${space.control} ${space.field}`, margin: 0, alignItems: "center" });
globalStyle(`${shortcutList} dd`, { margin: 0, justifySelf: "end" });
export const shortcutChord = style({ padding: "3px 8px", borderRadius: "var(--radius-small)", border: "1px solid var(--border-subtle)", background: "var(--icon-background)", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" });
export const dialogButton = style({ minHeight: 36, padding: "8px 14px", borderRadius: "var(--radius-control)", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", selectors: { "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 2 } } });
