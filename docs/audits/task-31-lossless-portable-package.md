# Task 31 — Lossless Portable Package audit

## Verdict

Task 31 is **PASS WITH EXTERNAL DEBT**. Task 32 is not started. Database schema remains 16 and the next action is the Product Owner gate.

## Implementation checkpoint

- Starting HEAD: `a43e867abaa4915cd4fc062e5a4f4b1ee935575f`
- Feature checkpoint: `a20aac0bf701fa5d7be473e12316ba97637f2958`
- Source SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- Schema: 16; no migration

## Format and safety

Package v1 is a single-document `.lifeweave.zip` using Stored entries only. Its exact inventory is `README.md`, `checksums.json`, `content/document.json`, `content/document.md`, `manifest.json`, and zero or more normalized `assets/<source-id>.<canonical-extension>` entries. Canonical JSON is authoritative; Markdown is regenerated and required to match byte-for-byte. Every non-checksum entry is SHA-256 covered.

Import rejects traversal, absolute/backslash/control paths, duplicates, directories, symlinks/non-regular entries, encryption, non-Stored compression, unknown JSON fields, inventory ambiguity, invalid checksums/sizes, divergent Markdown, corrupt or mismatched assets, and target conflicts. Raw request/response IPC avoids JSON and Base64 byte inflation. Opaque backend staging is bounded to 64 MiB and cleaned only through validated owned paths.

Assets are privacy-sanitized visual payloads. Import remaps recognized canonical references and may reuse only a usable local asset whose checksum, MIME, and dimensions match. New files are durably published before the SQLite transaction commits; rollback receipts remove attempt-owned files while preserving pre-existing deduplicated assets.

## Automated evidence

- `python -m unittest scripts.tests.test_check_project_state`: 14 passed.
- `pnpm source:verify`, `pnpm governance:check`, `pnpm index:check`: passed; source index contains 402 headings.
- `pnpm verify`: passed strict no-remote, CSP/security, and hardening checks.
- `pnpm typecheck`: passed.
- `pnpm test`: 31 files, 465 passed, 0 failed.
- `pnpm build`: passed; 822 modules transformed. Main JS 515,396 bytes; total JS 1,110,757 bytes; portable lazy chunk 2,728 bytes.
- `cargo check --manifest-path src-tauri/Cargo.toml --locked --all-targets`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked`: 437 passed, 0 failed, 3 ignored evidence tests.
- Focused portable suite: 23 passed, 0 failed, 2 ignored evidence tests; document-focused suite: 22 passed.
- `pnpm hardening:performance`: passed bundle budgets.
- `pnpm hardening:narrative-performance`: passed; p95 validation was 70 µs / 986.3 µs / 2.0078 ms for 5/50/128 blocks and five-block save p95 was 489 µs.
- `pnpm hardening:portable-performance`: passed. Small export/preview p95 47.28/1.35 ms; medium export/preview/confirm p95 285.44/103.99/1.82 ms; medium package 7,919,001 bytes. The 50,629,896-byte maximum representative package completed export plus preview in 2,134.26 ms.
- `pnpm e2e:windows`: passed five isolated phases: lifecycle, backup/restore, restart, portable Basic Leaf round trip with image, and fresh-process portable persistence. WebView2/EdgeDriver: `150.0.4078.105`.
- `pnpm tauri build`: passed. Release binary 13,023,744 bytes. Unsigned NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`: 4,783,210 bytes, SHA-256 `c673e87f5a3733b50c556bcf8c2ba3bca48980a77752f6a1a40f040da0ab1519`.
- `pnpm hardening:rc`: passed run `core-rc-81d0075c8d7041a7bac1e5a74a729c0e`; two isolated 25-second reopen sessions; 22 document/portable-adjacent, 142 backup/restore, 60 Narrative, and 8 portable tests passed (two designated performance tests ignored).

The first classic-protocol native rerun exposed a WebDriver selector defect in the new portable assertion: `*=text` is partial-link syntax, although the imported database row was correct. The assertion was corrected to explicit text XPath. Enforcing WebDriver Classic also removed a Node 24/libuv BiDi worker-shutdown assertion without changing product assertions. The final exact command passed.

## Dependency evidence

The only new direct dependency is `zip = 5.1.1` with default features disabled. Its active normal tree is `crc32fast 1.5.0` (`cfg-if 1.0.4`), `indexmap 2.14.0` (`equivalent 1.0.2`, `hashbrown 0.17.1`), and `memchr 2.8.3`. License is MIT; crate MSRV is 1.83 and the project Rust 1.85 gates passed. There is no runtime network behavior. Removal is bounded to the portable module and manifest dependency entry. Task 30 recorded no release-binary baseline; the installer increased 127,286 bytes from 4,655,924 to 4,783,210 bytes.

## Independent archive inspection

Windows `tar -tvf target/task31-inspection.lifeweave.zip` independently listed exactly five no-asset entries, all regular `0644` files, lexicographically ordered, with the fixed 1980-01-01 ZIP timestamp. `tar -xOf` showed readable UTF-8 manifest, Markdown, and canonical JSON. `tar --list --verbose` reported ZIP 1.0 uncompressed/Stored and no archive comment. The isolated inspection package was removed after review and is not tracked.

## Accessibility and manual debt

Automated axe fixtures, keyboard interactions, focus restoration, error/status roles, forced-colors styling, and Reduced Motion behavior passed. Physical screen-reader and physical alternate-DPI validation were not performed and remain external P2 debt. Peak working-set observation for the maximum representative package was unavailable inside the isolated Rust harness and is P3 evidence debt; all hard size and completion requirements passed.

## Scope audit

No database migration, filesystem/dialog plugin, broad capability, frontend ZIP dependency, Base64 package path, compressed writer method, Task 32 implementation, or generated artifact was introduced. Tags, Backlinks, Generic Outline, Graph, Score, Prediction, tree export, database export, merge, and overwrite remain out of scope.
