# Specification — Lossless Portable Package

## Product contract

One package contains exactly one committed Basic Leaf or Narrative Canvas document. Export preserves schema-version-1 canonical JSON, the existing Rust Markdown projection, supported referenced images as privacy-sanitized visual payloads, a strict versioned manifest, a complete SHA-256 inventory, and a deterministic README.

Import is previewed without database mutation and may commit only to a selected active, non-root Life leaf with no active children and no Basic Leaf or Narrative document row, including archived rows. Import creates new local document authority, remaps recognized asset references, preserves Canvas scene/block/timeline identities and presentation semantics, and never changes the target node title or tree placement.

## Architecture

- Rust owns ZIP creation, inventory/path validation, checksums, canonical validation, asset validation, bounded opaque staging, and transactional commit.
- Export bytes use `tauri::ipc::Response`; import preview requires a raw `tauri::ipc::Request` body.
- React uses a hidden browser file input and Blob download. It receives no staging or filesystem path.
- ZIP v1 uses exact-pinned `zip` 5.1.1, Stored entries only, fixed metadata, no encryption, no comments, and no directory entries.
- The archive layer performs no SQL. The repository layer performs no ZIP parsing.
- Schema remains 16 and no migration, dialog/filesystem plugin, Base64 path, or frontend ZIP dependency is allowed.

## Exact commands

`prepare_portable_package_export`, `read_portable_package_export`, `preview_portable_package_import`, `confirm_portable_package_import`, and `discard_portable_package_import` are the complete portable command inventory.

## Format

The only permitted entries are `README.md`, `checksums.json`, `content/document.json`, `content/document.md`, `manifest.json`, and zero or more `assets/<source-asset-id>.<canonical-extension>` files. Entry order is lexicographic. `checksums.json` covers every other entry exactly once.

## Limits and safety

The package cap is 64 MiB, total declared entries are capped at 64 MiB, entry count at 262, assets at 256, and normalized paths at 240 bytes. Stored-only inventory validation rejects traversal, absolute/backslash/control paths, duplicates, directories, links, encryption, unsupported methods, unexpected inventory, malformed/future metadata, divergent Markdown, and inconsistent assets before commit.

## Midnight anchor

`useLocalDateRollover()` schedules the next local midnight plus one second, recomputes after every refresh, refreshes on focus/visible, and cleans up listeners/timers. It never assumes a 24-hour day.
