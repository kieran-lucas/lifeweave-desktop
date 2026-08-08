/**
 * Lifeweave typography, measured from baseline v2.
 *
 * **The editorial serif is gone.** Baseline v1 used Literata for the Today title, the inspector
 * object title and reading surfaces. Baseline v2 sets every one of those in the UI sans — the
 * "Today" heading, "Deep work: Lifeweave project", the section names and the metadata are all one
 * family at different weights. The brief makes v2 the source of truth and forbids adding detail the
 * image does not contain, so this file no longer declares or loads Literata.
 *
 * Consequence for the dependency set: `@fontsource-variable/literata` is now **unused**, and with
 * it the 106,560 bytes of woff2 subsets that were being emitted. It is left installed rather than
 * removed unilaterally, because dropping an editorial face is a Product Owner decision about
 * Reader and Narrative as much as about Today — it is raised in the change report, not decided
 * here.
 */

/**
 * One family, used everywhere. Segoe UI Variable is the platform font on the supported Windows
 * versions, carries its own optical sizing, and may not be redistributed — so it is used, not
 * shipped.
 */
export const family = {
  ui: '"Segoe UI Variable", "Segoe UI", Inter, system-ui, sans-serif',
} as const;

/**
 * The scale, measured from the reference. Weight now does the work the serif used to do: the page
 * title is large and bold rather than large and editorial, which is what makes v2 read as a
 * productivity tool rather than a document.
 */
export const text = {
  /** "Today". Large, bold, tight — the single strongest element on the screen. */
  pageTitle: {
    fontFamily: family.ui,
    fontSize: 34,
    lineHeight: "42px",
    fontWeight: 700,
    letterSpacing: "-0.022em",
  },
  /** The date beneath it, in accent blue. */
  pageDate: {
    fontFamily: family.ui,
    fontSize: 17,
    lineHeight: "24px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  /** "12 tasks · 3 focus blocks". */
  pageSummary: { fontFamily: family.ui, fontSize: 13, lineHeight: "20px", fontWeight: 400 },

  /** The inspector's object title. Sans, semibold — not a serif, and not as heavy as the page. */
  objectTitle: {
    fontFamily: family.ui,
    fontSize: 24,
    lineHeight: "32px",
    fontWeight: 600,
    letterSpacing: "-0.018em",
  },

  /** "Morning", "Afternoon", "Evening". */
  sectionHeading: { fontFamily: family.ui, fontSize: 14, lineHeight: "20px", fontWeight: 600 },
  sectionMeta: {
    fontFamily: family.ui,
    fontSize: 12.5,
    lineHeight: "20px",
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
  },

  /** A task row's title — the most-read string in the product. */
  row: { fontFamily: family.ui, fontSize: 14, lineHeight: "20px", fontWeight: 400 },
  body: { fontFamily: family.ui, fontSize: 14, lineHeight: "23px", fontWeight: 400 },
  control: { fontFamily: family.ui, fontSize: 13.5, lineHeight: "20px", fontWeight: 500 },
  meta: { fontFamily: family.ui, fontSize: 12.5, lineHeight: "18px", fontWeight: 400 },
  micro: { fontFamily: family.ui, fontSize: 11, lineHeight: "16px", fontWeight: 600 },

  /**
   * Times and durations. Tabular figures are not decoration: a right-aligned column of times set in
   * proportional figures visibly ripples, which is the defect this role exists to prevent.
   */
  numeric: {
    fontFamily: family.ui,
    fontSize: 12.5,
    lineHeight: "20px",
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
  },
} as const;
