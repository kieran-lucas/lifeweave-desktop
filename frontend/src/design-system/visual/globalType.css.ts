import { globalStyle } from "@vanilla-extract/css";

import "./theme.css";
import { duration, easing, reduced } from "./motion.css";
import { family, text } from "./typography.css";

/* Productive chrome is deterministic Be Vietnam Pro; authored reading keeps Literata. */
globalStyle("body", {
  fontFamily: family.uiText,
  fontSize: text.body.fontSize,
  lineHeight: text.body.lineHeight,
  fontWeight: text.body.fontWeight,
  letterSpacing: text.body.letterSpacing,
  color: "var(--text-primary)",
});

/* Matte Anime Painted Atlas: title character comes from type and composition, not glow. */
globalStyle("h1", {
  ...text.display,
  margin: 0,
  color: "var(--text-primary)",
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

/* Universal tactile baseline. Feature recipes may add tone, but every real button acknowledges
 * hover and press with the same bounded transform vocabulary. */
globalStyle("button", {
  transformOrigin: "center",
  transition:
    `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
    `color ${duration.state} ${easing.standard}, opacity ${duration.state} ${easing.standard}, ` +
    `transform ${duration.press} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}`,
});
/* `:where()` keeps this fallback below feature recipes that own a domain-specific transform. */
globalStyle("button:where(:not(:disabled):hover)", { transform: "translateY(-1px)" });
globalStyle("button:where(:not(:disabled):active)", { transform: "translateY(1px) scale(.975)" });
globalStyle("button", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transitionDuration: reduced.duration,
      transform: "none",
    },
  },
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
