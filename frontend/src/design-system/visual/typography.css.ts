import { globalFontFace } from "@vanilla-extract/css";

import beVietnamProLatin400 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-400-normal.woff2";
import beVietnamProLatin500 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-500-normal.woff2";
import beVietnamProLatin600 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-600-normal.woff2";
import beVietnamProLatin700 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-700-normal.woff2";
import beVietnamProVietnamese400 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-400-normal.woff2";
import beVietnamProVietnamese500 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-500-normal.woff2";
import beVietnamProVietnamese600 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-600-normal.woff2";
import beVietnamProVietnamese700 from "@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-700-normal.woff2";
import literataLatin from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2";
import literataVietnamese from "@fontsource-variable/literata/files/literata-vietnamese-wght-normal.woff2";

/**
 * Lifeweave typography.
 *
 * Be Vietnam Pro is the productive UI voice: drawn by Vietnamese designers, crisp at control sizes
 * and distinctive enough for large operational headings. Literata remains the authored long-form
 * voice. Every role below states its family, size, weight, line height and tracking, so no surface
 * invents a `fontSize` of its own.
 *
 * The former Segoe UI Variable stack depended on three Windows optical family names and therefore
 * varied with OS font registration and WebView2/DirectWrite resolution. The locally bundled
 * productive face makes Vietnamese diacritics, weight and metrics deterministic across supported
 * Windows installations while retaining Segoe UI as a no-network fallback.
 */

/**
 * Literata Variable — the one editorial family ADR 0045 Override 2 authorizes, chosen by rendered
 * comparison against five alternatives (see the ADR's selection table).
 *
 * Declared here by hand rather than by importing `@fontsource-variable/literata/wght.css`, because
 * that entrypoint bundles **seven** subsets — cyrillic, cyrillic-ext, greek, greek-ext, latin-ext,
 * latin, vietnamese — totalling 175,800 bytes. The product needs two of them. Declaring the faces
 * directly ships 63,904 bytes and saves 111,896.
 *
 * `latin-ext` is deliberately excluded: every Vietnamese codepoint lives in the `vietnamese` subset
 * (U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, the U+1EA0-1EF9
 * block and U+20AB), so dropping it costs the product nothing and saves a further 85,912 bytes.
 *
 * The italic axis is **not** loaded here. It is needed only where a user can author emphasis —
 * Reader and the editors — so it is imported by that lazy chunk instead of by startup.
 *
 * `font-display: swap` with the metric-matched Georgia fallback below: the application is
 * local-first, so these load from disk with no network transfer, and the swap window is not
 * perceptible in practice.
 */
const PRODUCTIVE = "Be Vietnam Pro";
const EDITORIAL = "Literata Variable";
const latinRange =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329," +
  "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const vietnameseRange =
  "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301," +
  "U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";

function registerProductiveFace(weight: 400 | 500 | 600 | 700, latin: string, vietnamese: string) {
  globalFontFace(PRODUCTIVE, {
    src: `url(${latin}) format("woff2")`,
    fontWeight: weight,
    fontStyle: "normal",
    fontDisplay: "swap",
    unicodeRange: latinRange,
  });
  globalFontFace(PRODUCTIVE, {
    src: `url(${vietnamese}) format("woff2")`,
    fontWeight: weight,
    fontStyle: "normal",
    fontDisplay: "swap",
    unicodeRange: vietnameseRange,
  });
}

registerProductiveFace(400, beVietnamProLatin400, beVietnamProVietnamese400);
registerProductiveFace(500, beVietnamProLatin500, beVietnamProVietnamese500);
registerProductiveFace(600, beVietnamProLatin600, beVietnamProVietnamese600);
registerProductiveFace(700, beVietnamProLatin700, beVietnamProVietnamese700);

globalFontFace(EDITORIAL, {
  src: `url(${literataLatin}) format("woff2-variations")`,
  fontWeight: "200 900",
  fontStyle: "normal",
  fontDisplay: "swap",
  unicodeRange: latinRange,
});

globalFontFace(EDITORIAL, {
  src: `url(${literataVietnamese}) format("woff2-variations")`,
  fontWeight: "200 900",
  fontStyle: "normal",
  fontDisplay: "swap",
  unicodeRange: vietnameseRange,
});

/**
 * The families.
 *
 * Productive aliases preserve semantic intent while resolving to one deterministic family. Georgia
 * is the editorial fallback because its metrics are close enough to Literata's that the swap does
 * not reflow a paragraph.
 */
export const family = {
  /** ≤ 12px — metadata, captions and chips. */
  uiSmall: `"${PRODUCTIVE}", "Segoe UI", system-ui, sans-serif`,
  /** 13–18px — body, task rows, controls, navigation. The workhorse. */
  uiText: `"${PRODUCTIVE}", "Segoe UI", system-ui, sans-serif`,
  /** > 18px — operational headings and numerals set large. */
  uiDisplay: `"${PRODUCTIVE}", "Segoe UI", system-ui, sans-serif`,
  /** Titles, headings and long-form reading. */
  editorial: `"${EDITORIAL}", Georgia, "Times New Roman", serif`,
  /** Cascadia Mono ships with Windows 11; Consolas is the older-build fallback. Both verified. */
  mono: '"Cascadia Mono", Consolas, "Courier New", monospace',
} as const;

/**
 * The roles. A surface picks a role; it never picks a size.
 *
 * Tracking tightens as size rises and opens as size falls.
 */
