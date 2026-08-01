# Architecture

## 1. Architecture objective

Provide a Windows local-first application with:

- deterministic domain behavior;
- durable and portable user data;
- visually precise React UI;
- Rust-owned application rules;
- measurable performance;
- strict scope boundaries for AI-assisted development.

## 2. Runtime composition

```text
User input
  → React feature/pattern component
  → typed frontend command adapter
  → Tauri command/channel boundary
  → Rust application service
  → domain validation and transaction orchestration
  → repository/filesystem implementation
  → SQLite / local asset store
  → typed projection + invalidation hints + optional undo token
  → TanStack Query projection cache / local ephemeral state
  → React reconciliation and motion
```

Tauri is the desktop host and security boundary. It is not the domain model.

## 3. Source tree target

```text
frontend/
  src/
    app/                 shell, routing, providers, error boundaries
    design-system/       contracts, tokens, primitives, patterns
    features/
      task/
      calendar/
      analytics/
      life/
      reader/
      settings/
    ipc/                 generated DTOs and typed adapters
    state/               query client and session-only Zustand stores
    testing/             fixtures and render helpers

src-tauri/src/
  domain/                entities, values, invariant logic
  application/           commands, services, undo, orchestration
  infrastructure/
    sqlite/              connection, migrations, repositories, FTS, aggregates
    filesystem/          assets, backup, restore, import/export
    diagnostics/         tracing and diagnostic bundle
  ipc/                   thin Tauri handlers and DTO conversion
  platform/              windows, capabilities, WebView integration
```

## 4. Dependency direction

- Domain imports no Tauri, SQLite, React, or filesystem implementation.
- Application imports domain and ports/traits.
- Infrastructure implements application ports.
- IPC translates and delegates; it contains no business rules.
- Frontend feature modules depend on generated contracts/adapters, not Rust internals.
- Design-system primitives import no feature domain.
- Expansion modules are lazy and may not become Core dependencies.

## 5. State taxonomy

| State kind | Authority |
|---|---|
| Persistent domain | SQLite through Rust |
| Local assets | app data filesystem, indexed by SQLite |
| Async screen projections | TanStack Query |
| Navigation/session preferences | Zustand with versioned local persistence where approved |
| Dialog/form/hover/open | React local state |
| Active rich-text document | editor instance plus revisioned persistence |
| Motion values | Motion/CSS |
| Derived search/analytics | rebuildable SQLite projections |

Never mirror the full database into Zustand.

## 6. IPC

### Commands
Use for request/response queries and atomic mutations.

Every mutation should support where relevant:
- `operation_id` for reconciliation/idempotency;
- `expected_revision` for stale-update detection;
- typed payload;
- typed result;
- typed error union;
- query invalidation hints;
- inverse/undo token.

### Channels
Use for long-running progress:
- backup;
- restore;
- import/export;
- index/aggregate rebuild;
- diagnostic export.

### Events
Use sparingly for genuine broadcast:
- database restored/reopened;
- global asset cache invalidated;
- window lifecycle/platform state.

Components do not call `invoke()` directly.

## 7. Database architecture

### Connection
- bundled SQLite through `rusqlite`;
- dedicated writer worker with bounded queue;
- explicit busy timeout;
- `foreign_keys=ON` asserted;
- WAL;
- `synchronous=NORMAL` for normal operation, stronger procedure for migration/backup;
- checkpoint metrics;
- read strategy selected by benchmark rather than arbitrary pooling.

### Migrations
- forward-only;
- immutable after release;
- each migration has upgrade tests;
- supported-version migration matrix;
- automatic pre-migration backup;
- failure leaves recoverable prior state.

### Repositories
- handwritten parameterized SQL;
- projection queries designed per screen;
- no ORM;
- query plans reviewed for critical paths;
- avoid N+1 IPC and N+1 SQL.

### Derived data
FTS and analytics aggregates must be reconstructible from raw authoritative data. They carry version/computation metadata and never become the only copy of user meaning.

## 8. Time model

- Schedule date is a local calendar date, not UTC midnight.
- Start/end are normalized minute values or explicit local-time value objects.
- Creation/update/evaluation instants are UTC.
- Recurrence retains timezone/local-time semantics.
- Range and conflict invariants are Rust-owned.
- Day-boundary maintenance is idempotent on app open/date change; no always-running daemon is required.

## 9. Life tree

- Primary storage: adjacency list `parent_id`.
- Stable sibling ordering.
- Recursive CTE/path validation.
- Cycle prevention in frontend for fast feedback and Rust before commit.
- Coordinates are derived by layout, never persisted as source truth.
- Archive policy preserves subtree history.

## 10. Document and asset boundaries

Core does not pre-commit to the full Narrative Canvas schema.

Assets:
- original stored once under stable ID;
- metadata and checksum in SQLite;
- previews derived and rebuildable;
- untrusted extension is not authoritative;
- missing/corrupt assets degrade with repairable placeholders.

Document export includes human-readable Markdown and, when required, versioned canonical JSON for lossless app-specific structure.

## 11. Security

- Tauri capabilities are minimal per window/webview.
- No shell execution or broad filesystem access.
- CSP has no remote scripts/fonts/images and no `unsafe-eval`.
- File operations use scoped native dialog/commands.
- Imports validate path, count, size, MIME, schema, URL schemes, and checksums.
- Rich content is sanitized and never executes code.

## 12. Failure containment

- Route-level Error Boundaries.
- Transaction rollback.
- Optimistic UI rollback/reconciliation.
- Atomic file write through temporary file and rename.
- Interrupted staging detection.
- Corruption state stops writes and offers backup/diagnostics/restore.
- Canvas/editor failure must not crash Task.

## 13. Performance architecture

- Today bundle and projection prioritized.
- Graph, heavy editor, exporters, and expansion visual systems lazy-loaded.
- Normal day list remains non-virtualized unless benchmark disproves.
- Search large result sets may virtualize.
- Reader uses static/lazy scene rendering.
- Motion prefers transform/opacity and pauses offscreen.
- Instrument frontend, IPC, service, repository, and DB query stages.

## 14. Architecture change rule

A locked architecture decision changes only through an ADR containing:
- context and source conflict;
- alternatives;
- measured prototype;
- data/migration impact;
- rollback plan;
- Product Owner acceptance.
