import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Lifeweave light-only monochrome palette.
 *
 * Product structure, typography, density and motion carry identity. Shared primitives never inject
 * chroma into a feature surface: white stays white, ink stays ink, and neutral gray owns hierarchy.
 * Feature-specific layouts may use texture and depth, but not coloured wash, glow or glass tint.
 */
export const lightValues = {
  color: {
    canvas: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceSubtle: "#F6F6F4",
    surfaceRaised: "#FFFFFF",
    surfaceSelected: "#111111",
    surfaceSelectedNav: "#111111",
    surfaceHover: "#F2F2F0",

    textPrimary: "#111111",
    textSecondary: "#3D3D3D",
    textTertiary: "#777777",
    textDisabled: "#AAAAAA",
    textOnAccent: "#FFFFFF",

    borderHairline: "#E2E2E2",
    borderStrong: "#C8C8C8",

    accent: "#111111",
    accentMuted: "#333333",
    accentSoft: "#F1F1F1",
    selectionEdge: "#111111",

    success: "#111111",
    warning: "#444444",
    danger: "#111111",
    successSoft: "#F2F2F2",
    warningSoft: "#F4F4F4",
    dangerSoft: "#EEEEEE",

    lifeLavender: "#F7F7F7",
    lifeMint: "#F5F5F5",
    lifePeach: "#F3F3F3",
    lifeBlue: "#F1F1F1",
    lifeCream: "#F8F8F6",

    ambientContour: "rgba(17, 17, 17, 0.08)",
    ambientGlowPrimary: "rgba(17, 17, 17, 0.04)",
    ambientGlowSecondary: "rgba(17, 17, 17, 0.03)",
    ambientAura: "rgba(17, 17, 17, 0.025)",

    focusRing: "#111111",
    backdrop: "rgba(0, 0, 0, 0.42)",
  },

  radius: {
    small: "8px",
    control: "10px",
    surface: "16px",
    floating: "18px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating: "0 12px 32px rgba(0, 0, 0, 0.10), 0 2px 7px rgba(0, 0, 0, 0.05)",
    modal: "0 26px 72px rgba(0, 0, 0, 0.20), 0 7px 20px rgba(0, 0, 0, 0.09)",
  },

  assessmentOrb: {
    none: "radial-gradient(circle at 31% 25%, oklch(1 0 0) 0 14%, oklch(.88 .01 255) 33%, oklch(.62 .025 255) 72%, oklch(.42 .025 255) 100%)",
    low: "radial-gradient(circle at 31% 25%, oklch(.98 .04 90) 0 14%, oklch(.79 .15 75) 34%, oklch(.58 .16 55) 73%, oklch(.39 .10 45) 100%)",
    done: "radial-gradient(circle at 31% 25%, oklch(.98 .02 240) 0 14%, oklch(.73 .15 245) 34%, oklch(.55 .19 255) 73%, oklch(.36 .15 260) 100%)",
    great: "radial-gradient(circle at 31% 25%, oklch(.98 .025 300) 0 14%, oklch(.72 .17 295) 34%, oklch(.54 .21 292) 73%, oklch(.34 .16 292) 100%)",
  },

  hairline: {
    structural: "1px solid #CFCFCF",
    subtle: "1px solid #E2E2E2",
  },
};

export const lightTheme = createTheme(vars, lightValues);
