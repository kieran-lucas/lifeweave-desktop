import { globalFontFace } from "@vanilla-extract/css";
import literataLatinItalic from "@fontsource-variable/literata/files/literata-latin-wght-italic.woff2";
import literataVietnameseItalic from "@fontsource-variable/literata/files/literata-vietnamese-wght-italic.woff2";

const editorialFamily = "Literata Variable";
const latinRange = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const vietnameseRange = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";

// Italic authored text stays out of startup and loads only with the lazy editor chunk.
globalFontFace(editorialFamily, {
  src: `url(${literataLatinItalic}) format("woff2-variations")`,
  fontWeight: "200 900",
  fontStyle: "italic",
  fontDisplay: "swap",
  unicodeRange: latinRange,
});
globalFontFace(editorialFamily, {
  src: `url(${literataVietnameseItalic}) format("woff2-variations")`,
  fontWeight: "200 900",
  fontStyle: "italic",
  fontDisplay: "swap",
  unicodeRange: vietnameseRange,
});
