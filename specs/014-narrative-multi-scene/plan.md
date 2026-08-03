# Plan 014 — Narrative Multi-Scene Composition

## Implementation

1. `src-tauri/src/narrative/schema.rs` — relax `> 1` to `> 20`, update error message
2. `frontend/src/features/life/narrative/schema.ts` — relax `!== 1` to `=== 0 || > 20`
3. `frontend/src/features/life/narrative/NarrativeCanvasReader.tsx` — `StaticCanvasView` iterates `doc.scenes`
4. `frontend/src/features/life/narrative/NarrativeCanvasStudio.tsx` — add `activeSceneId` state, `activeSceneIdx` derivation, update all 8 `scenes[0]` sites, add scene CRUD callbacks, add scene tab bar + controls UI
5. `frontend/src/features/life/narrative/NarrativeCanvas.css.ts` — add scene panel styles (`sceneTabBar`, `sceneTab`, `sceneTabActive`, `sceneTabAdd`, `sceneControls`, `sceneRenameInput`, `srOnly`)
6. Tests: Rust schema (4 new), TS schema (4 new + 1 round-trip), Reader (2 new), Studio (11 new multi-scene tests)
7. Docs: specs/014-*, ADR 0019, audit, STATUS, ROADMAP
