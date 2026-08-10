import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Celestial Anime Editorial — Light acceptance theme.
 *
 * The palette keeps dense operational content highly readable while allowing the global atmosphere
 * to be visibly present through controlled translucency. Blue is the semantic identity; indigo,
 * violet and cyan are atmospheric partners supplied by the global art layer.
 */
export const lightValues = {
  color: {
    canvas: "oklch(98.45% 0.012 253)",
    surface: "oklch(99.1% 0.012 258 / 0.86)",
    surfaceSubtle: "oklch(96.9% 0.025 261 / 0.82)",
    surfaceRaised: "oklch(100% 0 0 / 0.88)",
    surfaceSelected: "oklch(94.8% 0.055 264 / 0.90)",
    surfaceSelectedNav: "oklch(94.4% 0.063 268 / 0.94)",
    surfaceHover: "oklch(97.2% 0.028 258 / 0.88)",

    textPrimary: "oklch(23.5% 0.035 258)",
    textSecondary: "oklch(36% 0.036 260)",
    textTertiary: "oklch(48% 0.035 259)",
    textDisabled: "oklch(64% 0.025 259)",
    textOnAccent: "oklch(100% 0 0)",

    borderHairline: "oklch(90.8% 0.034 262 / 0.76)",
    borderStrong: "oklch(84.5% 0.055 264 / 0.86)",

    accent: "oklch(56% 0.245 262)",
    accentMuted: "oklch(63% 0.21 257)",
    accentSoft: "oklch(93.8% 0.058 266 / 0.90)",
    selectionEdge: "oklch(56% 0.245 262)",

    success: "oklch(56% 0.245 262)",
    warning: "oklch(57% 0.15 70)",
    danger: "oklch(51% 0.20 25)",
    successSoft: "oklch(93.8% 0.058 266 / 0.90)",
    warningSoft: "oklch(95% 0.045 78)",
    dangerSoft: "oklch(95% 0.045 25)",

    lifeLavender: "oklch(92.5% 0.075 285 / 0.88)",
    lifeMint: "oklch(94.5% 0.060 176 / 0.86)",
    lifePeach: "oklch(95% 0.055 52 / 0.84)",
    lifeBlue: "oklch(93.5% 0.075 246 / 0.88)",
    lifeCream: "oklch(96% 0.040 93 / 0.84)",

    ambientContour: "oklch(78% 0.12 252 / 0.42)",
    ambientGlowPrimary: "oklch(84% 0.15 244 / 0.48)",
    ambientGlowSecondary: "oklch(82% 0.14 292 / 0.42)",
    ambientAura: "oklch(88% 0.10 214 / 0.40)",

    focusRing: "oklch(56% 0.245 262)",
    backdrop: "oklch(24% 0.080 260 / 0.46)",
  },

  radius: {
    small: "7px",
    control: "12px",
    surface: "18px",
    floating: "24px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating:
      "0 18px 48px oklch(45% 0.11 264 / 0.13), 0 2px 12px oklch(40% 0.08 248 / 0.08)",
    modal:
      "0 34px 96px oklch(36% 0.12 266 / 0.22), 0 8px 30px oklch(50% 0.10 242 / 0.12)",
  },

  hairline: {
    structural: "1px solid oklch(90.8% 0.034 262 / 0.76)",
    subtle: "1px solid oklch(95% 0.022 262 / 0.72)",
  },
};

export const lightTheme = createTheme(vars, lightValues);
