import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Lifeweave light palette with one blue interaction accent.
 *
 * Product structure, typography, density and motion carry identity. Blue is reserved for interactive
 * emphasis, while neutral gray owns hierarchy and semantic warning/error colours retain their meaning.
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

    accent: "#2563EB",
    accentMuted: "#1D4ED8",
    accentSoft: "#EAF1FF",
    selectionEdge: "#2563EB",

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

    focusRing: "#2563EB",
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

  assessmentCircle: {
    none: "#5B6472",
    low: "#B88700",
    done: "#178248",
    great: "#1976B8",
  },

  hairline: {
    structural: "1px solid #CFCFCF",
    subtle: "1px solid #E2E2E2",
  },
};

export const lightTheme = createTheme(vars, lightValues);
