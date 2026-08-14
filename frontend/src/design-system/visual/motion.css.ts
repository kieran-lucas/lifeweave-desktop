/**
 * Lifeweave motion vocabulary — Matte Anime Painted Atlas.
 *
 * The goal is continuity, not spectacle. State commits first; movement only explains the change.
 * Consumers animate transform/opacity/paint tone and avoid layout, blur and large filter animation.
 */
export const duration = {
  press: "72ms",
  state: "120ms",
  check: "150ms",
  popover: "170ms",
  inspectorState: "180ms",
  inspector: "220ms",
  reorder: "240ms",
  route: "230ms",
  traversal: "300ms",
} as const;

/** One settle curve across the app prevents each surface from feeling independently animated. */
export const easing = {
  standard: "cubic-bezier(0.16, 1, 0.3, 1)",
  exit: "cubic-bezier(0.4, 0, 0.6, 1)",
} as const;

/** Near-critical springs: no cartoon bounce, no abrupt snap. */
export const spring = {
  settle: { type: "spring", stiffness: 360, damping: 36, mass: 0.92 },
  tactile: { type: "spring", stiffness: 520, damping: 34, mass: 0.78 },
} as const;

export const reduced = {
  duration: "80ms",
  easing: easing.standard,
  spring: { type: "tween", duration: 0.08, ease: [0.16, 1, 0.3, 1] },
} as const;
