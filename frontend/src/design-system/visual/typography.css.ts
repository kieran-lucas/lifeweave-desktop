import { globalFontFace } from "@vanilla-extract/css";

/*
 * Literata Variable, self-hosted (ADR 0045 §27). Three subsets are declared and the other four the
 * package ships — cyrillic, cyrillic-ext, greek, greek-ext — are deliberately not imported, because
 * Lifeweave's supported languages do not need them and they would add roughly 200 KB of font assets
 * for glyphs that will never be drawn.
 *
 *   latin        52,496 bytes
 *   latin-ext    42,656 bytes
 *   vietnamese   11,408 bytes
 *
 * Vietnamese is imported deliberately: it is a first-class requirement in
 * `docs/ACCESSIBILITY_AND_INPUT.md`, and Literata's Vietnamese subset carries the stacked diacritics
 * that a latin-only subset renders as fallback glyphs at a visibly different weight.
 *
 * The URLs resolve through Vite to bundled local assets, so the CSP's `font-src 'self'` holds and
 * `scripts/verify_no_remote_assets.py` sees no remote reference. `font-display: swap` is chosen over
 * `optional` because the editorial face is used for a handful of large headings where a late swap is
 * far less disruptive than silently rendering the whole product in the fallback.
 */
import latin from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2";
import latinExt from "@fontsource-variable/literata/files/literata-latin-ext-wght-normal.woff2";
import vietnamese from "@fontsource-variable/literata/files/literata-vietnamese-wght-normal.woff2";

const face = { fontStyle: "normal", fontDisplay: "swap", fontWeight: "200 900" } as const;

globalFontFace("Literata Variable", {
  ...face,
  src: `url(${latin}) format("woff2-variations")`,
  unicodeRange:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
});
globalFontFace("Literata Variable", {
  ...face,
  src: `url(${latinExt}) format("woff2-variations")`,
  unicodeRange:
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
});
globalFontFace("Literata Variable", {
  ...face,
  src: `url(${vietnamese}) format("woff2-variations")`,
  unicodeRange:
    "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
});

/**
 * Two families with strictly separated jobs (ADR 0045 §6).
 *
 * `ui` is the platform font and is never replaced: Segoe UI Variable is present on the supported
 * Windows versions, carries its own optical sizing, and may not be redistributed — so it is used,
 * not shipped.
 *
 * `editorial` is Literata and is used **only** for the Today title, the inspector object title,
 * Reader and document titles, and important Life/Narrative headings. It is never used for dense
 * controls, metadata, task rows or forms, where a serif costs legibility at 12–14 px.
 */
export const family = {
  ui: '"Segoe UI Variable", "Segoe UI", Inter, system-ui, sans-serif',
  editorial: '"Literata Variable", Georgia, "Times New Roman", serif',
} as const;

/**
 * The scale, measured from the reference image rather than chosen. Each entry records what it is
 * for, because a scale without roles becomes a second set of arbitrary numbers.
 */
export const text = {
  /** Today's page title. Editorial, the largest thing on the screen. */
  pageTitle: { fontFamily: family.editorial, fontSize: 40, lineHeight: "48px", fontWeight: 500, letterSpacing: "-0.015em" },
  /** The date beneath it, in accent tone. */
  pageDate: { fontFamily: family.ui, fontSize: 19, lineHeight: "26px", fontWeight: 600, letterSpacing: "-0.005em" },
  /** "12 tasks · 3 focus blocks". Quiet, factual. */
  pageSummary: { fontFamily: family.ui, fontSize: 13.5, lineHeight: "20px", fontWeight: 400 },

  /** The inspector's object title. Editorial, one step down from the page title. */
  objectTitle: { fontFamily: family.editorial, fontSize: 26, lineHeight: "34px", fontWeight: 500, letterSpacing: "-0.01em" },

  /** "Morning", "Afternoon", "Evening". */
  sectionHeading: { fontFamily: family.ui, fontSize: 14.5, lineHeight: "20px", fontWeight: 600 },
  /** The period's time range beside the heading. */
  sectionMeta: { fontFamily: family.ui, fontSize: 13, lineHeight: "20px", fontWeight: 400, fontVariantNumeric: "tabular-nums" },

  /** A task row's title. The single most-read string in the product. */
  row: { fontFamily: family.ui, fontSize: 14.5, lineHeight: "20px", fontWeight: 400 },
  /** Reading text in the inspector note. */
  body: { fontFamily: family.ui, fontSize: 14.5, lineHeight: "24px", fontWeight: 400 },
  /** Sidebar destinations, tab labels, buttons. */
  control: { fontFamily: family.ui, fontSize: 14, lineHeight: "20px", fontWeight: 500 },
  /** Metadata labels and values. Never smaller than this — see the contrast note on textTertiary. */
  meta: { fontFamily: family.ui, fontSize: 13, lineHeight: "18px", fontWeight: 400 },
  /** Counts and badges. */
  micro: { fontFamily: family.ui, fontSize: 11.5, lineHeight: "16px", fontWeight: 600 },

  /**
   * Times and durations. Tabular figures are not decoration here: a right-aligned column of times
   * with proportional figures visibly ripples, which is the defect this role exists to prevent.
   */
  numeric: { fontFamily: family.ui, fontSize: 13, lineHeight: "20px", fontWeight: 400, fontVariantNumeric: "tabular-nums" },
} as const;
