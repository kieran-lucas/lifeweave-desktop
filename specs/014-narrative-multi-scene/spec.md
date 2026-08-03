# Spec 014 — Narrative Multi-Scene Composition

## Purpose

Extend the Narrative Canvas from a single mandatory scene to 1–20 scenes per document. Users can author multi-act narratives, structured dossiers, and segmented knowledge documents within a single Canvas leaf.

## Activation basis

ADR 0018 (Task 23): Multi-Scene Composition selected as `ACTIVATE_NEXT` with base score 8.02, base lead 0.46, aggregate top-1 65.8 %. Product Owner approved Task 24 on 2026-08-03.

## Constraints

- Scene count: 1 to 20 inclusive (both validator and parser enforce)
- No migration required: schema stays at version 14
- `templateId` remains `"knowledge_dossier"` — no new template
- Scene fields: `layoutPreset="single_column"`, `atmosphere="neutral"`, `motionPreset="none"` (same fixed values as single-scene)
- Maximum 128 blocks per scene (existing block limit)
- Cross-scene block drag: out of scope
- Scene templates: out of scope

## Validator changes

**Rust** (`src-tauri/src/narrative/schema.rs`):
- `scenes.is_empty() || scenes.len() > 1` → `scenes.is_empty() || scenes.len() > 20`
- Error: `"Narrative document must have 1 to 20 scenes."`

**TypeScript** (`frontend/src/features/life/narrative/schema.ts`):
- `scenes.length !== 1` → `scenes.length === 0 || scenes.length > 20`
- Error: `"Narrative must have 1 to 20 scenes"`

## Reader

`StaticCanvasView` iterates `doc.scenes`. Each scene is wrapped in a `<section aria-labelledby="nc-scene-title-{id}">`. Titled scenes show their h2 normally; untitled scenes get a visually-hidden h2 ("Scene N") for accessibility landmarks.

## Studio

`activeSceneId` state tracks the active scene. Derived: `activeSceneIdx = findIndex(scenes, id)`.

Scene panel (tablist above blocks):
- Tabs: one per scene, role="tab", aria-selected for active
- Add button: appends new scene with one empty rich_text block, max 20
- Scene controls below tab bar: rename input, move left/right buttons, delete button (disabled if only 1 scene)

All block operations (`deactivateIsland`, `materializeCurrentDocument`, `updateBlock`, `deleteBlock`, `moveBlock`, `handleBlockDragEnd`, `addBlock`, auto-save effect) updated to use `activeSceneIdx` rather than `scenes[0]`.

Scene CRUD: `handleAddScene`, `handleDeleteScene`, `handleRenameScene`, `handleMoveScene`.

## Serialization

`serializeNarrative` / `toNarrativeCanonicalValue` already iterate all scenes — no change. Markdown export (`narrative/markdown.rs`) already iterates all scenes — no change.
