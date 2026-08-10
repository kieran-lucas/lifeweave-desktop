import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Matte Anime Painted Atlas — Light acceptance palette.
 *
 * Opaque tonal planes replace the previous glass/translucent interpretation. Color should read as
 * pigment on paper/painted board: calm in large areas, concentrated in selection and identity.
 */
export const lightValues = {
  color: {
    canvas: "oklch(97.7% 0.018 92)",
    surface: "oklch(98.8% 0.014 94)",
    surfaceSubtle: "oklch(95.9% 0.028 88)",
    surfaceRaised: "oklch(99.45% 0.010 96)",
    surfaceSelected: "oklch(92.8% 0.065 260)",
    surfaceSelectedNav: "oklch(90.8% 0.082 264)",
    surfaceHover: "oklch(95.2% 0.036 255)",

    textPrimary: "oklch(24% 0.032 257)",
    textSecondary: "oklch(37% 0.034 258)",
    textTertiary: "oklch(50% 0.031 258)",
    textDisabled: "oklch(66% 0.022 258)",
    textOnAccent: "oklch(99.6% 0.006 248)",

    borderHairline: "oklch(86.8% 0.036 90)",
    borderStrong: "oklch(78.5% 0.055 258)",

    accent: "oklch(54.5% 0.232 260)",
    accentMuted: "oklch(62% 0.18 257)",
    accentSoft: "oklch(91.8% 0.070 262)",
    selectionEdge: "oklch(54.5% 0.232 260)",

    success: "oklch(54.5% 0.232 260)",
    warning: "oklch(57% 0.15 70)",
    danger: "oklch(51% 0.20 25)",
    successSoft: "oklch(91.8% 0.070 262)",
    warningSoft: "oklch(95% 0.045 78)",
    dangerSoft: "oklch(95% 0.045 25)",

    lifeLavender: "oklch(91.8% 0.070 285)",
    lifeMint: "oklch(93.4% 0.056 176)",
    lifePeach: "oklch(94.1% 0.054 52)",
    lifeBlue: "oklch(92% 0.072 246)",
    lifeCream: "oklch(95.2% 0.043 93)",

    ambientContour: "oklch(72% 0.095 250 / 0.42)",
    ambientGlowPrimary: "oklch(82% 0.105 242 / 0.34)",
    ambientGlowSecondary: "oklch(83% 0.090 292 / 0.26)",
    ambientAura: "oklch(88% 0.070 214 / 0.24)",

    focusRing: "oklch(54.5% 0.232 260)",
    backdrop: "oklch(25% 0.055 260 / 0.42)",
  },

  radius: {
    small: "6px",
    control: "9px",
    surface: "14px",
    floating: "18px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating:
      "0 12px 28px oklch(34% 0.05 260 / 0.11), 0 2px 6px oklch(30% 0.03 90 / 0.08)",
    modal:
      "0 22px 56px oklch(30% 0.065 260 / 0.18), 0 6px 18px oklch(30% 0.03 90 / 0.10)",
  },

  hairline: {
    structural: "1px solid oklch(86.8% 0.036 90)",
    subtle: "1px solid oklch(92.7% 0.026 92)",
  },
};

export const lightTheme = createTheme(vars, lightValues);
