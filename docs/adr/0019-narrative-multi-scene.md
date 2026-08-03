# ADR 0019 — Narrative Multi-Scene Composition

**Status:** Accepted
**Date:** 2026-08-03

## Context

ADR 0018 selected Narrative Multi-Scene Composition as `ACTIVATE_NEXT`. The Product Owner approved Task 24 on 2026-08-03.

The existing single-scene Narrative Canvas (ADR 0010 Strategy A, Task 21) enforces `scenes.length === 1` at two sites: Rust `schema.rs` and TypeScript `schema.ts`. `serializeNarrative`, `toNarrativeCanonicalValue`, and the Markdown export already iterate arbitrary scene counts — they required no changes.

## Decision

Relax the scene count constraint to 1–20 scenes at both enforcement sites. No migration is required because the constraint is a validation rule, not a schema column. The `templateId` remains `"knowledge_dossier"`.

Studio receives an `activeSceneId` state variable and a tab-bar scene panel (add, delete, rename, reorder). All block operations are updated from `scenes[0]` to `scenes[activeSceneIdx]`.

Reader iterates `doc.scenes` in `StaticCanvasView`; each scene is a `<section>` ARIA landmark.

## Consequences

- Schema stays at version 14. No new IPC commands. No new Rust modules.
- `parseNarrative` accepts 1–20 scenes; rejects 0 and >20.
- Existing single-scene documents remain fully compatible.
- Cross-scene block drag, scene templates, and scene-level layout/atmosphere/motion are deferred.
- Search integration unaffected: `entity_kind = 'reader_document'` is immutable from Migration 10.
