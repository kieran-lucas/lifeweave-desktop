import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Lifeweave Monochrome — Dark palette.
 *
 * The dark mode is a true black/white inversion of the same material system. No colored accent is
 * introduced in dark mode; emphasis comes from contrast and geometry only.
 */
export const darkValues = {
  color: {
    canvas: "#0A0A0A",
    surface: "#000000",
    surfaceSubtle: "#151515",
    surfaceRaised: "#101010",
    surfaceSelected: "#1C1C1C",
    surfaceSelectedNav: "#F5F5F5",
    surfaceHover: "#181818",

    textPrimary: "#FAFAFA",
    textSecondary: "#D2D2D2",
    textTertiary: "#A3A3A3",
    textDisabled: "#6F6F6F",
    textOnAccent: "#000000",

    borderHairline: "#292929",
    borderStrong: "#484848",

    accent: "#FAFAFA",
    accentMuted: "#D2D2D2",
    accentSoft: "#1C1C1C",
    selectionEdge: "#FAFAFA",

    success: "#FAFAFA",
    warning: "#B8B8B8",
    danger: "#FAFAFA",
    successSoft: "#1C1C1C",
    warningSoft: "#1C1C1C",
    dangerSoft: "#1C1C1C",

    lifeLavender: "#101010",
    lifeMint: "#101010",
    lifePeach: "#101010",
    lifeBlue: "#101010",
    lifeCream: "#151515",

    ambientContour: "transparent",
    ambientGlowPrimary: "transparent",
    ambientGlowSecondary: "transparent",
    ambientAura: "transparent",

    focusRing: "#FAFAFA",
    backdrop: "rgba(0, 0, 0, 0.72)",
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
    floating: "0 1px 2px rgba(0, 0, 0, 0.55)",
    modal: "0 12px 30px rgba(0, 0, 0, 0.70)",
  },

  hairline: {
    structural: "1px solid #3B3B3B",
    subtle: "1px solid #292929",
  },
};

export const darkTheme = createTheme(vars, darkValues);
