# Task 46 Execution Plan

Status: ACTIVE.

## Stage 0 — Activation and baseline

Confirm clean `main` and remote parity at `b5002c3b05232aa0b8ae74b924764f927cc00f1d`.
Read authority in constitutional order, resolve the immutable source's OPEN actual-time statement
through ADR 0037 and the Product Owner's ADR 0040 decision, inspect Task 12/43/45 evidence, and trace
current Analytics, timer, generated binding, query invalidation, E2E, and performance conventions.
Create Slice 036 and ADR 0040; activate Project State with schema unchanged at 26; run activation
governance; commit and push with no product code. Record the activation bundle inventory before any
product edit.

## Stage 1 — Rust read model and bounded aggregation

Add the Rust-owned summary DTO and non-null fields on the overall projection and every category.
Query period-bounded one-off Tasks joined to completed sessions in one grouped SQL statement, sum
milliseconds per Task, and fold checked per-Task seconds into overall/category summaries. Prove the
tracked denominator counts each Task once, category totals sum to overall, bad data fails as one
sanitized error, and the query uses intended indexes. Advance the Analytics algorithm version to 2
without changing schema or migrations.

## Stage 2 — Transactional Stop invalidation

Move the existing Analytics source-revision bump into the same transaction as the first successful
session close. Preserve idempotent Stop replay and every non-contributing transition. Prove source
revision deltas for Start, first Stop, replay, Discard, and backwards-clock refusal, including raw-row
immutability on failure.

## Stage 3 — Rust regression matrix and bindings

Cover multiple segments, per-Task flooring, multiple Tasks/categories, untracked denominator,
active/discard, cross-midnight attribution, reschedule/recategorize movement, delete cascade,
zero-duration completion, recurring exclusion, v1-to-v2 rebuild, indexed plan, and file-backed
close/reopen. Regenerate TypeScript bindings from Rust through the repository's normal generator and
verify no hand edit.

## Stage 4 — Analytics rendering and cache wiring

Add the Recorded actual time semantic section, five facts, explicit empty state, deterministic
seconds-aware formatting, textual over/under/matched variance, transparency copy, and compact lines
only for tracked categories. Preserve every scheduled label/goal/streak/completion surface. Invalidate
Analytics through the timer completion mutation path. Add rendering, wiring, and axe tests without
duplicating backend arithmetic truth.

## Stage 5 — Native Phase 17 and deliberate break

Add and register the one Phase 17 spec. Create two 60-minute Tasks through the UI, track only one,
wait for non-zero UI elapsed time, stop it, and prove Analytics carries the bounded comparison while
scheduled totals still include both Tasks. Deliberately break the central projection, record the
meaningful native failure, restore, rerun focused proof and Phase 17, and verify zero residue.

## Stage 6 — Performance, full gates, and product checkpoint

Measure the final bundle, create the versioned Task 46 budget only if required by the contract, and
prove the bounded index-backed read. Run all specified frontend, Rust, installer, native, RC,
governance, and diff gates. Inspect `git diff <activation>..<product-checkpoint>`, remove accidental
files, commit and push the product checkpoint.

## Stage 7 — Closure

Write the Task 46 audit with exact command evidence, performance inventory, deliberate-break result,
verification debt, exclusions, and self-review. Close governance with schema 26, Task 46/Slice 036
closed, the product checkpoint recorded, `next_action=product_owner_gate`, and Task 47 prohibited.
Commit/push closure, then fill only the closure-SHA placeholder in the audit, commit/push the audit
record, and verify clean remote parity.
