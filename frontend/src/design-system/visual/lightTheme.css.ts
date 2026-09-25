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
    surface: "#FAFAFB",
    surfaceSubtle: "#F6F7F8",
    surfaceRaised: "#FFFFFF",
    surfaceSelected: "#EAF3FF",
    surfaceSelectedNeutral: "#E5E7EA",
    surfaceSelectedNav: "#E9F2FF",
    surfaceHover: "#F3F4F6",

    textPrimary: "#222934",
    textSecondary: "#4B5564",
    textTertiary: "#657184",
    textDisabled: "#9BA5B3",
    textOnAccent: "#FFFFFF",

    borderHairline: "#E2E5E9",
    borderStrong: "#C9CED5",

    accent: "#326FD3",
    accentMuted: "#245BC0",
    accentSoft: "#E9F3FF",
    selectionEdge: "#3475DB",

    success: "#267553",
    warning: "#926222",
    danger: "#B34B55",
    successSoft: "#ECF7F1",
    warningSoft: "#FFF5E8",
    dangerSoft: "#FFF0F1",

    lifeLavender: "#F5F4FF",
    lifeMint: "#F0F8F5",
    lifePeach: "#FFF6F2",
    lifeBlue: "#F0F6FE",
    lifeCream: "#FBF9F2",

    ambientContour: "rgba(80, 125, 190, 0.07)",
    ambientGlowPrimary: "rgba(125, 180, 255, 0.10)",
    ambientGlowSecondary: "rgba(140, 175, 230, 0.07)",
    ambientAura: "rgba(145, 190, 255, 0.055)",

    focusRing: "#3475DB",
    backdrop: "rgba(33, 45, 65, 0.30)",
  },

  radius: {
    small: "9px",
    control: "11px",
    surface: "18px",
    floating: "20px",
    full: "999px",
  },

  elevation: {
    none: "none",
    floating: "0 10px 28px rgba(31, 48, 75, .10), 0 2px 6px rgba(31, 48, 75, .055)",
    modal: "0 26px 72px rgba(31, 48, 75, .17), 0 7px 20px rgba(31, 48, 75, .08)",
  },

  assessmentCircle: {
    none: "#5B6472",
    low: "#B88700",
    done: "#178248",
    great: "#1976B8",
  },

  hairline: {
    structural: "1px solid #C9CED5",
    subtle: "1px solid #E2E5E9",
  },
};

export const lightTheme = createTheme(vars, lightValues);
