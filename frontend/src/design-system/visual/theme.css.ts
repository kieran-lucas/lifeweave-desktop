import { assignVars, globalStyle } from "@vanilla-extract/css";

import { vars } from "./contract.css";
import { darkValues } from "./darkTheme.css";
import { lightValues } from "./lightTheme.css";

globalStyle(":root", { vars: assignVars(vars, lightValues) });

globalStyle(":root", {
  "@media": { "(prefers-color-scheme: dark)": { vars: assignVars(vars, darkValues) } },
});

/** Compatibility aliases. Every presentation alias remains zero-chroma in both themes. */
globalStyle(":root", {
  vars: {
    "--app-background": vars.color.canvas,
    "--sidebar-background": vars.color.surface,
    "--surface": vars.color.surfaceRaised,
    "--surface-raised": vars.color.surfaceRaised,
    "--surface-primary": vars.color.surfaceRaised,
    "--surface-subtle": vars.color.surfaceSubtle,
    "--surface-hover": vars.color.surfaceHover,
    "--surface-selected": vars.color.surfaceSelected,
    "--surface-selected-nav": vars.color.surfaceSelectedNav,
    "--sidebar-surface": vars.color.surface,
    "--border-subtle": vars.color.borderHairline,
    "--border-strong": vars.color.borderStrong,
    "--text-primary": vars.color.textPrimary,
    "--text-muted": vars.color.textTertiary,
    "--accent": vars.color.accent,
    "--accent-muted": vars.color.accentMuted,
    "--accent-soft": vars.color.accentSoft,
    "--color-accent": vars.color.accent,
    "--accent-contrast": vars.color.textOnAccent,
    "--active-background": vars.color.surfaceSelected,
    "--icon-background": vars.color.surfaceSelected,
    "--focus-ring": vars.color.focusRing,
    "--backdrop": vars.color.backdrop,

    "--radius-small": vars.radius.small,
    "--radius-control": vars.radius.control,
    "--radius-surface": vars.radius.surface,
    "--radius-floating": vars.radius.floating,
    "--radius-full": vars.radius.full,

    "--elevation-floating": vars.elevation.floating,
    "--elevation-modal": vars.elevation.modal,

    "--danger": vars.color.danger,
    "--error": vars.color.danger,
    "--color-error": vars.color.danger,
    "--warning": vars.color.warning,
    "--success": vars.color.success,
  },
});
