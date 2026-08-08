import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Dark theme — composed, not inverted (ADR 0045 §29).
 *
 * Inverting the light theme would produce a cold near-white-on-black sheet and would flip the
 * elevation logic upside down, because in dark compositions a raised surface gets *lighter* while
 * in light compositions it stays the same and gains a shadow. So this file re-derives every role
 * against the same axes:
 *
 *   - the canvas keeps the light theme's warm hue (67.8) at very low lightness, so the product
 *     stays recognisably Lifeweave rather than becoming a generic dark app;
 *   - tonal separations are small — 4 to 5 points of OKLCH lightness — because large steps read as
 *     stacked panels, which is exactly what the continuous-surface law forbids;
 *   - the blue-violet family is lifted in lightness and *reduced* in chroma, because a saturated
 *     accent on a dark field glows and fatigues over the long sessions this product is built for;
 *   - hairlines stay visible but quiet, at a lightness step rather than a colour change;
 *   - art intensity stays below content, as in light.
 */
export const darkTheme = createTheme(vars, {
  color: {
    canvas: "oklch(17.5% 0.004 67.8)",
    surface: "oklch(21% 0.004 67.8)",
    surfaceSubtle: "oklch(19.5% 0.004 67.8)",
    // Raised surfaces gain lightness here, where in light they gain a shadow.
    surfaceRaised: "oklch(25% 0.005 67.8)",
    surfaceSelected: "oklch(26% 0.018 273)",
    // The light theme separates nav selection from task selection by making nav *darker*. On a dark
    // canvas the equivalent separation runs the other way: nav selection is one step lighter.
    surfaceSelectedNav: "oklch(28.5% 0.022 273)",
    surfaceHover: "oklch(23.5% 0.008 273)",

    textPrimary: "oklch(95% 0.003 67.8)",
    textSecondary: "oklch(79% 0.004 67.8)",
    textTertiary: "oklch(66% 0.004 67.8)",
    textDisabled: "oklch(48% 0.004 67.8)",
    textOnAccent: "oklch(17.5% 0.004 67.8)",

    borderHairline: "oklch(28% 0.006 273)",
    borderStrong: "oklch(52% 0.03 273)",

    // Lifted and de-chromed relative to light: 47.79%/0.118 becomes 76%/0.075.
    accent: "oklch(76% 0.075 273)",
    accentMuted: "oklch(66% 0.06 273)",
    accentSoft: "oklch(32% 0.035 273)",
    selectionEdge: "oklch(66% 0.06 273)",

    success: "oklch(74% 0.08 150)",
    warning: "oklch(76% 0.09 50)",
    danger: "oklch(70% 0.13 27)",
    successSoft: "oklch(30% 0.035 150)",
    warningSoft: "oklch(31% 0.04 50)",
    dangerSoft: "oklch(30% 0.05 27)",

    lifeLavender: "oklch(34% 0.04 290)",
    lifeMint: "oklch(33% 0.035 155)",
    lifePeach: "oklch(34% 0.04 50)",
    lifeBlue: "oklch(33% 0.04 273)",
    lifeCream: "oklch(33% 0.025 85)",

    /*
     * The same light-blue direction, re-derived for a dark field. Hue is held at 238 so the art
     * keeps its identity, but chroma is raised while lightness drops: on a near-black canvas a
     * low-chroma blue disappears entirely, and a high-lightness one glows. These land ~1.3:1 above
     * the canvas — visible as atmosphere, never as a surface.
     */
    ambientContour: "oklch(32% 0.05 238)",
    ambientGlowPrimary: "oklch(27% 0.055 238)",
    ambientGlowSecondary: "oklch(26% 0.04 268)",

    focusRing: "oklch(80% 0.09 273)",
    backdrop: "oklch(10% 0.004 67.8 / 0.6)",
  },

  // Geometry-adjacent appearance values are identical across themes by design: a radius is not a
  // property of the lighting.
  radius: {
    small: "4px",
    control: "8px",
    surface: "12px",
    floating: "16px",
    full: "999px",
  },

  /*
   * Shadows barely register on a dark canvas, so the two visible steps carry a small amount of
   * their separation as a lighter surface (above) and use shadow only to detach a floating element
   * from what is behind it.
   */
  elevation: {
    none: "none",
    floating: "0 4px 16px oklch(0% 0 0 / 0.4)",
    modal: "0 16px 48px oklch(0% 0 0 / 0.55)",
  },

  hairline: {
    structural: "1px solid oklch(28% 0.006 273)",
    subtle: "1px solid oklch(23% 0.005 67.8)",
  },
});
