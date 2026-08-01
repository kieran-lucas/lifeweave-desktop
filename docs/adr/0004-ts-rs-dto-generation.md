# ADR 0004 — ts-rs as the TypeScript DTO generation toolchain

- Status: Accepted
- Date: 2026-08-01
- Decision owner: Product Owner
- Source: immutable specification, LOCKED — Technology

## Context

Typed IPC between the Rust application core and the React frontend requires a mechanism to share type definitions without hand-copying. The immutable source names `ts-rs` explicitly in four separate places as a LOCKED technology choice. No alternative is proposed in the source; hand-copying is explicitly prohibited.

## Decision

Use the `ts-rs` crate to derive TypeScript type definitions from Rust structs and enums.

Rules that follow from the source and do not require re-decision:

- Rust types annotated with `#[derive(TS)]` export to `frontend/src/ipc/generated/`.
- Generated files are committed to version control and never hand-edited.
- `ts-rs` must not be linked into the production release binary; the exact Cargo dependency section (`[dev-dependencies]`, feature flag, or other isolation) is decided during Foundation Proof implementation.
- A CI generation check confirms generated output matches source after any Rust DTO change; the specific command is established during Foundation Proof.
- Date/time DTO shapes use explicit branded types, not bare `string`.
- Enum types include an unknown-variant arm to handle version mismatches without a panic.

## Source authority

The following locations in the immutable specification (SHA-256 `9c422927…`) independently name `ts-rs`:

| Location | Content |
|---|---|
| Stack table, line 78 | `IPC — Tauri Commands + Channels + Events + ts-rs DTO bindings` |
| IPC contract, line 255 | `DTO Rust sinh TypeScript bằng ts-rs; không hand-copy interface.` |
| Typed boundary, line 3837 | `DTO Rust derive ts-rs và export vào generated directory.` |
| IPC-067 invariant, line 4550 | `Typed DTO ts-rs` |

## Consequences

- Rust types are the single authority for IPC shape.
- TypeScript frontend consumes generated contracts; the `ipc/generated/` directory is a build artifact kept in source control for review.
- Any Rust DTO change requires regeneration before the corresponding frontend feature compiles.
- A generation step is added to CI when Foundation Proof introduces the first DTO.

## Rejected alternatives

- Hand-written TypeScript interfaces: prohibited by source contract (line 255) and invariant IPC-067.
- Alternative crates (`specta`, `uniffi`, `typeshare`): not named in source. Adoption requires a superseding ADR with: evidence of equivalent type safety, stable output comparison against existing generated files, and Product Owner acceptance.

## Rollback

A different generation toolchain may supersede this ADR only through a replacement ADR that includes: a complete migration of all existing generated types, equivalent safety guarantees, and Product Owner acceptance.
