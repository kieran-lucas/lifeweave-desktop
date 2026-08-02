# Task 8 — Task Core + Today Vertical Slice

## Scope

Implemented on `main` from the Task 7 shell baseline. This slice adds schema migration 3, a dedicated Rust task domain/repository/IPC surface, and a Today timeline with create/edit/delete and exact-interval grouping.

## Invariants

- Local dates are machine-local `YYYY-MM-DD`; task times are minutes from 04:00 through 24:00.
- Overlapping non-identical intervals are rejected; touching and exact-group intervals are allowed.
- Categories are backend-seeded (`General`) and active-category validated.
- Task data is separate from FoundationRecord storage and uses typed IPC DTOs.

## Evidence

- Rust: `cargo test --locked` — 198 passed; backup-focused suite — 127 passed.
- Frontend: typecheck passed; Vitest — 25 passed across 3 files; production Vite build passed.
- Today now uses TanStack Query server-state authority, a date-aware form, exact-minute hour/minute controls, focus-trapped dialog behavior, session-only selection, semantic grouped timeline rows and accessible category/assessment columns.
- `pnpm verify`, fmt, clippy, generated bindings and `git diff --check` passed.
- Production Tauri build was run; NSIS output is under `src-tauri/target/release/bundle/nsis/`.
- Native smoke uses the existing isolated synthetic profile and does not exercise real user data.

## Boundary

Task 9 may extend the Task System beyond this first vertical slice. Recurrence, reminders, completion assessment, Calendar behavior, Analytics, Life domain and final visual branding remain out of scope.
