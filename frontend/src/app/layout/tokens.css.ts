import { globalStyle } from "@vanilla-extract/css";

/**
 * The Lifeweave layout token authority (ADR 0044).
 *
 * This file answers "what controls a Lifeweave page's main width?" — a future agent opens one file,
 * not thirty. Before Task 50 the answer was seven different page-local `max-width` declarations.
 *
 * Every name carries an `--lw-` prefix so nothing here can collide with the palette in
 * `design-system/global.css`, which Task 50 does not touch. These are **geometry** tokens only:
 * no colour, font, radius, shadow, icon, or motion value is defined or changed here.
 */

globalStyle(":root", {
  vars: {
    // 4 px-derived ramp. Fluent 2 uses the same base step, which keeps Lifeweave's rhythm
    // compatible with the platform it ships on without adopting Fluent's art direction.
    "--lw-space-1": "4px",
    "--lw-space-2": "8px",
    "--lw-space-3": "12px",
    "--lw-space-4": "16px",
    "--lw-space-5": "24px",
    "--lw-space-6": "32px",
    "--lw-space-7": "48px",
    "--lw-space-8": "64px",

    // Semantic aliases. Hierarchy is communicated by gap magnitude before any separator line, so
    // these are the names domain CSS should reach for.
    "--lw-space-control": "var(--lw-space-2)",
    "--lw-space-field": "var(--lw-space-4)",
    "--lw-space-group": "var(--lw-space-5)",
    "--lw-space-section": "var(--lw-space-6)",
    "--lw-space-page": "var(--lw-space-8)",

    // One responsive gutter for the whole application, owned by the main viewport.
    "--lw-gutter": "clamp(24px, 3vw, 48px)",

    /*
     * Page-frame variants. These are project decisions informed by the research in ADR 0044 and by
     * baseline measurement — not experimentally proven universal optima.
     *
     *   standard 1152  keeps prose near a comfortable measure while giving the Analytics fact grid
     *                  three unhurried columns
     *   wide     1440  the widest frame that still leaves visible gutter at 1920 with the sidebar
     *                  expanded
     *   reading   768  a conventional single-column reading measure; replaces the ad-hoc 760 the
     *                  Reader used, so reading surfaces stop inventing their own width
     */
    "--lw-frame-standard": "1152px",
    "--lw-frame-wide": "1440px",
    "--lw-frame-reading": "768px",

    /*
     * Modal widths. 720 is the narrowest width at which the Task dialog's three thirds-width
     * schedule fields hold their labels without wrapping; 520 preserves the width the existing
     * confirmation dialogs already use; 960 exists for previews that must show a table.
     */
    "--lw-dialog-compact": "520px",
    "--lw-dialog-standard": "720px",
    "--lw-dialog-wide": "960px",

    // The margin a modal surface must leave around itself, on both axes.
    "--lw-dialog-inset": "48px",
  },
});

export const space = {
  x1: "var(--lw-space-1)",
  x2: "var(--lw-space-2)",
  x3: "var(--lw-space-3)",
  x4: "var(--lw-space-4)",
  x5: "var(--lw-space-5)",
  x6: "var(--lw-space-6)",
  x7: "var(--lw-space-7)",
  x8: "var(--lw-space-8)",
  control: "var(--lw-space-control)",
  field: "var(--lw-space-field)",
  group: "var(--lw-space-group)",
  section: "var(--lw-space-section)",
  page: "var(--lw-space-page)",
} as const;

export const gutter = "var(--lw-gutter)";

export const frame = {
  standard: "var(--lw-frame-standard)",
  wide: "var(--lw-frame-wide)",
  reading: "var(--lw-frame-reading)",
} as const;

export const dialogWidth = {
  compact: "var(--lw-dialog-compact)",
  standard: "var(--lw-dialog-standard)",
  wide: "var(--lw-dialog-wide)",
} as const;

export const dialogInset = "var(--lw-dialog-inset)";
