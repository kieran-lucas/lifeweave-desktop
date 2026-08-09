import { createTheme } from "@vanilla-extract/css";

import { vars } from "./contract.css";

/**
 * Light theme — measured from `docs/visual/task-51/lifeweave-visual-baseline-v2.png`.
 *
 * **This replaces the warm-neutral palette of baseline v1.** The Product Owner supplied a new
 * reference and made it the source of truth; the direction changed from a warm editorial plane with
 * a muted blue-violet accent to a **cool near-white monochrome plane with a saturated blue accent**.
 * Nothing here is a reinterpretation of v1 — every value below is sampled from v2.
 *
 * Values are `oklch()` so lightness and chroma relationships stay perceptually controlled and the
 * dark theme can be composed against the same axes rather than inverted.
 *
 * Measured contrast is recorded beside each role. Two roles deviate from the sampled anchor because
 * the anchor cannot carry its job accessibly; both are marked DEVIATION.
 */
export const lightValues = {
  color: {
    /*
     * Three near-white planes, separated by ~0.5% lightness each. The whole hierarchy lives in that
     * sliver: sidebar sits lowest, the workspace canvas above it, and the row group and inspector
     * highest. Anything larger reads as stacked panels, which is what "liền phẳng" rules out.
     */
    canvas: "oklch(99.13% 0.0013 286.38)", //        #FCFCFD  workspace + inspector plane
    surface: "oklch(98.57% 0.0026 286.35)", //       #FAFAFC  sidebar
    surfaceSubtle: "oklch(97.9% 0.003 280)", //               chips, quiet fills
    surfaceRaised: "oklch(100% 0 0)", //             #FFFFFF  the row group, menus, dialogs
    surfaceSelected: "oklch(97.56% 0.0086 264.52)", //#F4F7FD  selected task row
    surfaceSelectedNav: "oklch(96.19% 0.0109 274.89)", // #F0F2FA  selected sidebar item
    surfaceHover: "oklch(98.1% 0.004 270)",

    textPrimary: "oklch(25.42% 0.0111 254.04)", //   #1F2328  15.41:1
    textSecondary: "oklch(37.37% 0.0153 259.81)", // #3C4149  10.02:1
    textTertiary: "oklch(49.75% 0.0196 259.42)", //  #5C636E   5.91:1 on canvas, 5.65:1 on selected
    /*
     * DEVIATION 1 — the sampled quaternary grey `#8A9099` measures 3.14:1 on the canvas and 3.00:1
     * on the selected fill. That is fine for a disabled control, which is exempt, and not fine for
     * anything a user must read. `textDisabled` therefore keeps the sampled tone, and no live text
     * uses it; live metadata uses `textTertiary` instead.
     */
    textDisabled: "oklch(65.13% 0.0151 258.36)", //  #8A9099   3.14:1 — disabled only
    textOnAccent: "oklch(100% 0 0)",

    borderHairline: "oklch(94.92% 0.0042 271.37)", //#EDEEF1  the row separator and group edge
    borderStrong: "oklch(92.18% 0.0071 268.54)", //  #E3E5EA

    /*
     * The accent. Saturated blue, sampled from the checked circles, the date line, the active nav
     * icon and the active tab. At 6.25:1 it is safe as text, which matters because this design uses
     * blue *as text* in several places the previous one did not — the date, "Review day", the
     * active tab label, and the Energy value.
     */
    accent: "oklch(49.4% 0.1959 260.92)", //         #1157CE   6.25:1
    accentMuted: "oklch(54.61% 0.2152 262.88)", //   #2563EB   5.04:1
    accentSoft: "oklch(96.19% 0.0109 274.89)", //    #F0F2FA — fill only
    /*
     * DEVIATION 2 — the selected fill measures 1.05:1 against the canvas, far below the 3:1
     * WCAG 2.2 SC 1.4.11 asks of a state indicator.
     *
     * v1 solved this with a 2 px left accent bar. The new reference has no such bar, and the brief
     * forbids adding decoration the image does not contain — so the bar is **removed** and the
     * companion signal moves onto something the design already draws: the selected row's checkbox
     * ring takes the accent colour, at 6.25:1. Selection is still carried by two signals, and
     * nothing was invented to achieve it.
     */
    selectionEdge: "oklch(49.4% 0.1959 260.92)",

    /*
     * Completion is BLUE, by explicit Product Owner instruction — "task đã tick cũng dùng blue
     * (không dùng green)". `success` therefore resolves to the accent rather than to a green, and
     * no task state uses green anywhere.
     */
    success: "oklch(49.4% 0.1959 260.92)",
    warning: "oklch(52% 0.13 65)",
    danger: "oklch(50% 0.17 25)",
    successSoft: "oklch(96.19% 0.0109 274.89)",
    warningSoft: "oklch(95% 0.04 75)",
    dangerSoft: "oklch(95% 0.035 25)",

    // Life preview nodes: near-white with the faintest tint, exactly as sampled. The focal node is
    // the only one that carries the accent family.
    lifeLavender: "oklch(97.4% 0.009 268)", //   #F0F3FD, the focal node
    lifeMint: "oklch(98.2% 0.005 160)",
    lifePeach: "oklch(98.2% 0.005 60)",
    lifeBlue: "oklch(98% 0.006 264)",
    lifeCream: "oklch(98.4% 0.004 90)",

    /*
     * Ambient art is retained as a token family but is **not rendered on Today**. The brief is
     * explicit: no decorative field at the top, art must be almost invisible, nothing may encroach
     * on content. These values are kept near-neutral so that if a quieter surface ever uses them,
     * they cannot reintroduce the coloured atmosphere this reference removed.
     */
    ambientContour: "oklch(96% 0.006 264)",
    ambientGlowPrimary: "oklch(98.4% 0.004 264)",
    ambientGlowSecondary: "oklch(98.4% 0.003 274)",
    ambientAura: "oklch(98.8% 0.003 264)",

    focusRing: "oklch(49.4% 0.1959 260.92)",
    backdrop: "oklch(25.42% 0.0111 254.04 / 0.4)",
  },

  /*
   * The radius scale, re-derived under ADR 0045's Craft-class benchmark.
   *
   * Feature CSS had authored **29 distinct radii** — 0, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18,
   * 20, 24, 50%, 999 and five rem values that resolved between them. The previous 4/8/12/14 scale
   * was the right *shape* and slightly too tight: consistent, generous corner treatment is most of
   * what makes a soft interface read as soft rather than as a rounded rectangle.
   *
   * A uniform +4 step keeps the progression legible at every size, and the ratio to the object is
   * what matters — a 6px radius on a 20px chip is proportionally the same softness as 18px on a
   * dialog. Radius never sets geometry, so nothing here can move a page edge.
   */
  radius: {
    small: "6px", //     chips, tags, inline code, small marks
    control: "10px", //  buttons, inputs, selects, rows
    surface: "14px", //  cards, panels, grouped regions
    floating: "18px", // dialogs, popovers, menus
    full: "999px", //    pills, discs, avatars
  },

  /*
   * Elevation is almost absent. The row group and the inspector are distinguished by being *whiter*
   * than the canvas, not by floating above it — which is why `floating` is this soft and why main
   * content uses `none`.
   */
  elevation: {
    none: "none",
    floating: "0 2px 10px oklch(25.42% 0.0111 254.04 / 0.06)",
    modal: "0 12px 40px oklch(25.42% 0.0111 254.04 / 0.14)",
  },

  hairline: {
    structural: "1px solid oklch(94.92% 0.0042 271.37)",
    subtle: "1px solid oklch(97.2% 0.003 271)",
  },
};

/**
 * The values above are exported separately from the class below because production assigns them to
 * `:root` through `theme.css.ts` — a class would have to be put on an element and toggled by script,
 * where `prefers-color-scheme` needs neither. The class is retained for the prototype, which forces
 * a theme regardless of the system preference so both can be captured.
 */
export const lightTheme = createTheme(vars, lightValues);
