# ADR 0047 — Manual Focus Plan Score

## Status

Accepted by explicit Product Owner decision on 2026-08-13. Implemented as a narrow Product Owner
amendment to Task 51 / Slice 041.

## Context

The released Focus Plan model deliberately prohibited scoring because no automatic formula or
calibrated inference existed. The Product Owner has now requested a different, strictly manual
signal: a person assigns one current integer from 1 through 100 to a Plan from the portfolio.

## Decision

- A Focus Plan owns a nullable manual `score`.
- A stored score is an integer in the inclusive range 1–100 and is validated by SQLite and Rust.
- The score is current Plan authority, participates in optimistic revision/idempotency semantics,
  appears in Plan summary/detail projections, and is preserved by full-database backup/restore.
- Scoring uses the existing `mutate_focus_plan` command through a dedicated `set_score` action; no
  second write authority or score-specific IPC command is introduced.
- Score never computes or changes lifecycle, phase, Task state, Analytics, prediction, health, or
  completion. Only explicit lifecycle `completed` causes a Plan title strike-through.
- The portfolio exposes a keyboard-reachable circular score control. The number is always printed,
  so colour is redundant reinforcement rather than the sole state signal.
- Migration 28 appends the nullable checked column. Migrations 1–27 remain immutable.

## Consequences

The former blanket prohibition on Focus Plan scoring is superseded only for this manual current
score. Automatic scoring, formulas, score history, score analytics, health, prediction, automatic
lifecycle changes, and score-derived completion remain prohibited.
