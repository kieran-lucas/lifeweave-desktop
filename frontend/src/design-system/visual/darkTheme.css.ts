import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Dark theme — composed, not inverted (ADR 0045 §29), and recomposed for baseline v2.
 *
 * v1's dark theme was warm to match its warm light plane. v2's light plane is a cool near-white
 * monochrome with a saturated blue accent, so this file follows it onto the same axes:
 *
 *   - the canvas keeps the light theme's cool hue (~264) at very low lightness, so the product
 *     stays recognisably itself rather than becoming a generic dark app;
 *   - tonal separations stay small — 3 to 5 points of OKLCH lightness — because large steps read as
 *     stacked panels, which the flat composition forbids;
 *   - the accent is lifted in lightness and reduced in chroma. A 0.196-chroma blue on a dark field
 *     glows and fatigues over the long sessions this product is built for, so dark takes 0.13;
 *   - a raised surface gets *lighter* here, where in light it gets whiter and keeps no shadow;
 *   - completion is blue in both themes.
 */
export const darkTheme = createTheme(vars, {
  color: {
    canvas: "oklch(17.5% 0.008 264)",
    surface: "oklch(15.5% 0.008 264)", //  the sidebar sits *below* the canvas here, as in light
    surfaceSubtle: "oklch(19.5% 0.008 264)",
    surfaceRaised: "oklch(21.5% 0.009 264)", //  the row group and inspector
    surfaceSelected: "oklch(26% 0.035 264)",
    surfaceSelectedNav: "oklch(28% 0.04 264)",
    surfaceHover: "oklch(23% 0.012 264)",

    textPrimary: "oklch(96% 0.003 264)",
    textSecondary: "oklch(80% 0.006 264)",
    textTertiary: "oklch(67% 0.008 264)",
    textDisabled: "oklch(50% 0.008 264)",
    textOnAccent: "oklch(17.5% 0.008 264)",

    borderHairline: "oklch(26% 0.008 264)",
    borderStrong: "oklch(34% 0.012 264)",

    accent: "oklch(76% 0.13 258)",
    accentMuted: "oklch(68% 0.12 258)",
    accentSoft: "oklch(30% 0.05 264)",
    selectionEdge: "oklch(76% 0.13 258)",

    // Completion is blue in both themes.
    success: "oklch(76% 0.13 258)",
    warning: "oklch(78% 0.11 70)",
    danger: "oklch(70% 0.14 25)",
    successSoft: "oklch(30% 0.05 264)",
    warningSoft: "oklch(30% 0.045 70)",
    dangerSoft: "oklch(30% 0.05 25)",

    lifeLavender: "oklch(30% 0.045 264)",
    lifeMint: "oklch(28% 0.02 160)",
    lifePeach: "oklch(28% 0.02 60)",
    lifeBlue: "oklch(28% 0.025 264)",
    lifeCream: "oklch(28% 0.015 90)",

    // Retained, and not rendered on Today. See the light theme for why.
    ambientContour: "oklch(26% 0.015 264)",
    ambientGlowPrimary: "oklch(21% 0.015 264)",
    ambientGlowSecondary: "oklch(21% 0.012 274)",
    ambientAura: "oklch(20% 0.01 264)",

    focusRing: "oklch(80% 0.13 258)",
    backdrop: "oklch(10% 0.006 264 / 0.6)",
  },

  radius: {
    small: "4px",
    control: "8px",
    surface: "12px",
    floating: "14px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating: "0 2px 10px oklch(0% 0 0 / 0.4)",
    modal: "0 12px 40px oklch(0% 0 0 / 0.55)",
  },

  hairline: {
    structural: "1px solid oklch(26% 0.008 264)",
    subtle: "1px solid oklch(22% 0.008 264)",
  },
});
