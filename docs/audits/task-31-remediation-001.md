# Task 31 Remediation 001 — Portable Package Integrity and Lifecycle Closure

## Verdict

**PASS.** The four audited Task 31 findings are closed. Task 31 remains accepted, schema remains 16, Task 32 is not started, and the next action remains Product Owner gate.

## Findings and root causes

1. **Deduplicated asset backing authority was not verified.** `install_prepared_asset_in_tx` trusted checksum-row metadata without reading the retained file. It now queries status, MIME, dimensions, relative path, checksum, and byte size, then delegates containment, symlink, and checksum verification exclusively to `read_verified_original`; verified length must also match. Any invalid checksum match fails closed without repair, duplication, document, join, or new file.
2. **Portable crash staging lacked startup cleanup.** Existing cleanup ran only during later portable operations. A crate-internal best-effort entrypoint now cleans both portable roots before restore/database opening. Each directory inspects at most 1,024 direct children, accepts only UUIDv7-owned names, ignores symlinks/unknown entries, preserves the strict 24-hour threshold, and never propagates startup failure.
3. **Manifest title length used UTF-8 bytes.** Validation used `String::len()`. It now applies non-empty trimmed content, `chars().count() <= 200`, and no control characters. The 120-character filename sanitizer is unchanged.
4. **Frontend refresh rejection could misreport committed import failure.** Backend confirmation and invalidations shared one catch. Confirmation is now the sole commit boundary; success immediately clears preview/import/operation identity. Three invalidations run with `Promise.allSettled`; any rejection produces an accessible committed-success warning, while confirmation rejection retains retry authority and unchanged-leaf error copy.

## Changed files

- `src-tauri/src/document/assets.rs`
- `src-tauri/src/portable/domain.rs`
- `src-tauri/src/portable/manifest.rs`
- `src-tauri/src/portable/service.rs`
- `src-tauri/src/portable/mod.rs`
- `src-tauri/src/lib.rs`
- `frontend/src/features/life/portable/PortablePackageControls.tsx`
- `frontend/src/features/life/portable/PortablePackage.test.tsx`
- `specs/021-lossless-portable-package/remediation-001.md`

## Focused evidence

- `cargo test --manifest-path src-tauri/Cargo.toml --locked document::assets`: 4 passed, 0 failed.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked portable`: 29 passed, 0 failed, 2 evidence tests ignored.
- `pnpm --dir frontend test -- PortablePackage`: 12 passed, 0 failed.
- `pnpm --dir frontend test -- useLocalDateRollover`: 4 passed, 0 failed.

The asset matrix covers valid reuse; deleted/modified backing files; unusable status; MIME, width, height, and byte-size mismatch; unchanged row/file counts; no document/join/operation on portable confirmation failure; and rollback preservation of a valid pre-existing asset. Cleanup coverage includes stale ZIP/ticket/staging, stale import directory, fresh/unknown/unrelated preservation, missing directories, idempotency, strict age semantics, and the 1,024-child cap. Manifest coverage includes 100 and exactly 200 non-ASCII characters, 201-character rejection, controls, whitespace, ASCII, and character-based filename truncation. Frontend coverage includes successful refresh, one/all refresh rejection, backend rejection/retry, immediate preview closure, no post-success discard, three invalidation attempts, duplicate-confirm prevention, and axe-clean dialog behavior.

## Full evidence

- `pnpm source:verify`, `pnpm governance:check`, and `pnpm index:check`: passed; source SHA-256 remains `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`, schema 16, 402 headings.
- `pnpm verify`: passed strict security/no-remote/hardening checks unchanged.
- `pnpm typecheck`: passed.
- `pnpm test`: 31 files, 468 passed, 0 failed.
- `pnpm build`: passed; 822 modules transformed.
- `cargo check --manifest-path src-tauri/Cargo.toml --locked --all-targets`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked`: 444 passed, 0 failed, 3 evidence tests ignored.
- `pnpm hardening:performance`: passed; main JS 515,638 bytes, total JS 1,110,999 bytes.
- Portable and Narrative release-performance reruns were skipped because this remediation changes neither archive construction/image processing nor Narrative validation/render algorithms; existing Task 31 evidence remains applicable.

## Release evidence

- `pnpm e2e:windows`: passed all five isolated Windows phases, including portable image round trip and fresh-process persistence, with WebView2/EdgeDriver `150.0.4078.105`.
- `pnpm tauri build`: passed; unsigned NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,783,749 bytes, SHA-256 `d7a9f6a1a41463cf26e5862528e308b08c813734d5c023cd92dcdb0ba79b55a7`.
- `pnpm hardening:rc`: passed run `core-rc-ec1f261bad434cce8a6d0d8aaad598d1`; two isolated 25-second reopen sessions; 25 document/portable-adjacent, 142 backup/restore, 60 Narrative, and 11 portable tests passed, with two designated performance tests ignored.

## Commits

- Implementation commit: `8d4ff9703635e3f671a571d05783a40d327dc295` (`harden portable package edge cases`).
- Closure commit: the commit containing this audit; resolve exactly at read time with `git rev-parse HEAD` to avoid a self-referential hash field.

## Remaining debt

- P0: none.
- P1: none.
- P2: physical screen-reader and physical alternate-DPI validation.
- P3: maximum-fixture peak working-set observation remains unavailable.

No migration, dependency, command, plugin, permission, capability, format change, compressed/encrypted ZIP behavior, or Task 32 implementation was added.
