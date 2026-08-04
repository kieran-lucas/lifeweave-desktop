# ADR 0025 — Lossless Portable Package

**Status:** Accepted for Task 31
**Date:** 2026-08-04

## Decision

One portable package represents one committed Life leaf document: Basic Leaf or Narrative Canvas. Schema-versioned canonical JSON is import authority; Markdown is a human-readable fallback and must exactly match the current Rust exporter. Referenced images are privacy-sanitized visual payloads with manifest identity, dimensions, MIME, reference count, and SHA-256 authority.

Import creates a new document only on a user-selected active empty Life leaf. It does not import, create, rename, or place the target Life node. Source document IDs become provenance only; local document IDs are new. Asset references are remapped from validated manifest identities and may reuse a usable local asset only when checksum, MIME, and dimensions prove identical payload authority. Drafts, revisions, operation history, tree structure, Tasks, analytics, settings, and backup state are excluded.

Rust owns archive creation/validation and bounded opaque staging. Tauri raw request/response IPC avoids JSON/Base64 binary inflation; React uses a hidden browser file input and Blob download. V1 admits only Stored ZIP entries, fixed header metadata, and no encryption, comments, or directory entries. No filesystem or dialog plugin is granted.

The exact dependency is `zip = 5.1.1` with default features disabled. Its MSRV 1.83 is compatible with the project Rust 1.85 toolchain, and all archive use is isolated behind the portable module. Canonical and asset validation reuse existing document authorities. Target validation, identity remap, asset rows, document row, joins, and existing operation authority commit transactionally; new asset files are durably published before commit and tracked for bounded rollback.

## Consequences

The package is document interchange, not backup. Package assets intentionally do not preserve original metadata bytes. No migration is added and schema remains 16. No broad capability, plugin, frontend ZIP dependency, compression codec, cloud behavior, or Task 32 feature is activated.
