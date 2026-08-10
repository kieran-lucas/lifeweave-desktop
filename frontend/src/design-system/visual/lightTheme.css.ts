import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Lifeweave Monochrome — Light acceptance palette.
 *
 * Absolute chroma rule: presentation uses only white, black and neutral gray. Semantic distinction
 * is carried by value, geometry, iconography, labels and border treatment rather than hue.
 */
export const lightValues = {
  color: {
    canvas: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceSubtle: "#F4F4F4",
    surfaceRaised: "#FFFFFF",
    surfaceSelected: "#F0F0F0",
    surfaceSelectedNav: "#111111",
    surfaceHover: "#F3F3F3",

    textPrimary: "#111111",
    textSecondary: "#333333",
    textTertiary: "#666666",
    textDisabled: "#9A9A9A",
    textOnAccent: "#FFFFFF",

    borderHairline: "#E3E3E3",
    borderStrong: "#BDBDBD",

    accent: "#111111",
    accentMuted: "#333333",
    accentSoft: "#F0F0F0",
    selectionEdge: "#111111",

    success: "#111111",
    warning: "#4A4A4A",
    danger: "#111111",
    successSoft: "#F4F4F4",
    warningSoft: "#F4F4F4",
    dangerSoft: "#F4F4F4",

    lifeLavender: "#FFFFFF",
    lifeMint: "#FFFFFF",
    lifePeach: "#FFFFFF",
    lifeBlue: "#FFFFFF",
    lifeCream: "#F4F4F4",

    ambientContour: "transparent",
    ambientGlowPrimary: "transparent",
    ambientGlowSecondary: "transparent",
    ambientAura: "transparent",

    focusRing: "#111111",
    backdrop: "rgba(0, 0, 0, 0.52)",
  },

  radius: {
    small: "6px",
    control: "8px",
    surface: "12px",
    floating: "14px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating: "0 1px 2px rgba(0, 0, 0, 0.10)",
    modal: "0 12px 30px rgba(0, 0, 0, 0.18)",
  },

  hairline: {
    structural: "1px solid #CFCFCF",
    subtle: "1px solid #E3E3E3",
  },
};

export const lightTheme = createTheme(vars, lightValues);
