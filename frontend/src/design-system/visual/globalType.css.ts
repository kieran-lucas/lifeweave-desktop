import { globalStyle } from "@vanilla-extract/css";

import "./theme.css";
import { family, text } from "./typography.css";

/* Dense product copy stays Segoe Variable; page identity is allowed to enter the editorial register. */
globalStyle("body", {
  fontFamily: family.uiText,
  fontSize: text.body.fontSize,
  lineHeight: text.body.lineHeight,
  fontWeight: text.body.fontWeight,
  letterSpacing: text.body.letterSpacing,
  color: "var(--text-primary)",
});

/* Celestial Anime Editorial: a top-level page title is an identity moment, not an enterprise form label. */
globalStyle("h1", {
  ...text.display,
  margin: 0,
  color: "var(--text-primary)",
  textShadow: "0 12px 34px color-mix(in srgb, var(--accent) 12%, transparent)",
});
globalStyle("h2", { ...text.objectTitle, margin: 0 });
globalStyle("h3", { ...text.sectionTitle, margin: 0 });
globalStyle("h4, h5, h6", { ...text.cardTitle, margin: 0 });

globalStyle("code, kbd, samp, pre", { fontFamily: family.mono, fontSize: text.code.fontSize });
globalStyle("pre", { lineHeight: text.code.lineHeight, margin: 0 });
globalStyle("small, figcaption", { ...text.metadata });
globalStyle("time", { fontVariantNumeric: "tabular-nums lining-nums" });

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
