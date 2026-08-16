# ADR 0050 — Life direction confidence and direct Tree open

Status: Accepted — explicit Product Owner decision, 2026-08-16

## Context

Life Tree nodes represent directions, not task progress or predictions. They need a compact way to
record how firmly each direction should guide present choices. A percentage would imply false
precision, while a simple low/medium/high scale leaves the middle ambiguous and does not describe
what changes in the user's relationship to a direction.

Goal-commitment research distinguishes commitment from achievement, and implementation-intention
research likewise distinguishes deciding on a goal from executing it. IPCC calibrated-confidence
language demonstrates the value of a small, consistently named ordinal vocabulary, but its
evidence/agreement semantics do not fit personal direction. Lifeweave therefore uses an explicit
product vocabulary rather than claiming a clinical or probabilistic measure.

Tree also required a direct-open gesture without weakening its existing single-click contextual
actions or its WebView history authority.

## Decision

1. Every Life node has one manual direction-confidence level:
   `exploring | leaning | committed | core`.
2. The levels mean, respectively: still being discovered; promising enough to influence near-term
   choices; deliberately chosen to guide plans; or a durable life anchor changed only intentionally.
3. The level is not progress, probability, health, prediction, priority, or an inherited value.
   It is never computed and changing it has no automatic effect on Tasks, Plans, Analytics, node
   hierarchy, or child levels.
4. Missing legacy data projects as `exploring`. Schema 32 stores explicit choices in a bounded
   one-to-one table keyed to `life_nodes`; full-database backup and restore therefore preserve it.
5. The existing revisioned, idempotent Life metadata mutation writes the level transactionally,
   and Life undo restores the previous level with the rest of the node metadata.
6. Tree cards always expose the textual level plus a redundant one-to-four mark. Colour is only
   secondary emphasis. Edit node presents all four labels with short behavioral descriptions.
7. Double-clicking a Tree card opens that node immediately. A branch opens Browse; a leaf opens its
   Reader. Enter on the focused card provides keyboard parity. Single-click/Space retain the
   existing contextual Add child / Edit node behavior.
8. Direct open emits exactly one application history snapshot through ADR 0049. It does not create
   component-local history or bypass unavailable-node fallback.
9. Life Branch Package v1 and Life Tree Package v1 remain byte-contract stable and do not acquire a
   new field. Imported nodes begin at `exploring`; a future package-format decision may transfer
   direction confidence. Full database backup/restore remains the lossless authority for this field.

## Consequences

- The four levels are compact enough to scan across the full Tree and retain actionable meaning.
- Existing databases and package imports remain valid without rewriting node rows or immutable
  interchange formats.
- Users must choose changes explicitly; hierarchy does not manufacture certainty.
- Package interchange intentionally has a disclosed semantic boundary until a separately versioned
  format is approved.

## Research basis

- Klein et al., *The Assessment of Goal Commitment: A Measurement Model Meta-Analysis* (2001),
  DOI `10.1006/obhd.2000.2931`.
- Gollwitzer & Sheeran, *Implementation Intentions and Goal Achievement: A Meta-analysis of Effects
  and Processes* (2006), DOI `10.1016/S0065-2601(06)38002-1`.
- IPCC, *Guidance Note for Lead Authors on Consistent Treatment of Uncertainties* (2010).
