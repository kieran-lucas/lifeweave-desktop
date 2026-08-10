import { createThemeContract } from "@vanilla-extract/css";

/**
 * The Lifeweave visual token contract.
 *
 * This file answers "what semantic colour, radius, elevation or line role is this?" without
 * allowing feature styles to depend on one historical palette. It is deliberately **separate**
 * from `app/layout/tokens.css.ts`, which owns geometry: visual tokens describe presentation roles,
 * while layout tokens describe spatial structure.
 *
 * A contract rather than a theme: every role below is `null` here and must be supplied by every
 * concrete theme, so a missing role is a type error at build time rather than a silent fallback.
 * The contract is a safety mechanism, not an art-direction freeze; concrete values may evolve with
 * the current Product Owner direction.
 */
export const vars = createThemeContract({
  color: {
    /** The continuous plane everything else sits on. */
    canvas: null,
    /** A region that is part of the plane but tonally separated — for example a rail or inspector. */
    surface: null,
    /** One step quieter than `surface`, for zoning inside a region. */
    surfaceSubtle: null,
    /** A surface that genuinely floats: menu, popover, dialog, or authored glass plane. */
    surfaceRaised: null,
    /** Tonal selection fill. See `selectionEdge` — this may never be the sole state signal. */
    surfaceSelected: null,
    /** Navigation selection may use a distinct tint from content selection. */
    surfaceSelectedNav: null,
    surfaceHover: null,

    textPrimary: null,
    textSecondary: null,
    /** Metadata and secondary information; concrete themes must preserve readable contrast. */
    textTertiary: null,
    textDisabled: null,
    /** Text placed on `accent` fills. */
    textOnAccent: null,

    /** The ordinary structural line. Low contrast by intent. */
    borderHairline: null,
    /** A boundary that must be perceivable on its own. */
    borderStrong: null,

    accent: null,
    accentMuted: null,
    accentSoft: null,
    /** Companion signal for selection, so fill alone never carries state. */
    selectionEdge: null,

    /** Status text tones. */
    success: null,
    warning: null,
    danger: null,
    /** Status fill tones, for chips and washes. Never used as the only state signal. */
    successSoft: null,
    warningSoft: null,
    dangerSoft: null,

    /** Life / Narrative authored fill tones. */
    lifeLavender: null,
    lifeMint: null,
    lifePeach: null,
    lifeBlue: null,
    lifeCream: null,

    /**
     * Ambient art roles for the Luminous Editorial visual world.
     *
     * These are semantic spectral-light roles, not a ban on expressive presentation. Current
     * surfaces may combine them with CSS/SVG procedural art, glass/refraction, gradients and
     * bounded motion while preserving content legibility and reduced-motion/forced-colors paths.
     * `primary` carries the dominant sky-blue light; `secondary` provides violet depth; `aura`
     * supplies the widest atmospheric field; `contour` is for fine orbit/constellation structure.
     */
    ambientContour: null,
    ambientGlowPrimary: null,
    ambientGlowSecondary: null,
    ambientAura: null,

    focusRing: null,
    backdrop: null,
  },

  /** Shared radius roles. Add a new semantic level only when the existing roles cannot express it. */
  radius: {
    small: null,
    control: null,
    surface: null,
    floating: null,
    full: null,
  },

  /** Shared elevation roles for surfaces that need material depth. */
  elevation: {
    none: null,
    floating: null,
    modal: null,
  },

  /** Structural line roles. */
  hairline: {
    structural: null,
    subtle: null,
  },
});
