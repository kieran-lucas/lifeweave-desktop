/**
 * The Lifeweave motion vocabulary (ADR 0045 §5, spec §8).
 *
 * Named values, so a feature never writes `transition: 140ms ease` and never writes
 * `transition: all`. Every duration here is short: this is a tool that stays open for hours, and
 * the product's stated priority order is state first, motion second.
 *
 * Nothing in this file animates layout properties. Consumers animate `transform` and `opacity`, or
 * hand the geometry to Motion's layout projection.
 */

export const duration = {
  /** Pointer-down acknowledgement. Must be short enough to feel like contact, not playback. */
  press: "70ms",
  /** Hover and selection tone change. */
  state: "100ms",
  /** The completion check settling *after* the state has already committed. */
  check: "140ms",
  /** Tooltip and popover entry. */
  popover: "140ms",
  /** A small change inside the inspector — a tab switch, a value update. */
  inspectorState: "170ms",
  /** The inspector column opening or closing. */
  inspector: "200ms",
  /** Rows resettling after a reorder or a completion. */
  reorder: "220ms",
  /** Workspace or route change. */
  route: "220ms",
  /** Life spatial traversal, the largest ordinary movement in the product. */
  traversal: "260ms",
} as const;

/**
 * Two easings and nothing else.
 *
 * `standard` is a gentle ease-out: things arrive by decelerating, which reads as physical.
 * `exit` is faster at the start, because a departing element should get out of the way rather than
 * linger — an element leaving slowly reads as lag.
 */
export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

/**
 * Springs for Motion's layout projection. Near-critical damping throughout.
 *
 * `settle` has no perceptible overshoot and carries every panel and row movement. `tactile` allows
 * a trace of overshoot and is reserved for direct acknowledgement of a pointer — a checkbox may
 * snap; a panel may not bounce.
 */
export const spring = {
  settle: { type: "spring", stiffness: 420, damping: 38, mass: 1 },
  tactile: { type: "spring", stiffness: 620, damping: 30, mass: 0.8 },
} as const;

/**
 * Ambient drift, if the locked design uses any. Long period, tiny amplitude, transform and opacity
 * only, and paused whenever its surface is hidden or the window is inactive.
 *
 * Today and Reader require none of this.
 */
export const ambient = {
  period: "24s",
  amplitude: "6px",
} as const;

/**
 * The reduced-motion substitute (ADR 0045 §6, `docs/ACCESSIBILITY_AND_INPUT.md`).
 *
 * Not zero. Setting every duration to `0.01ms`, which is what the application does today, replaces
 * a movement with a jump — and a jump is the disorientation the movement existed to prevent. What
 * reduced motion removes is *travel*: transforms, spatial sweeps and ambient loops. What it keeps
 * is a short tonal cross-fade, so a change is still perceived as a change.
 */
export const reduced = {
  duration: "80ms",
  easing: easing.standard,
  /** Consumers switch to this instead of animating position. */
  spring: { type: "tween", duration: 0.08, ease: [0.2, 0, 0, 1] },
} as const;
