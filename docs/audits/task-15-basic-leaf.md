# Task 15 — Basic Leaf Document Core + Read/Edit/Recovery

## Scope and identity

- Source-derived execution title: `Basic Leaf Document Core + Read/Edit/Recovery`, taken from M6 Basic Leaf and the first unopened Basic Leaf contracts.
- Starting HEAD: `9c7bb8421ec275fe188699eb0c25e21e020f4755`.
- Final implementation HEAD: `624e573b6ac746b35e6f46f510e8019832d44390` (this evidence commit follows it).
- ADR 0005 selects versioned, whitelisted ProseMirror/Tiptap JSON as Core authority. Narrative Canvas remains inactive.

## Migration, revision, and recovery authority

- Immutable migration 9 adds one active document per Life leaf, bounded committed revisions, a separate recovery draft, idempotent save operations, local asset metadata and document-asset references. Released migrations 1–8 were not edited.
- The Core schema is capped at 1 MiB, nesting depth 64 and 10,000 nodes; tables are capped at 100×20. History retains the latest 50 committed revisions.
- Save validates leaf identity/schema/assets and expected revision, snapshots the prior committed state, reconciles asset references and clears only a matching draft in one DB transaction.
- Draft persistence does not advance the committed revision. Matching drafts can be recovered or discarded; stale-base drafts remain preserved as an explicit conflict.
- Migration triggers prevent a documented leaf from silently gaining an active child. Archived leaves retain authority but do not expose their document until restored.

## Reader, editor, and interoperability

- Reader uses a semantic static React renderer and never creates a Tiptap instance. Corrupt/unsupported content becomes a repairable placeholder.
- `BasicLeafEditor` is a separate lazy Vite chunk and permits only the Core toolbar. Draft save is debounced at 1 second, committed idle save at 3 seconds, and explicit Save remains available with accessible Saving/Draft saved/Saved/Error states.
- Exact-pinned Tiptap 3.29.2 packages implement focused editing. Exact-pinned unified 11.0.5, remark-parse 11.0.0, remark-gfm 4.0.1 and remark-stringify 11.0.0 live in a second on-demand Markdown chunk.
- Markdown adapters reject executable HTML/MDX, traversal and remote-image fetches. Supported headings, marks, lists, quotes/callouts, inert code, local stable-ID images and GFM tables round trip semantically.
- Production bundle evidence: main `484.25 kB`, lazy editor `442.79 kB`, lazy Markdown `116.54 kB` (minified). Neither editor nor remark pipeline is in the ordinary startup chunk.

## Assets and backup/restore

- Rust sniffs bytes, fully decodes one of PNG/JPEG/WebP/GIF, enforces 10 MiB and 12,000×12,000 limits, hashes with SHA-256, deduplicates exact bytes and stores originals only under `assets/original/<stable-id>.<format>`.
- DTOs expose stable IDs and bytes, never paths. Reader creates revocable blob URLs; no remote image is fetched.
- Portable Markdown export stages then atomically publishes Markdown plus stable-ID assets. Exported pixels are decoded/re-encoded, stripping EXIF/XMP/location metadata; the contained local original remains unchanged.
- Backup format 2 lists referenced originals with size/checksum. Restore rejects traversal, duplicate/missing/corrupt/oversized asset sets and cross-checks the manifest against the candidate database before installing immutable originals additively and swapping the database.
- File-backed integration proves committed document, revision, recovery draft and image authority survive backup/restore; missing/corrupt asset packages fail before database mutation.

## Verification evidence

- Frozen install, source integrity, governance, 402-heading index, coverage matrix, security/ACL parity, typecheck and frontend production build passed.
- Frontend: 12 files / 111 tests passed (increased from 94). Tests cover static Reader, no editor before activation, lazy focused Edit, bounded toolbar, Save/error recovery, draft recover/discard/conflict, schema/link safety and unified Markdown normalization.
- Rust: 288/288 full; Task 46/46; Life 85/85; Document-filtered 14/14; backup 135/135. Check, fmt and clippy with warnings denied passed.
- Generated DTO regeneration produced no drift after the implementation commit. Ten exact document command permissions are present in the main Windows capability; raw invoke remains centralized.
- Normal NSIS: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,455,466 bytes.

## Native and file-backed smoke

- Sentinel run `<repo>/target/e2e-data/task15-3d6782b3a7014a2f89c6c792abde11b6`; exact debug E2E binary SHA-256 `B2E65D73F70C965EC1B6F57BECFDBF753D0466916716AD6C707817EE02CBE812`.
- Native root PIDs 3436 and 10016 used the same isolated profile. First launch remained alive 21 seconds; relaunch reopened schema 9. Owned process trees stopped and canonical sentinel containment preceded successful profile deletion.
- Logs contained no startup, migration, document, CSP, ACL, IPC or panic fatal marker.
- Native WebDriver attachment debt prevents automated real-WebView Tiptap clicks. The 111 frontend tests prove Reader/Edit interactions; Rust/file-backed tests prove revision/recovery/assets/Markdown/backup; native smoke proves production-frontend launch, migration, relaunch, liveness and containment.

## Security, scope, and debt

- Document inputs, JSON, Markdown bytes and asset bytes are skipped from tracing. Unsafe links, HTML/MDX, remote images, corrupt codecs, traversal and absolute paths fail closed. Code blocks remain inert and CSP/capabilities remain narrow.
- No scene, template, dashboard, canvas, editor Node View, DnD, search/tag/backlink, cloud, Task/Life relation or arbitrary CSS was added.
- Remaining non-blocking debt: F-04/F-05 durability hardening, independent GitHub CI, native WebDriver attachment, and future user-chosen portable export destination UX (Core currently atomically publishes within contained app data and offers the Markdown download).

Task 15/60 is complete. Narrative Canvas and the whole product are not declared complete. The live roadmap does not name Task 16; Task 16/60 is the only allowed next action.
