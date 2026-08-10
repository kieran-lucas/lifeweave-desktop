import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Lifeweave Luminous Editorial — light acceptance palette.
 *
 * The product stays unmistakably a desktop productivity tool, but its identity now comes from
 * atmospheric sky-blue light, restrained violet/rose refraction, deep ink typography and tactile
 * translucent surfaces. Saturated colour is concentrated in interaction and authored atmosphere;
 * content still has a quiet, high-contrast reading plane.
 */
export const lightValues = {
  color: {
    canvas: "#F7FAFF",
    surface: "#FBFDFF",
    surfaceSubtle: "#EEF4FC",
    surfaceRaised: "#FFFFFF",
    surfaceSelected: "#E8EFFF",
    surfaceSelectedNav: "#E4ECFF",
    surfaceHover: "#F0F5FF",

    textPrimary: "#17233F",
    textSecondary: "#32415F",
    textTertiary: "#687794",
    textDisabled: "#9AA8BE",
    textOnAccent: "#FFFFFF",

    borderHairline: "#DCE6F3",
    borderStrong: "#BAC8DD",

    accent: "#4E6FFF",
    accentMuted: "#3658D9",
    accentSoft: "#E7EDFF",
    selectionEdge: "#5A76FF",

    success: "#16866F",
    warning: "#B46A1B",
    danger: "#D94E72",
    successSoft: "#E8F7F3",
    warningSoft: "#FFF4E5",
    dangerSoft: "#FFF0F4",

    lifeLavender: "#F0ECFF",
    lifeMint: "#E8F9F4",
    lifePeach: "#FFF0EA",
    lifeBlue: "#E9F2FF",
    lifeCream: "#FFF8E8",

    ambientContour: "rgba(82, 111, 224, 0.16)",
    ambientGlowPrimary: "rgba(79, 124, 255, 0.28)",
    ambientGlowSecondary: "rgba(163, 112, 255, 0.20)",
    ambientAura: "rgba(90, 196, 255, 0.18)",

    focusRing: "#315FFF",
    backdrop: "rgba(17, 29, 57, 0.54)",
  },

  radius: {
    small: "8px",
    control: "11px",
    surface: "18px",
    floating: "22px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating: "0 16px 42px rgba(50, 71, 118, 0.11), 0 2px 8px rgba(50, 71, 118, 0.06)",
    modal: "0 30px 90px rgba(32, 46, 85, 0.22), 0 8px 24px rgba(32, 46, 85, 0.12)",
  },

  hairline: {
    structural: "1px solid #BFCDE0",
    subtle: "1px solid #DCE6F3",
  },
};

export const lightTheme = createTheme(vars, lightValues);
