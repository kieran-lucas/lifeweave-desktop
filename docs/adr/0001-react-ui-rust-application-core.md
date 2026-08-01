# ADR 0001 — React UI with Rust application core

- Status: Accepted
- Date: 2026-08-01
- Decision owner: Product Owner
- Source: immutable specification architecture contracts

## Context

The product needs precise, expressive WebView UI while keeping persistence, validation, recurrence, backup, and security-sensitive filesystem work outside React components.

## Decision

Use:
- React for render/focus/input/ephemeral state/motion;
- Tauri 2 as Windows host and capability boundary;
- Rust application/domain/infrastructure layers for durable business behavior;
- typed IPC with generated TypeScript DTOs;
- SQLite accessed only through Rust-owned repositories/services.

## Consequences

- More explicit IPC/projection design.
- Stronger data/invariant boundary.
- Business logic is testable without WebView.
- UI can remain visually flexible.
- DTO generation and stale-revision behavior need disciplined tooling.

## Rejected alternatives

- Web application with database/business logic in TypeScript.
- Direct SQLite calls from React.
- Pure Rust native UI toolkit for the initial product.
- Generic backend server for a single-user offline app.

## Rollback

Reversal would be a major architecture migration and requires a new accepted ADR with a working prototype.
