# Spec 010 — Narrative Canvas Canonical Schema A/B Prototype + Decision

Task 20 of 60.

**Status:** Complete. Strategy A selected. See `docs/adr/0009-narrative-canonical-schema.md`.

## Summary

This spec governs an isolated schema prototype that compares two candidate designs for the Narrative Canvas canonical document format before any production code is written. The prototype is never shipped; it exercises domain operations, benchmarks both strategies, and selects one through a disclosed weighted matrix and hard veto evaluation.

## Strategy A — Domain envelope + rich-text islands

- `NarrativeDocument` wraps an array of `NarrativeScene` objects.
- Each scene has metadata (`id`, `title`, `sceneType`, `tags`) plus a `blocks: NarrativeBlock[]` array.
- Each block has a `blockType` discriminant and a `content: BasicLeafContent` field that is valid Basic Leaf ProseMirror JSON.
- Operations are pure immutable JavaScript object transforms; no ProseMirror schema is loaded.
- Static Reader renders scenes/blocks by walking the JSON envelope — no Tiptap or PM required.

## Strategy B — Full ProseMirror document

- The document is one large PM `Node` where scenes are `scene` nodes and blocks are `narrative_block` nodes.
- PM Schema must be loaded for parse, serialize, mutate, and static render.
- Operations use PM's `Node.copy()` / `Fragment.from()` API.

## Decision

**Strategy A selected.** Score: 93.6 / 100 (Strategy B: 56.7 / 100). Two hard vetoes applied against Strategy B: static rendering requires PM schema (violates ADR 0005 Reader invariant), and PM migration silently drops unknown attrs (data loss without error, proven by simulation).

## Related

- `docs/adr/0009-narrative-canonical-schema.md`
- `docs/audits/task-20-narrative-schema-prototype.md`
- `frontend/src/prototypes/narrative-canvas-schema/`
