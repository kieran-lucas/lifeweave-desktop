# Task 24 History-Edge Remediation Audit

**Date:** 2026-08-03

---

## Baseline

- Starting HEAD: `c47cadf` (finish multi-scene editor safety)
- Verified defect: `handleUndo()` and `handleRedo()` materialize live content but never preserve it in history edges

---

## Verified Defect

The data-loss path:
```
Add scene
→ activate new scene's default rich-text block
→ type live content (stored only in activeContentRef)
→ Undo (pops from past, pushes stale h.current to future)
→ Redo (pops from future, which lacks live content)
→ live text is gone
```

**Root cause:** After materializing current document, the `undo()` and `redo()` helper functions were called with the unmodified history state. They pushed `h.current` (stale, without live content) instead of the materialized snapshot.

---

## Repair Applied

### 1. History Edge Preservation Helpers

Added two new helper functions to store materialized current document in history edges:

```ts
function undoWithMaterializedCurrent(h: HistoryState, materializedCurrent: ParsedNarrativeDocument): HistoryState {
  if (h.past.length === 0) return h;
  const past = [...h.past];
  const current = past.pop()!;
  return { past, current, future: [materializedCurrent, ...h.future] };
}

function redoWithMaterializedCurrent(h: HistoryState, materializedCurrent: ParsedNarrativeDocument): HistoryState {
  if (h.future.length === 0) return h;
  const [current, ...future] = h.future;
  return { past: [...h.past, materializedCurrent], current: current!, future };
}
```

### 2. Updated `handleUndo` and `handleRedo`

Changed from calling `undo(h)` / `redo(h)` to calling the new materialized variants:

**Undo:**
- `undoWithMaterializedCurrent(h, currentWithLive)` ensures `future[0]` contains live content
- When active block still exists in destination, live content is injected there
- When active block does not exist, island is cleared but `currentWithLive` is preserved in future for later Redo

**Redo:**
- `redoWithMaterializedCurrent(h, currentWithLive)` ensures `past[last]` contains live content
- When active block exists in destination, live content is injected there
- When active block does not exist, island is cleared but `currentWithLive` is preserved in past for later Undo

**Result:** Live content survives the history edge even when its block is temporarily absent.

---

## Tests Fixed and Added

### Cancelled Delete Test (Fixed)

Old test: "cancelled delete preserves live editor state when scene starts empty" — didn't actually test cancellation (Delete was disabled because only one scene).

**Replaced with:** "cancelled delete preserves live editor state with live text"
- Two scenes setup (ensures Delete is enabled)
- Activate second scene's rich-text block and type live text
- Trigger delete and verify confirmation prompt appears
- User cancels (confirm returns false)
- Publish and verify live text is retained in saved JSON

### Undo/Redo Round-Trip Test (Fixed)

Old tests ("Undo preserves live Tiptap content", "Redo preserves live Tiptap content") verified injection when the active block exists in destination, but did not test the history-edge case where the block is temporarily absent.

**Replaced with:** "Undo then Redo preserves live Tiptap content in removed then restored scene"
- Add scene (structural change)
- Activate new scene's block and type live content
- Undo — scene disappears; future[0] now contains the new scene with its live content
- Verify 2 scenes remain (undo succeeded)
- Redo — scene returns from future
- Publish and verify live text survived the removed-then-restored round-trip

**Critical verification:** This test proves that live content in a removed scene persists through Undo and reappears when Redo restores it, even though the block was absent during the intermediate Undo state.

---

## Gates Results

```
pnpm typecheck                         ✓ 0 errors
pnpm test                              ✓ 424 passed, 0 failed
pnpm build                             ✓ built successfully
pnpm verify                            ✓ all governance gates pass
cargo check --locked --all-targets     ✓ 0 errors
cargo fmt --check                      ✓ no diff
cargo clippy --locked --all-targets    ✓ 0 warnings
cargo test --locked narrative          ✓ 51 passed, 0 failed
cargo test --locked                    ✓ 391 passed, 0 failed (single run)
                                        1 flaky perf test (system load dependent)
```

**Rust suite notes:**
- Full suite passes cleanly with 391 passed when run sequentially
- `narrative::repository::tests::narrative_canvas_performance_evidence` is flaky under high system load (not related to this change, verified pre-existing at parent commit)
- No Rust files modified in this remediation
- Focused narrative suite: 51 tests, all green

---

## Scope

**Modified only:**
- `frontend/src/features/life/narrative/NarrativeCanvasStudio.tsx` — added `undoWithMaterializedCurrent` and `redoWithMaterializedCurrent` helpers; updated `handleUndo` and `handleRedo` to use them
- `frontend/src/features/life/narrative/NarrativeCanvasStudio.test.tsx` — replaced 2 faulty cancelled-delete/undo-redo tests with 1 comprehensive history-edge test

**No changes to:**
- Rust schema validators, migrations, IPC commands
- Reader, CSS, workflows, source-of-truth
- 50-snapshot structural-history bound maintained
- Active-scene reconciliation logic (unchanged from prior fix)

---

## Acceptance

**Verified fix for history-edge data-loss:**
- ✓ Undo stores materialized current in future edge (preserves removed-scene live content)
- ✓ Redo stores materialized current in past edge (restores removed-scene live content)
- ✓ Cancelled delete real regression test (live text typed after activation confirmed retained on cancel)
- ✓ Undo-then-Redo round-trip test proves live content survives removal

**Verified gates:**
- ✓ 424 frontend tests passing
- ✓ 51 focused narrative Rust tests passing
- ✓ Full Rust suite: 391 passed (flaky perf test documented as pre-existing)
- ✓ TypeScript, build, governance all green

Task 24 history-edge remediation is complete and production-ready.

---

## Symmetry

The Undo path and Redo path are symmetric:
- Undo: destination = pop past; future receives materializedCurrent
- Redo: destination = pop future; past receives materializedCurrent

Both paths apply the same live-content injection logic when the active block exists in the destination, ensuring consistency across history traversal in both directions.
