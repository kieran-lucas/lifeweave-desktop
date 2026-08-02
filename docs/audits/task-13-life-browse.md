# Task 13 — Life Browse Core + Pinned Navigation

## Scope and execution identity

- Starting HEAD: `3183ed82cb4784d3911205ee64b7aed2831a2512` on `main`.
- Implementation commit: `6861a40ceffb5ec92b68ac7f8865ee65dea1cf20`.
- The roadmap named only Task 13/60. The execution title is derived from source-of-truth §§4.4, 9.1–9.7, 15.5 and M4 Life Browse.
- Included: Life node authority, protected root, bounded two-level Browse, breadcrumb/history, restart position, Pinned mode, and the leaf Reader shell.
- Excluded: Life Edit, full-tree rendering, reparent/reorder, drag-and-drop, Narrative Canvas, rich documents, Task/Life coupling, search, and visual-world work.

## Migration, root, and mutation authority

Immutable migration 7 adds `life_nodes`, `life_tree_meta`, `life_node_pins`, and `life_navigation_preferences`. Adjacency-list `parent_id` is authoritative. A partial unique root index and protection triggers enforce one non-reparentable/non-archivable root. The only seed is the stable neutral `life-root`; no personal branches are invented.

Node IDs are Rust UUIDv7 values. Titles, short descriptions (maximum three lines), icon registry keys, theme keys, parent activity, and optimistic revisions are checked before parameterized writes. Create, rename, summary update, subtree archive, requested-node restore, pin and unpin run on the dedicated database worker. Tree-changing mutations increment `tree_revision` once; idempotent pin replay does not create a duplicate or false revision. Archive preserves every subtree row and pin. Restore activates only the requested node and rejects an archived parent.

The typed mutation command catalog is registered in Tauri’s command manifest and Windows `main` capability. Task 13 deliberately exposes only pin/unpin controls in Browse; the other commands establish backend authority for a later dedicated Edit slice.

## Bounded Browse and query evidence

`LifeBrowseProjection` contains the selected active node, optional parent, direct active children, breadcrumb, selected pin state, bounded page metadata, tree revision, fallback flag, and restart context. It never returns descendants beyond the direct child level. Pages contain at most eight children in stable `(sort_key, id)` order.

The child projection and child counts execute in one bounded SQL statement. Breadcrumb fields and relationship metadata are returned by one recursive CTE capped at 128 ancestors. Pinned nodes use one lazy query. `EXPLAIN QUERY PLAN` confirms the direct-child lookup uses `life_nodes_children`; there is no renderer per-child query.

Fallback resolves a requested or remembered active node, then its nearest preserved active ancestor, then `life-root`. Malformed and unknown IDs also converge to root. A content-free warning is emitted when fallback occurs; node titles and descriptions are skipped from tracing.

## Navigation, Pinned, and Reader behavior

Life uses a dedicated session stack rather than browser URL history. Successful navigation persists node ID, `browse | pinned | reader` mode, path version, and a bounded optional focus anchor. Returning to Life restores the last valid context without changing the user’s normal Task sidebar preference.

Browse renders one visually dominant focal node and only its direct child list. A single centralized `ResizeObserver` measures the scene and draws decorative, pointer-inert SVG connectors. Motion for React `12.43.0` supplies node-ID `layoutId` continuity; CSS and `useReducedMotion` provide the reduced-motion path. Navigation is operation-gated without freezing unrelated controls, and focus moves to the new focal node.

Pinned is a lazy local Life mode, not a main-sidebar destination. Pins reference nodes and remain diagnosable after archive; unavailable pins can be removed. Active branches return to Browse and active leaves open Reader. Reader shows only icon, title, short summary, breadcrumb context, Back, and an honest content-not-created state. It adds no document/editor schema and returns to the exact prior Browse/Pinned entry and focus anchor.

## Verification evidence

- Frozen pnpm install and `pnpm verify`: passed; immutable source hash, governance, 402-heading index, coverage matrix, strict CSP/no-remote checks, and exact command/capability parity are green.
- Frontend: typecheck passed; 8 files / 78 tests passed. Twelve focused Life tests cover root honesty, two-level rendering, branch navigation, Back/breadcrumb, Reader return, pins/unavailable pins, paging, fallback, persisted navigation, and the absence of Edit/full-tree controls.
- Rust: check `--all-targets`, fmt check, clippy `--all-targets -- -D warnings`, and the full 255-test suite passed. Task-focused tests remain 46; the Life repository has 11 focused tests; backup-focused tests are 130 and include `life_tree_pins_and_navigation_survive_backup_restore`.
- Rust proof covers pristine/schema-6 upgrade through migration 7, protected singleton root, UUID CRUD/revisions, stable ordering, direct-only projection, recursive breadcrumb, nearest-ancestor/root fallback, atomic subtree archive rollback, restore policy, idempotent pins, restart preferences, eight-child paging, indexed query plan, file reopen, and backup/restore.
- Generated TypeScript DTOs and generated Tauri permissions are committed from their generators; post-commit drift check is clean.
- Normal `pnpm tauri build` passed in 172.2 seconds and produced `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` (3,341,533 bytes) without E2E features.
- Sentinel-contained native smoke used synthetic run `task13-relaunch-28419d6460e64acbba100ff8f4fedf0b`. The Rust authority created branch/child/leaf fixtures, a pin, and remembered Browse position in schema 7. Session 1 PID 20964 remained alive for 21 seconds; after its 18-process owned tree stopped, session 2 PID 11236 relaunched against the same profile and lived 6 seconds. Its 18-process tree also stopped; no fatal startup/migration/Life/CSP/ACL/IPC/panic signature appeared; containment and sentinel checks passed before profile removal.
- Native WebDriver attachment debt prevents automated real-WebView DOM click-through. Deterministic frontend tests prove Browse/Pinned/Reader interaction, file-backed Rust tests prove persistence/fallback/backup, and native smoke proves migration, relaunch-compatible data, liveness, and containment.

## Security, performance, and remaining debt

- No full-tree payload/render, N+1 child query, Task/Life foreign key, node-content trace, remote asset, raw path, editor/graph library, persistent coordinate, or background ambient animation was added.
- Connectors are decorative and cannot intercept focus or pointer input; the centralized observer disconnects on unmount.
- Existing non-blocking debt remains F-04 Windows directory durability, F-05 backup publication durability, independent GitHub CI, and native WebDriver click-through evidence.

Task 13/60 is complete when this evidence commit is pushed. Life Edit, full-tree UI, Narrative Canvas, Basic Leaf content, the final visual-world engine, and the entire Life System are not declared complete. The live roadmap still does not name Task 14; only Task 14/60 is the next allowed action.
