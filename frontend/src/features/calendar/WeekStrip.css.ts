import { style } from "@vanilla-extract/css";
import { iconButton } from "../../design-system/primitives/controls.css";
import { focusRing } from "../../design-system/primitives/utilities.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

/*
 * Week strip, composed for Visual Baseline v2.
 *
 * The previous version drew seven 58 px cells with their own borders and radii, plus two bordered
 * arrow buttons — a row of nine boxes sitting directly under the page title, which is exactly the
 * "second dashboard inside Today" the brief rules out. v2's header uses a compact, typographic date
 * cluster instead.
 *
 * What carries the design now: weight and tone for the day name and number, a pale blue fill plus
 * a lower edge for the selected day, and one quiet outline around today. The arrows remain
 * borderless; the hairline beneath the strip separates the header from the timeline.
 *
 * Geometry, semantics, keyboard behaviour and ARIA are unchanged; this file declares appearance only.
 */

export const root = style({
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr) 32px",
  alignItems: "center",
  gap: 4,
  paddingBottom: 14,
  borderBottom: "1px solid var(--border-subtle)",
});

/*
 * 8 px between day cells, not 2.
 *
 * The first pass used 2 px and the Task 50 semantic-collision detector reported five `inline`
 * collisions across the week — two adjacent day buttons whose boxes sit closer than the 8 px floor
 * for inline semantic units read as one run, which is the same class of defect as
 * `Morning04:00–12:00`. Removing the cell borders made the boxes adjacent in a way the bordered
 * version had hidden.
 */
/*
 * The week is a cluster, not a ruler.
 *
 * `1fr` columns spread seven days across the whole workspace, so at a maximized 1440px each day sat
 * ~200px from its neighbour with its label marooned in the middle — the week read as a row of
 * unrelated buttons rather than as a continuous seven days. Capping the column and centring the
 * grid keeps them adjacent at any width, and they still compress rather than overflow at 960px.
 */
export const days = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 96px))",
  justifyContent: "center",
  gap: 8,
});

/** Chromeless arrows: a hover tone, no border, no fill at rest. */
export const move = style([iconButton, {
  border: 0,
  background: "transparent",
  color: "var(--text-muted)",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "var(--icon-background)", color: "var(--text-primary)" },
  },
}]);
export const nextIcon = style({ transform: "rotate(180deg)" });

/**
 * A day cell is type on tone. Only the actual current day receives a quiet outline, so the marker
 * is structural and legible without the detached decorative dot the previous version used.
 *
 * Selected takes the pale blue fill plus a lower edge. Today receives a thin bounded frame and its
 * explicit label, so "today" and "selected" remain distinct and neither depends on colour alone.
 */
export const day = style([focusRing, {
  minInlineSize: 0,
  minBlockSize: 52,
  display: "grid",
  placeContent: "center",
  gap: 1,
  padding: "6px 2px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "var(--text-muted)",
  ...text.metadata,
  cursor: "pointer",
  transition: `background-color ${duration.state} ${easing.standard}, color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { background: "var(--icon-background)" },
    "&[aria-current=date]": {
      borderColor: "color-mix(in srgb, var(--accent) 46%, var(--border-subtle))",
      background: "color-mix(in srgb, var(--accent) 5%, transparent)",
      color: "var(--accent)",
    },
    "&[aria-pressed=true]": {
      background: "var(--icon-background)",
      color: "var(--accent)",
      fontWeight: 600,
      boxShadow: "inset 0 -2px 0 var(--accent)",
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        "&[aria-current=date]": { borderColor: "Highlight" },
        "&[aria-pressed=true]": { boxShadow: "inset 0 -2px 0 Highlight" },
      },
    },
  },
}]);

export const todayLabel = style(text.caption);
