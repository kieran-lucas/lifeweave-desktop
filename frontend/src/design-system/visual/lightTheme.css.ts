import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Flat Matte — Light acceptance palette.
 *
 * Two visual planes only: neutral white/gray paper and one solid blue pigment. There are no tinted
 * blue-white surfaces, ambient color washes or pseudo-glass highlight colors in the light theme.
 */
export const lightValues = {
  color: {
    canvas: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceSubtle: "#F3F4F6",
    surfaceRaised: "#FFFFFF",
    surfaceSelected: "#FFFFFF",
    surfaceSelectedNav: "#2563EB",
    surfaceHover: "#F5F5F5",

    textPrimary: "#111827",
    textSecondary: "#374151",
    textTertiary: "#6B7280",
    textDisabled: "#9CA3AF",
    textOnAccent: "#FFFFFF",

    borderHairline: "#E5E7EB",
    borderStrong: "#C7CDD4",

    accent: "#2563EB",
    accentMuted: "#2563EB",
    accentSoft: "#2563EB",
    selectionEdge: "#2563EB",

    success: "#2563EB",
    warning: "#4B5563",
    danger: "#B42318",
    successSoft: "#FFFFFF",
    warningSoft: "#FFFFFF",
    dangerSoft: "#FFFFFF",

    lifeLavender: "#FFFFFF",
    lifeMint: "#FFFFFF",
    lifePeach: "#FFFFFF",
    lifeBlue: "#FFFFFF",
    lifeCream: "#FFFFFF",

    ambientContour: "transparent",
    ambientGlowPrimary: "transparent",
    ambientGlowSecondary: "transparent",
    ambientAura: "transparent",

    focusRing: "#2563EB",
    backdrop: "rgba(17, 24, 39, 0.46)",
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
    floating: "0 1px 2px rgba(17, 24, 39, 0.08)",
    modal: "0 12px 30px rgba(17, 24, 39, 0.16)",
  },

  hairline: {
    structural: "1px solid #D1D5DB",
    subtle: "1px solid #E5E7EB",
  },
};

export const lightTheme = createTheme(vars, lightValues);
