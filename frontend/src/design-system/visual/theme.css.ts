import { assignVars, globalStyle } from "@vanilla-extract/css";

import { vars } from "./contract.css";
import { darkValues } from "./darkTheme.css";
import { lightValues } from "./lightTheme.css";

/**
 * Where the visual contract becomes real.
 *
 * Before this file, `vars.*` had **zero** consumers in production: `lightTheme` and `darkTheme` were
 * applied only inside `prototypes/task51/`, which the production build excludes, and every shipped
 * surface read a second, hand-maintained palette declared as raw custom properties in `global.css`.
 * The application therefore had two palettes that had to be kept in agreement by hand — exactly the
 * failure the typed contract was introduced to prevent, one layer up from the 31-radius sprawl.
 *
 * Assigning the contract to `:root` fixes that at the root rather than per file. Both themes are
 * plain value objects, so `prefers-color-scheme` selects between them with no class on an element
 * and no script — which also means the theme is correct on the very first paint.
 */

globalStyle(":root", { vars: assignVars(vars, lightValues) });

globalStyle(":root", {
  "@media": { "(prefers-color-scheme: dark)": { vars: assignVars(vars, darkValues) } },
});

/**
 * The compatibility layer.
 *
 * 140 uses of `--text-muted`, 128 of `--border-subtle`, 61 of `--text-primary` — around 500 legacy
 * custom-property references across 31 style files. Rewriting them all to `vars.*` in one change
 * would be a diff no one can review, and would gain nothing today: what matters is that there is
 * **one** source of truth, not which syntax reads it.
 *
 * So the legacy names stay, and become aliases that resolve *through* the contract. Every existing
 * surface converges the moment this file loads, and a file may migrate to `vars.*` whenever it is
 * being worked on anyway. Deleting an alias is then a mechanical, per-name step with a compiler and
 * a governance ratchet behind it, instead of a flag day.
 */
globalStyle(":root", {
  vars: {
    "--app-background": vars.color.canvas,
    "--sidebar-background": vars.color.surface,
    "--surface": vars.color.surfaceRaised,
    "--surface-raised": vars.color.surfaceRaised,
    "--surface-primary": vars.color.surfaceRaised,
    "--sidebar-surface": vars.color.surface,
    "--border-subtle": vars.color.borderHairline,
    "--text-primary": vars.color.textPrimary,
    "--text-muted": vars.color.textTertiary,
    "--accent": vars.color.accent,
    "--color-accent": vars.color.accent,
    "--accent-contrast": vars.color.textOnAccent,
    "--active-background": vars.color.surfaceSelectedNav,
    "--icon-background": vars.color.surfaceSelected,
    "--focus-ring": vars.color.focusRing,

    /*
     * These eight names were **consumed but never declared** — 21 references that survived only on
     * their inline fallbacks, and those fallbacks had drifted into five different reds
     * (#c0392b, #b42318, #9f2f2f, #c00) and two different accents across the tag, backup,
     * foundation, plan, link and saved-view surfaces. Declaring them here is what lets those
     * literals be deleted rather than merely tidied.
     */
    /*
     * The radius scale, exposed as custom properties for the same reason the colours are: feature
     * CSS had 29 distinct authored radii, and the cheapest way to collapse them is a name every
     * file can already use. A file that is being reworked anyway should prefer `vars.radius.*`,
     * which is type-checked; these exist so the other 120 call sites can converge today.
     */
    "--radius-small": vars.radius.small,
    "--radius-control": vars.radius.control,
    "--radius-surface": vars.radius.surface,
    "--radius-floating": vars.radius.floating,
    "--radius-full": vars.radius.full,

    "--danger": vars.color.danger,
    "--error": vars.color.danger,
    "--color-error": vars.color.danger,
    "--warning": vars.color.warning,
    "--success": vars.color.success,
  },
});
