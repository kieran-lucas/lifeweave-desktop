# ADR 0009 — Narrative Canvas canonical schema: Strategy A selected

- Status: Superseded by ADR 0010
- Date: 2026-08-03
- Decision owner: Product Owner (informed by prototype evidence)
- Scope: Task 20 / Slice 010 prototype decision only

## Context

ADR 0003 and ADR 0006 deferred Narrative Canvas pending a schema prototype. ADR 0005 established that Basic Leaf uses versioned ProseMirror JSON as its canonical format and that static Read mode must not require loading Tiptap or PM schema. Two strategies were prototyped in isolation:

- **Strategy A:** Domain envelope `NarrativeDocument { scenes: NarrativeScene[] }` where each scene holds `NarrativeBlock[]` and each block's `content` is a `BasicLeafContent` (valid Basic Leaf ProseMirror JSON island).
- **Strategy B:** One large ProseMirror document where scenes are `scene` PM nodes and blocks are `narrative_block` PM nodes. Requires `@tiptap/pm/model` Schema for parse, serialize, mutate, and render.

The prototype ran 100,000 deterministic operations per strategy (seed 20260803), benchmarked parse/serialize/reorder/editBlock/extractText (1,000 iterations, FIXTURE_K = 20 scenes / 100 blocks), and scored both strategies against a 12-criterion/100-point weighted matrix.

## Decision

**Strategy A is the canonical schema for Narrative Canvas.**

Weighted score: **Strategy A 93.6 / 100**, Strategy B 56.7 / 100. Gap: 36.9 points.

## Hard vetoes against Strategy B

1. **Static rendering (score B = 2/10):** Strategy B requires PM Schema to parse a document node. The Reader component would need to load `prosemirror-model` (~50 kB) in the main bundle to render without the editor — directly violating the static-render split established in ADR 0005.

2. **Schema evolution safety (score B = 3/10):** Proven by the migration test: PM's `computeAttrs()` iterates schema-defined attributes only, silently dropping any unknown attribute from the input JSON. Adding `narrativeType` to strategy B required redefining the schema and re-parsing; without a matching schema update, the migration appeared to succeed but lost the new field without error. Strategy A migration adds a field with a plain object spread — no schema change required.

## Consequences

- When Narrative Canvas production work is activated, the schema will be a versioned `NarrativeDocument` JSON envelope containing `NarrativeScene[]` and `NarrativeBlock[]`. Rich-text block content is a `BasicLeafContent` JSON island using the same node vocabulary as Basic Leaf Core.
- Static Reader can render Canvas documents using the existing `StaticDocument` component per block — no PM schema loading required.
- Focused editor activates one Tiptap instance per focused block; block boundaries prevent cross-block PM cursor accidents.
- Schema migration adds fields to the envelope without constraint from PM; old documents remain valid as-is by defaulting new fields.
- This ADR does not activate Narrative Canvas as a product feature. Production activation requires a separate approved task.

## Rejected alternative

**Strategy B (full PM document)** was rejected because:
- Requires PM schema at read time, violating the static-render invariant.
- Migration silently loses unknown fields (data loss without error).
- Cross-scene block movement requires position-safe PM Fragment construction — significantly more complex than an array splice.
- TypeScript safety is weaker (all `node.attrs` are `Record<string, any>`).
- Scene titles stored as PM node attrs rather than searchable text content — complicates FTS5 extraction.
