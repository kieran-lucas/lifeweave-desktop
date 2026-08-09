import { globalStyle } from "@vanilla-extract/css";

// Side-effect import: assigns the visual contract to `:root` and aliases the legacy custom
// properties through it. Imported here so a single import from the shell brings up both halves of
// the design system — the palette and the type scale — in a deterministic order.
import "./theme.css";
import { family, text } from "./typography.css";

/**
 * The global type layer.
 *
 * Importing this module is what makes the type system *real*: before it, `typography.css.ts` was
 * reachable only from `prototypes/task51/`, which the production build excludes, so the scale
 * existed and no shipped surface used it. Thirty domain style files cannot each be rewritten before
 * the product looks coherent, so the base elements are set once here and every surface inherits —
 * the same one-step technique `global.css` used to move the whole application onto the v2 palette.
 *
 * Every rule below is written at **element specificity (0-0-1)**, deliberately, exactly as
 * `app/layout/layout.css.ts` does for control geometry. Any component that has already made its own
 * typographic decision still wins, so this layer raises the floor without overriding intent. As
 * surfaces migrate to explicit roles, these defaults simply stop being the thing that applies.
 */

/*
 * The document default. `Text` is the optical size Segoe UI Variable draws for 13–18px, which is
 * where nearly every string in this application sits; `Small` and `Display` are selected explicitly
 * by the roles that leave that band.
 */
globalStyle("body", {
  fontFamily: family.uiText,
  fontSize: text.body.fontSize,
  lineHeight: text.body.lineHeight,
  fontWeight: text.body.fontWeight,
  letterSpacing: text.body.letterSpacing,
  color: "var(--text-primary)",
});

/*
 * Headings take the editorial family. This is the single change that gives the product its voice:
 * a page title, an object title and a section heading stop being "bold sans at three sizes" and
 * become type that was drawn for the job.
 *
 * `margin: 0` is set with them because the browser default heading margins are a different
 * vertical rhythm from the one `app/layout/` owns, and mixing the two is what produced the
 * inconsistent section spacing the coherence pass has to fix anyway.
 */
globalStyle("h1", { ...text.pageTitle, margin: 0 });
globalStyle("h2", { ...text.objectTitle, margin: 0 });
globalStyle("h3", { ...text.sectionTitle, margin: 0 });

/*
 * h4–h6 stay in the sans. Below the section level a heading is structural rather than expressive,
 * and setting six levels of serif turns a dense settings page into a broadsheet.
 */
globalStyle("h4, h5, h6", { ...text.cardTitle, margin: 0 });

globalStyle("code, kbd, samp, pre", { fontFamily: family.mono, fontSize: text.code.fontSize });
globalStyle("pre", { lineHeight: text.code.lineHeight, margin: 0 });

/*
 * `small` and `caption` are used for metadata throughout. Routing them through the Small optical
 * size is the difference between 12px type that was scaled down and 12px type that was drawn.
 */
globalStyle("small, figcaption", { ...text.metadata });

/*
 * Times, durations and counts must not ripple. A `<time>` element is unambiguously numeric, so it
 * gets tabular figures without any surface having to remember to ask.
 */
globalStyle("time", { fontVariantNumeric: "tabular-nums lining-nums" });

/*
 * Controls inherit the document family by `font: inherit` in `global.css`, but a control's *role*
 * is not body text: it is shorter, needs more weight to hold its shape inside a filled surface, and
 * must not wrap. Set here rather than in `layout.css.ts` so type stays in the type authority.
 */
globalStyle("button, select", {
  fontFamily: text.button.fontFamily,
  fontSize: text.button.fontSize,
  fontWeight: text.button.fontWeight,
  letterSpacing: text.button.letterSpacing,
  lineHeight: text.button.lineHeight,
});

globalStyle("input, textarea", {
  fontFamily: text.body.fontFamily,
  fontSize: text.body.fontSize,
  letterSpacing: text.body.letterSpacing,
});

globalStyle("label", {
  fontFamily: text.label.fontFamily,
  fontWeight: text.label.fontWeight,
  letterSpacing: text.label.letterSpacing,
});

/*
 * Reduced motion and forced colors do not change type, so this layer has no variant. That is
 * deliberate: a typography system that behaves differently under an accessibility preference is a
 * second typography system.
 */
