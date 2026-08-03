# Tasks — Spec 012

## Task 22 — Narrative Canvas Markdown Interoperability (complete)

- Fix `asset:` → `assets/` in `narrative::markdown::export` image rendering
- Add `sanitize_file_name` / `sanitize_file_stem` to `narrative::markdown`
- Add `import_as_canvas` to `narrative::markdown` (delegates to `document::markdown::import`)
- Add 4 new DTOs to `narrative/dto.rs`
- Add `import_from_markdown` and `export_to_markdown` to `narrative/repository.rs`
- Add 3 IPC handlers to `narrative/service.rs`
- Register 3 commands in `build.rs`, `capabilities/main.json`, `lib.rs`, `ipc/mod.rs`
- Generate TS bindings via `cargo test export_ipc_bindings`
- Add 3 command wrappers to `frontend/src/ipc/commands.ts`
- Create `NarrativeMarkdownExportButton.tsx`
- Create `NarrativeMarkdownImportDialog.tsx` + CSS + tests
- Update `NarrativeCanvasReader.tsx` with export button
- Update `BasicLeafReader.tsx` empty-leaf state with import control
- Update ADR, audit, STATUS.md, ROADMAP.md
