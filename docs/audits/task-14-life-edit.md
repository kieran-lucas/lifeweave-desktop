# Task 14 — Life Edit Core + Full-Tree Reparent/Reorder

## Scope and HEAD

- Source-derived title: `Life Edit Core + Full-Tree Reparent/Reorder`, from the first unopened Life Edit and M5 contracts in source-of-truth §§10.1–10.5 and §15.5.
- Starting HEAD: `a81c9b0cbba69391f55418f7d181cc8292b80b47`.
- Final implementation HEAD: `b02a5db3b3c571b4a1a79410fbb00b43444a9f6e`.
- Browse remains selected-node plus direct children; only Edit receives the complete active tree.

## Migration and operation authority

- Immutable migration 8 upgrades schema 7, permits persisted `edit` mode, and adds `life_operations` without modifying migration 7.
- `life_nodes` remains current authority. Every successful mutation writes one bounded inverse record and increments `tree_revision` once in the same transaction.
- Strict unique operation IDs make replay idempotent. The renderer receives only an opaque undo token. Latest-only undo rejects stale, foreign and double use and increments the tree revision once.
- Inverse data is capped at 256 KiB, subtree archive undo at 4,000 nodes, and retained inverse authority at 100 operations. Older identities remain for replay detection after inverse compaction.
- Root archive/movement, inactive parents, stale revisions, self-parenting and recursive descendant cycles are rejected.

## Projection and structural behavior

- `LifeEditProjection` returns deterministic preorder active rows, a separate archived list, tree revision and latest undo token through one DB-worker command.
- Depth, active child counts, leaf and pin state are derived without per-node IPC. Query plans use `life_nodes_children` and `life_operations_target`.
- Reorder changes one sibling set and treats the effective position as a no-op. Reparent atomically validates, moves, rebalances old/new sibling sets and preserves descendants.
- Archive preserves rows and pins; restore affects only the requested node and requires an active parent. Undo archive restores exactly the prior active subtree.
- Backup/restore tests prove tree, pins, preference and operation-ledger undo survive a package round trip.

## Edit workspace and accessibility

- Life exposes separate Browse, Edit and Pinned modes. Edit starts near current Browse context and returns to a valid Browse node.
- Exact-pinned `d3-hierarchy 3.1.2` derives vertical coordinates from flat rows. Semantic HTML cards and pointer-inert decorative SVG connectors persist no coordinates.
- Exact-pinned dnd-kit (`core 6.3.1`, `sortable 10.0.0`, `accessibility 3.1.1`) supplies PointerSensor, KeyboardSensor, DragOverlay, parent/sibling zones, preview connector, instructions and frontend descendant exclusion; Rust repeats validation.
- Motion and DnD use separate transform owners. Reduced Motion uses immediate geometry and restrained feedback; hidden Edit mode is unmounted.
- The inspector supports create child, explicit title/details save, bounded local icon/theme variants, archive and restore. Keyboard alternatives move up/down, to parent level, or into a valid parent through the same Rust commands.
- Focus returns to the affected node after authoritative reflow and the workspace has one scroll owner.

## Performance and query evidence

- Rust fixtures project 100, 500 and 2,000-node trees under the per-fixture three-second ceiling; the required Life-filtered suite completes in about one second on the audit machine.
- Frontend fixtures construct 100, 500 and 2,000-node d3 hierarchies with stable output. Parent/child maps are built once; there is no per-node IPC.
- Measured Core fixtures do not justify premature virtualization, preserving DnD and keyboard parity.

## Exact verification evidence

- Frozen install, `pnpm verify`, typecheck and production frontend build: passed. Governance includes source integrity, 402-heading index, coverage matrix and security/ACL parity.
- Frontend: 9 files / 94 tests passed, increased from 78.
- Rust check/fmt/clippy: passed. Full Rust: 272; Task: 46; backup: 131; required `life` filter: 85.
- An initial parallel full-Rust run exposed residual thread-local backup failpoints on reused test threads. Test fixture initialization now resets them; repeated full and focused backup suites pass without a restore production-code change.
- Generated bindings have no post-generation drift.
- Normal production NSIS build passed: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 3,454,928 bytes.

## Native and file-backed smoke

- Sentinel profile: `<repo>/target/e2e-data/task14-fcf594d44b8445538321c48362d45414`; binary SHA-256 `6D58F63837EE1567DD555962BD3D3AD3A3D2B38AF8ACB09465F5994D9A3E60B0`.
- Distinct native root PIDs `12640` and `3960`; first-session liveness 21 seconds, then same-profile relaunch.
- File-backed authority created a multilevel tree, reordered, reparented, rejected a descendant cycle, undid, pinned and saved Edit preference; reopen verified persistence.
- Seventeen exact owned processes were stopped. Logs had no startup, migration, Life, CSP, ACL, IPC or panic fatal marker. Canonical containment and sentinel checks preceded profile deletion.
- WebDriver attachment debt prevents real-WebView drag automation. Frontend tests prove pointer/keyboard DnD; Rust/file tests prove transaction, cycle, undo and persistence; native smoke proves launch/relaunch and containment.

## Security, scope and debt

- Renderer writes are minimal typed intents with expected revisions; no SQL, path, raw CSS or coordinates cross IPC. Life inputs are skipped from tracing and no node content is logged.
- Generated ACL grants only the six new exact commands; raw `invoke()` remains centralized.
- No full-tree Browse payload, React Flow, force simulation, Narrative Canvas, Tiptap, Task/Life relation, remote resource or persistent coordinate was added.
- Remaining non-blocking debt: F-04/F-05 durability hardening, independent GitHub CI, native WebDriver attachment, and future measured visual refinement for very large trees.

## Final disposition

Task 14/60 is complete. Narrative Canvas, Basic Leaf content, final visual worlds, Task/Life linking and the whole Life System are not declared complete. The live roadmap does not name Task 15; Task 15/60 is the only allowed next action.
