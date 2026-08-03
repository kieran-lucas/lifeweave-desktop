# ADR 0010 — Narrative Canvas canonical schema: complete reaudit

- Status: Accepted
- Date: 2026-08-03
- Supersedes: ADR 0009
- Decision owner: Product Owner (informed by complete prototype evidence)
- Scope: Task 20 / Slice 010 prototype decision only

## Context

ADR 0009 recorded a Strategy A decision based on an incomplete prototype that used incorrect block vocabulary (choice/pause instead of metric/image/callout/timeline), missing operations, and two hard vetoes against Strategy B that were later proven unfair. This ADR supersedes ADR 0009 with a complete re-implementation that:

- Uses the accepted vocabulary: templates `strategy_dashboard`/`knowledge_dossier`, layouts `hero`/`single_column`/`two_column`/`bento`, atmospheres `neutral`/`sky`/`crystal`, motions `none`/`reveal`/`stagger`, blocks `rich_text`/`metric`/`image`/`callout`/`timeline`.
- Implements all 18 adapter operations for both strategies (parse, serialize, toSemanticDocument, getSceneCount, getBlockCount, createScene, deleteScene, reorderScene, updateSceneLayout, updateSceneAtmosphere, updateSceneMotion, insertBlock, deleteBlock, reorderBlock, moveBlock, updateBlock, applyBatch, projectToStatic, extractPlainText).
- Includes HistoryState<TDoc> undo/redo for both strategies.
- Implements a fair B codec (`strategy-b/codec.ts`) that pre-validates and migrates raw JSON before `nodeFromJSON`, resolving the ADR 0009 unfair migration veto.
- Implements a fair B static reader (`strategy-b/static-reader.ts`) that walks raw JSON by node type string without loading `@tiptap/pm/model`, resolving the ADR 0009 unfair static-rendering veto.
- Generates medium (100 scenes, 500 blocks) and large (500 scenes, 2500 blocks) fixtures with a deterministic PRNG.
- Counts 100,000 applied operations (not attempted) in the simulation, including undo/redo and batch operations.
- Uses the exact 12-criterion / 100-point weighted decision matrix approved by the Product Owner.

## Strategies

**Strategy A:** Domain envelope `NarrativeSemanticDocument` wrapping `NarrativeSemanticScene[]`. Blocks are discriminated union `NarrativeSemanticBlock`. All operations are pure immutable object transforms. No `@tiptap/pm` dependency.

**Strategy B:** One ProseMirror document where scenes are `scene` PM nodes and blocks are typed PM leaf/content nodes (rich_text_block, metric_block, image_block, callout_block, timeline_block). Fair pre-validation via codec before `nodeFromJSON`.

## Decision

**Strategy A is the canonical schema for Narrative Canvas.**

Weighted score: **Strategy A 82.8 / 100**, Strategy B 67.9 / 100. Gap: 14.9 points (threshold: 10 points).

## Decision Matrix (12 criteria, 100 points)

| Criterion | Weight | A | B | Rationale |
|---|---:|---|---|---|
| Data safety and migration clarity | 16 | 8 | 6 | A: plain JSON spread; explicit migration. B: fair codec prevents silent loss but adds complexity. |
| Atomic undo/redo correctness | 13 | 8 | 7 | A: domain snapshot stack. B: PM mixes structural and character steps. |
| Scene/block reorder correctness | 11 | 9 | 7 | A: array splice. B: Fragment construction + position bookkeeping. |
| Static Reader simplicity | 10 | 9 | 7 | A: zero PM import. B: fair static-reader walks JSON without PM; codec still ships. |
| Editor complexity | 10 | 7 | 8 | A: per-block island; focus commit needed. B: one editor; unified PM history richer. |
| Performance at medium/large scale | 9 | 8 | 5 | A: JSON.parse only. B: PM nodeFromJSON validates every node; measurably slower at 500 scenes. |
| Markdown/Basic Leaf interoperability | 8 | 8 | 8 | Both produce identical Markdown and Basic Leaf via shared semantic layer. |
| Search/plain-text extraction | 6 | 9 | 8 | A: walks JSON in semantic layer. B: requires PM deserialization on path. |
| Accessibility architecture | 6 | 8 | 7 | A: React owns every section aria-label. B: contenteditable ARIA harder to customize. |
| Schema evolution/versioning | 5 | 9 | 6 | A: JSON field addition trivial. B: codec + schema update required per new attr. |
| Testability/observability | 3 | 9 | 6 | A: plain objects; snapshot-friendly. B: PM Node opaque. |
| AI-assisted code modification locality | 3 | 9 | 6 | A: one discriminated union case per block kind. B: schema + codec + semantic layer changes. |
| **Weighted total / 100** | — | **82.8** | **67.9** | — |

## Hard veto re-evaluation

The two hard vetoes in ADR 0009 were based on unfair B implementations:

1. **Static rendering veto (ADR 0009):** "B requires PM Schema at read time." **Re-evaluation:** Fair B includes `static-reader.ts` which walks raw JSON by node type string without any `@tiptap/pm` import. Test confirms `staticReadFromRawJson` matches `projectToStatic` for FIXTURE_S. The veto does not apply to fair B; score reflects the remaining complexity overhead.

2. **Schema evolution veto (ADR 0009):** "PM `computeAttrs()` silently drops unknown attrs." **Re-evaluation:** Fair B includes codec that pre-validates and migrates JSON before `nodeFromJSON`. Test confirms that `narrativeType` added in v1→v2 migration is preserved in the parsed v2 node. The veto does not apply to fair B; score reflects the added codec complexity.

No hard vetoes are applied. The decision rests on the total weighted score (gap 14.9 ≥ 10 threshold).

## Consequences

- When Narrative Canvas production work is activated, the schema will be a versioned `NarrativeSemanticDocument` JSON envelope containing `NarrativeSemanticScene[]` and `NarrativeSemanticBlock[]`. Rich-text block content is a `BasicLeafContent` JSON island.
- Static Reader renders Canvas documents without loading any PM schema.
- Editor activates one Tiptap instance per focused rich-text block; leaf blocks (metric, image, timeline) are rendered as static React components.
- Schema migration adds fields by JSON spread; no schema re-registration required.
- This ADR does not activate Narrative Canvas as a product feature. Production activation requires a separate approved task.

## Rejected alternative

**Strategy B (full PM document)** scores 14.9 points lower primarily on data safety, scene/block reorder correctness, performance at scale, and schema evolution complexity. The fair B implementation is technically sound but introduces permanent coupling to PM Schema for all mutation operations, makes migrations more complex (codec required), and slows parse/serialize measurably at 500+ scenes.
