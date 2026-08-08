import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Light theme — the primary target of the Product Owner's reference image.
 *
 * Values are expressed in `oklch()` so lightness and chroma relationships are perceptually
 * controlled rather than hand-picked per component, and so the dark theme can be composed against
 * the same axes instead of being derived by inversion.
 *
 * Each value is the measured OKLCH of a reference anchor, **except** where measurement showed the
 * anchor cannot carry its role accessibly. Those four deviations are marked `DEVIATION` with the
 * number that forced them; they are recorded in the audit and are reversible if the Product Owner
 * prefers the anchor and accepts the contrast cost.
 */
export const lightTheme = createTheme(vars, {
  color: {
    // Warm neutral plane. Chroma 0.0017 at hue 67.8 is what makes it read warm rather than grey;
    // it is far too low to read as a colour, which is the intent.
    canvas: "oklch(98.56% 0.0017 67.8)", //            #FBFAF9
    surface: "oklch(96.76% 0.0017 67.8)", //           #F5F4F3
    surfaceSubtle: "oklch(96.46% 0.0017 67.8)", //     #F4F3F2
    surfaceRaised: "oklch(98.86% 0.0017 67.8)", //     #FCFBFA
    surfaceSelected: "oklch(95.36% 0.0067 286.27)", //    #EFEFF4  measured, task row
    surfaceSelectedNav: "oklch(93.55% 0.0067 286.27)", // #E9E9EE  measured, sidebar pill
    surfaceHover: "oklch(96.9% 0.004 286.27)",

    textPrimary: "oklch(24.04% 0.0015 17.26)", //   #201F1F  15.77:1 on canvas
    textSecondary: "oklch(37.91% 0 89.88)", //      #424242   9.64:1
    // DEVIATION 1 — the reference anchor #7A7979 measures 4.16:1 on the canvas and 3.79:1 over the
    // selected fill. Metadata at 12–13px is body text, so it needs 4.5:1, not the 3:1 large-text
    // allowance. Lightness lowered 57.70% -> 53.74% at identical hue and chroma, which clears 4.5:1
    // on both backgrounds. The visible warmth and weight of the role are unchanged.
    textTertiary: "oklch(53.74% 0.0012 17.19)", //  #6E6D6D   4.50:1 on selected, 5.03:1 on canvas
    textDisabled: "oklch(64.68% 0.0673 264.78)",
    textOnAccent: "oklch(98.56% 0.0017 67.8)",

    borderHairline: "oklch(94.15% 0.0067 286.27)", // #EBEBF0 — quiet by intent
    // Non-text contrast 3.15:1 against the canvas, so a boundary drawn with it is perceivable
    // on its own where one genuinely must be.
    borderStrong: "oklch(64.68% 0.0673 264.78)", //   #7A8EB8

    // Measured from the reference's active tab rule and checkbox fill (#3B4D92), which is slightly
    // darker than the #44579F anchor and measures better: 7.57:1 rather than 6.48:1.
    accent: "oklch(44.19% 0.115 270.15)", //      #3B4D92   7.57:1 — safe as text
    accentMuted: "oklch(55.23% 0.1004 271.34)", //#5D6EAD   4.69:1 — safe as text
    accentSoft: "oklch(85.36% 0.0312 273.58)", // #C8CEE4 — fill only
    // DEVIATION 2 — not an anchor. The reference's selection is a pale fill, which measures
    // 1.10:1 against the canvas: beautiful, and below SC 1.4.11's 3:1 for a state indicator. The
    // fill is kept exactly as the reference has it and this edge carries the state alongside it,
    // so selection is never communicated by the wash alone.
    selectionEdge: "oklch(64.68% 0.0673 264.78)", // #7A8EB8  3.15:1

    // DEVIATION 3 — #7BAC84 measures 2.49:1 and cannot be status *text*. Lightness lowered to
    // 54.99% at identical hue and chroma. The anchor survives unchanged as `successSoft`.
    success: "oklch(54.99% 0.0783 149.66)", //     #4F7E59   4.52:1
    // DEVIATION 4 — #DB8A68 measures 2.57:1, same reasoning. Anchor survives as `warningSoft`.
    warning: "oklch(56.9% 0.1102 43.37)", //       #AC5F3F   4.51:1
    danger: "oklch(50% 0.15 27)",
    successSoft: "oklch(91.6% 0.0225 155.9)", //   #D8E8DD
    warningSoft: "oklch(80.14% 0.0744 50.82)", //  #E6B193
    dangerSoft: "oklch(90% 0.045 27)",

    // Measured from the reference's Life System Preview nodes. Far paler than the palette anchors
    // suggest — every node sits within 1.2:1 of the canvas, which is why the preview reads as a
    // quiet diagram rather than a colourful mind-map. Node labels carry their own text colour.
    lifeLavender: "oklch(94.24% 0.0107 286.19)", // #EBEBF3  Lifeweave Project
    lifeMint: "oklch(94.94% 0.0107 136.56)", //     #EBF0E9  Learning & Growth
    lifePeach: "oklch(96.82% 0.0101 58.22)", //     #FAF3EE  Relationships
    lifeBlue: "oklch(95.15% 0.0046 258.32)", //     #EDEFF2  Impact & Contribution
    lifeCream: "oklch(96.74% 0.013 71.33)", //      #FAF3EB  Creative Expression

    /*
     * Light blue art, per explicit Product Owner direction. Hue 238 is a true light blue rather
     * than the 270–286 blue-violet the interface accent uses, which keeps the atmosphere legibly
     * distinct from the accent instead of reading as a washed-out selection.
     *
     * Chroma is higher than the rest of the palette (0.045 against the canvas's 0.0017) because at
     * these lightnesses a lower chroma reads as dirty grey rather than as blue. Lightness is high
     * enough that each value still sits within 1.15:1 of the canvas, so art remains peripheral.
     */
    ambientContour: "oklch(88% 0.038 238)", //          contour lines
    ambientGlowPrimary: "oklch(94% 0.045 238)", //      the light blue field
    ambientGlowSecondary: "oklch(93.5% 0.032 268)", //  a few degrees toward violet, for depth

    focusRing: "oklch(47.79% 0.118 270.31)",
    backdrop: "oklch(24.04% 0.0015 17.26 / 0.45)",
  },

  radius: {
    small: "4px",
    control: "8px",
    surface: "12px",
    floating: "16px",
    full: "999px",
  },

  /*
   * Elevation exists in three steps and main content uses `none`. The two visible steps are
   * expressed as a single soft shadow rather than a stack, because on the measured target machine
   * — two cores, integrated graphics — a multi-layer shadow is real compositing work for an effect
   * the reference does not contain.
   */
  elevation: {
    none: "none",
    floating: "0 4px 16px oklch(24.04% 0.0015 17.26 / 0.08)",
    modal: "0 16px 48px oklch(24.04% 0.0015 17.26 / 0.16)",
  },

  hairline: {
    structural: "1px solid oklch(94.15% 0.0067 286.27)",
    subtle: "1px solid oklch(96.46% 0.0017 67.8)",
  },
});