export const text = {
  // ── Productive display: expressive, low frequency, high impact ──────────────────────────
  /** The largest thing on any screen. Used once per surface, never twice. */
  display: {
    fontFamily: family.uiDisplay,
    fontSize: 40,
    lineHeight: "46px",
    fontWeight: 600,
    letterSpacing: "-0.021em",
  },
  /** "Today", "Calendar", "Analytics" — productive operational page identity. */
  pageTitle: {
    fontFamily: family.uiDisplay,
    fontSize: 30,
    lineHeight: "38px",
    fontWeight: 600,
    letterSpacing: "-0.018em",
  },
  /** An object's title: the inspector heading, a Plan name, a Life node. */
  objectTitle: {
    fontFamily: family.uiDisplay,
    fontSize: 23,
    lineHeight: "30px",
    fontWeight: 600,
    letterSpacing: "-0.013em",
  },
  /** A titled region inside an operational page. */
  sectionTitle: {
    fontFamily: family.uiDisplay,
    fontSize: 18,
    lineHeight: "25px",
    fontWeight: 600,
    letterSpacing: "-0.009em",
  },

  // ── Reader and editor ────────────────────────────────────────────────────────────────────
  /** Long-form body. 17/1.62 is the measure the candidate proof was judged at. */
  editorBody: {
    fontFamily: family.editorial,
    fontSize: 17,
    lineHeight: "27.5px",
    fontWeight: 400,
    letterSpacing: "0",
  },
  editorH1: {
    fontFamily: family.editorial,
    fontSize: 27,
    lineHeight: "35px",
    fontWeight: 600,
    letterSpacing: "-0.016em",
  },
  editorH2: {
    fontFamily: family.editorial,
    fontSize: 21,
    lineHeight: "29px",
    fontWeight: 600,
    letterSpacing: "-0.011em",
  },
  editorH3: {
    fontFamily: family.editorial,
    fontSize: 17.5,
    lineHeight: "25px",
    fontWeight: 600,
    letterSpacing: "-0.006em",
  },

  // ── Dense UI: high frequency, must stay quiet ────────────────────────────────────────────
  /** A card or panel heading inside dense content. Sans, not editorial — these repeat. */
  cardTitle: {
    fontFamily: family.uiText,
    fontSize: 15,
    lineHeight: "21px",
    fontWeight: 600,
    letterSpacing: "-0.006em",
  },
  /** The most-read string in the product: a task row title. */
  row: {
    fontFamily: family.uiText,
    fontSize: 14.5,
    lineHeight: "21px",
    fontWeight: 400,
    letterSpacing: "-0.002em",
  },
  body: {
    fontFamily: family.uiText,
    fontSize: 14.5,
    lineHeight: "22px",
    fontWeight: 400,
    letterSpacing: "-0.002em",
  },
  bodyStrong: {
    fontFamily: family.uiText,
    fontSize: 14.5,
    lineHeight: "22px",
    fontWeight: 600,
    letterSpacing: "-0.004em",
  },
  compactBody: {
    fontFamily: family.uiText,
    fontSize: 13.5,
    lineHeight: "20px",
    fontWeight: 400,
    letterSpacing: "-0.001em",
  },

  // ── Controls and navigation ──────────────────────────────────────────────────────────────
  button: {
    fontFamily: family.uiText,
    fontSize: 13.5,
    lineHeight: "20px",
    fontWeight: 600,
    letterSpacing: "-0.002em",
  },
  navigation: {
    fontFamily: family.uiText,
    fontSize: 13.5,
    lineHeight: "20px",
    fontWeight: 500,
    letterSpacing: "-0.001em",
  },
  tab: {
    fontFamily: family.uiText,
    fontSize: 13.5,
    lineHeight: "20px",
    fontWeight: 600,
    letterSpacing: "-0.002em",
  },
  /** A form field's label. */
  label: {
    fontFamily: family.uiSmall,
    fontSize: 12.5,
    lineHeight: "17px",
    fontWeight: 600,
    letterSpacing: "0.002em",
  },

  // ── Small type ───────────────────────────────────────────────────────────────────────────
  /** Row metadata, secondary facts. */
  metadata: {
    fontFamily: family.uiSmall,
    fontSize: 12.5,
    lineHeight: "18px",
    fontWeight: 400,
    letterSpacing: "0.003em",
  },
  caption: {
    fontFamily: family.uiSmall,
    fontSize: 11.5,
    lineHeight: "16px",
    fontWeight: 400,
    letterSpacing: "0.006em",
  },
  /**
   * The eyebrow above a section. Uppercase with open tracking — the one place letter-spacing is
   * large, because uppercase at 11px needs it to stay legible, in Vietnamese especially.
   */
  eyebrow: {
    fontFamily: family.uiSmall,
    fontSize: 11,
    lineHeight: "15px",
    fontWeight: 600,
    letterSpacing: "0.085em",
    textTransform: "uppercase",
  },

  // ── Numerals ─────────────────────────────────────────────────────────────────────────────
  /**
   * Tabular figures are not decoration. A right-aligned column of times set in proportional
   * figures visibly ripples, which is the defect these roles exist to prevent.
   */
  numeric: {
    fontFamily: family.uiSmall,
    fontSize: 12.5,
    lineHeight: "18px",
    fontWeight: 400,
    letterSpacing: "0",
    fontVariantNumeric: "tabular-nums lining-nums",
  },
  /** A headline statistic. Large, tabular, and set in Display for the finer drawing. */
  numericMetric: {
    fontFamily: family.uiDisplay,
    fontSize: 34,
    lineHeight: "40px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums lining-nums",
  },

  /** Inline and block code. */
  code: {
    fontFamily: family.mono,
    fontSize: 13,
    lineHeight: "20px",
    fontWeight: 400,
    letterSpacing: "0",
  },
} as const;
