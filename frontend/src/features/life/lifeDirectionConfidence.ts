/**
 * ADR 0050 direction confidence — the one Life node state vocabulary.
 *
 * Tree cards, Edit node and the Leaf header all read this module, so a level's label, order and
 * default live in exactly one place, and a leaf's badge always says what its card says. `exploring`
 * is the default: it is what a node projects when it has no explicit row, and it is a real level
 * that surfaces show like the other three rather than a "no state" placeholder.
 *
 * The level is manual and ordinal. It is not progress, probability, health or priority.
 */
export const directionConfidenceOptions = [
  { value: "exploring", label: "Exploring", description: "Still open; this direction is being discovered." },
  { value: "leaning", label: "Leaning", description: "Promising enough to influence near-term choices." },
  { value: "committed", label: "Committed", description: "Chosen deliberately and used to guide plans." },
  { value: "core", label: "Core", description: "A durable life anchor, changed only intentionally." },
] as const;

export type DirectionConfidenceOption = typeof directionConfidenceOptions[number];
export type DirectionConfidence = DirectionConfidenceOption["value"];

/** Missing and unrecognised levels project as `exploring`, matching the Rust projection. */
export const DEFAULT_DIRECTION_CONFIDENCE: DirectionConfidence = "exploring";

export function directionConfidenceOption(value: string): DirectionConfidenceOption {
  return directionConfidenceOptions.find(option => option.value === value) ?? directionConfidenceOptions[0];
}

/** Position in the ordinal ramp, used for the redundant one-to-four mark ADR 0050 requires. */
export function directionConfidenceRank(value: string): number {
  return directionConfidenceOptions.indexOf(directionConfidenceOption(value));
}
