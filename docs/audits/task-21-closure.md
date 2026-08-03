# Task 21 Closure Audit

**Date:** 2026-08-03

**Checkpoint sequence:**
- `f1438da` — initial candidate (FAIL — 6 P1 defects)
- `7314b26` — first remediation candidate (FAIL — 3 further P1 defects)
- `dc807ad` — second remediation candidate (FAIL — structural gaps in reader, restore guards, test coverage)
- accepted Task 21 checkpoint (this commit)

---

## Closure changes

| Category | Change |
|----------|--------|
| Reader parity | `NarrativeCanvasReader` removes custom `RichTextReader`; routes rich_text and callout islands through `parseDocument` + `StaticDocument` |
| Migration 14 | Immutable `life_node_id` for all rows; comprehensive restore guards (root, children, cross-content) |
| Studio tests | Architecture tests: one-active-island, active-island in Save/draft, Tiptap-does-not-push-structural-history, retry operation ID, unknown block round-trip, image import, timeline CRUD, performance evidence |
| Conflict tests | BasicLeafReader routing: neither/leaf-only/canvas-only/both/basic-error/canvas-error |
| Search tests | Canvas indexing: title, scene, all block kinds, Vietnamese, draft/archived/unknown exclusion |
| Backup/relaunch | File-backed: 5+1 blocks, image asset, revision+draft, close/reopen, backup/restore, semantic equality, unknown equality, asset equality, search rebuild |
| Performance | Rust validation/save p95 ≤ 50 ms recorded; frontend parse+serialize p95 ≤ 50 ms recorded |
| Specs | acceptance.md rewritten with 64-item final gate; risk-register.md created |
| ADR | ADR 0014 accepted |

## Verification Results

```
cargo check --locked --all-targets     ✓ 0 errors
cargo fmt --all -- --check             ✓ no diff
cargo clippy --locked --all-targets    ✓ 0 warnings
cargo test --locked                    ✓ 369 passed, 0 failed
pnpm typecheck                         ✓ 0 errors
pnpm test                              ✓ 378 passed, 0 failed  (26 new tests)
pnpm build                             ✓ built in 1.86s
pnpm verify                            ✓ all governance gates pass
pnpm tauri build                       ✓ NSIS built in 5m 29s
```

## Bundle evidence (from `pnpm build`)

| Chunk | Size (raw) | gzip | Notes |
|-------|-----------|------|-------|
| index-DDGXnyQL.js | 494.16 kB | 152.32 kB | Main chunk — no Tiptap |
| dist-CnAUIFbr.js | 390.83 kB | 122.43 kB | Tiptap/ProseMirror vendor — lazy, loaded with Studio only |
| NarrativeCanvasStudio-DbOdmmfM.js | 14.96 kB | 4.67 kB | Studio — lazy chunk |
| BasicLeafEditor-nTMIE5a7.js | 52.35 kB | 17.25 kB | BasicLeafEditor — lazy |
| markdown-C2y7R8us.js | 116.54 kB | 33.34 kB | Markdown import/export — lazy |
| GlobalSearchDialog-vJK9c9z3.js | 4.00 kB | 1.72 kB | Search dialog — lazy |
| commands-CF57p4Mh.js | 10.73 kB | 3.90 kB | IPC commands |

**Tiptap proof:** `dist-CnAUIFbr.js` (Tiptap/ProseMirror, 390 kB) is absent from the main chunk and from the Reader path. It loads only when `NarrativeCanvasStudio` is first imported. The Reader (`NarrativeCanvasReader`) is part of the main chunk and has no Tiptap dependency.

**Prototype modules:** absent from all production chunks.

## NSIS evidence

- Path: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`
- Size: 4.38 MB
- Build duration: 5m 29s (release profile, x64)

## Native smoke

Proven by file-backed Rust tests (`narrative_canvas_backup_relaunch_evidence`):
- Migration 14 applied cleanly
- Canvas created with 5 known blocks + 1 unknown block (`future_v2` with `extraField` and `nested.a`)
- Image asset stored and bytes verified
- Revision 1 saved; draft saved
- Connection closed (drop) and reopened — state intact
- Backup created to temp path
- Revision 2 saved (mutation)
- Restored from backup — revision 1 restored, canonical JSON semantically equal, unknown raw fields intact (`extraField`, `nested.a`), asset bytes equal
- Search rebuild after restore returns canvas title

## Acceptance gate status

All 64 acceptance criteria in `specs/011-narrative-canvas-core/acceptance.md` verified. Task 21 is complete.
