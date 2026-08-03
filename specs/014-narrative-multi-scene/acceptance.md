# Acceptance — Spec 014 Narrative Multi-Scene Composition

## Functional

- [ ] `validate()` accepts 1, 2, and 20 scenes; rejects 0 and 21
- [ ] `parseNarrative()` accepts 2 and 20 scenes; rejects 0 and 21
- [ ] `serializeNarrative` round-trip preserves all scenes and their blocks
- [ ] Reader renders one `<section>` landmark per scene; titled scenes have visible h2; untitled scenes have sr-only h2
- [ ] Studio renders one tab per scene; first tab selected on load
- [ ] Clicking a tab switches the block area to that scene's blocks
- [ ] Add scene button appends a new scene tab and selects it; disabled at 20
- [ ] Delete scene button removes the active scene; disabled when only 1 scene
- [ ] Rename input updates the active tab label in real time
- [ ] Move scene left/right reorders tabs; disabled at bounds
- [ ] Block operations (add, delete, move, drag) act on the active scene only
- [ ] Publish serializes all scenes into canonical JSON
- [ ] Undo/Redo work across all scene mutations

## Non-regression

- [ ] Single-scene existing documents open and save correctly
- [ ] All existing Narrative tests still pass
- [ ] Markdown export/import unaffected
- [ ] Search integration unaffected (entity_kind = 'reader_document' unchanged)

## Gates

- `cargo test --locked` — 0 failures
- `pnpm test` — 0 failures
- `pnpm typecheck` — 0 errors
- `pnpm build` — clean
- `pnpm verify` — all governance/security gates pass
- `pnpm tauri build` — NSIS artifact produced
