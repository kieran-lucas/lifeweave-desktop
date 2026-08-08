import { createThemeContract } from "@vanilla-extract/css";

/**
 * The Lifeweave visual contract (ADR 0045).
 *
 * This file answers "what colour, radius, weight, elevation or duration is this?" — the question
 * that, before Task 51, had 31 distinct border radii, 14 distinct box shadows and 29 distinct
 * hardcoded hex colours as its answer, spread across 30 domain style files.
 *
 * It is deliberately **separate** from `app/layout/tokens.css.ts`, which owns geometry. A visual
 * token may not declare geometry and a geometry token may not declare appearance, so an agent
 * editing a hue cannot move a page edge. `scripts/check_layout_authority.py` already enforces the
 * geometry half of that split.
 *
 * A contract rather than a theme: every role below is `null` here and must be supplied by every
 * theme, so a missing role is a **type error at build time** rather than a silent fallback to
 * `inherit` at runtime. That is the mechanism that stops the 29 stray colours reappearing in a new
 * hue.
 */
export const vars = createThemeContract({
  color: {
    /** The continuous plane everything else sits on. Not white. */
    canvas: null,
    /** A region that is part of the plane but tonally separated — the sidebar, the inspector. */
    surface: null,
    /** One step quieter than `surface`, for zoning inside a region. */
    surfaceSubtle: null,
    /** A surface that genuinely floats: menu, popover, dialog. The only place elevation is used. */
    surfaceRaised: null,
    /** Pale tonal selection fill. See `selectionEdge` — this may never be the sole state signal. */
    surfaceSelected: null,
    /**
     * Navigation selection is a *different, darker* tint than task selection in the reference —
     * measured #E9E9EE against the task row's #EFEFF4. Two roles, because one would force the
     * sidebar pill and the task row to agree, and the reference deliberately separates them.
     */
    surfaceSelectedNav: null,
    surfaceHover: null,

    textPrimary: null,
    textSecondary: null,
    /** Metadata. Measured to clear 4.5:1 over `canvas` *and* over `surfaceSelected`. */
    textTertiary: null,
    textDisabled: null,
    /** Text placed on `accent` fills. */
    textOnAccent: null,

    /** The ordinary structural line. Low contrast by intent. */
    borderHairline: null,
    /** A boundary that must be perceivable on its own; measured at or above 3:1. */
    borderStrong: null,

    accent: null,
    accentMuted: null,
    accentSoft: null,
    /**
     * The companion signal for selection. `surfaceSelected` measures 1.10:1 against the canvas, far
     * below the 3:1 that WCAG 2.2 SC 1.4.11 asks of a state indicator, so selection is carried by
     * this edge as well as by the fill. Removing it would make selection decorative only.
     */
    selectionEdge: null,

    /** Status *text* tones. Darker than the reference fill anchors, which fail 4.5:1 as text. */
    success: null,
    warning: null,
    danger: null,
    /** Status fill tones, for chips and washes. Never used for text. */
    successSoft: null,
    warningSoft: null,
    dangerSoft: null,

    /** Life / Narrative pastels. Fill tones only. */
    lifeLavender: null,
    lifeMint: null,
    lifePeach: null,
    lifeBlue: null,
    lifeCream: null,

    /**
     * Ambient art — the atmospheric layer only, never a content surface.
     *
     * Product Owner direction: the art vibe is **light blue**. This is deliberately the one place
     * a hue departs from the reference's warm-neutral plane, and it works precisely because it is
     * confined here: the canvas, surfaces and text stay warm, so a cool light-blue atmosphere reads
     * as air and distance behind the content rather than as a second theme competing with it.
     *
     * Two glow roles rather than one, so a field can have depth without becoming a gradient
     * spectacle: `primary` is the light blue itself, `secondary` leans a few degrees toward violet
     * so overlapping fields shift slightly instead of flattening into one wash.
     *
     * Every value stays within ~1.15:1 of the canvas. Art must never compete with information.
     */
    ambientContour: null,
    ambientGlowPrimary: null,
    ambientGlowSecondary: null,
    /**
     * The peripheral aura: the widest, faintest field, sitting behind the other two so the
     * atmosphere has a horizon rather than three discrete blooms. Added when the Product Owner
     * directed the art to lean more clearly light blue after VISUAL LOCK.
     */
    ambientAura: null,

    focusRing: null,
    backdrop: null,
  },

  /**
   * Four levels, replacing 31. `surface` is the page-region radius; `floating` is for menus and
   * dialogs. A fifth level requires a documented reason in the closure audit.
   */
  radius: {
    small: null,
    control: null,
    surface: null,
    floating: null,
    full: null,
  },

  /**
   * Three levels, replacing 14. Main content is always `none`; ADR 0045 reserves the other two for
   * surfaces that genuinely float.
   */
  elevation: {
    none: null,
    floating: null,
    modal: null,
  },

  /** Two structural line weights, so a page stops inventing its own grey border. */
  hairline: {
    structural: null,
    subtle: null,
  },
});
