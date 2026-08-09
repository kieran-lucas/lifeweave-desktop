# 00 — Product Owner Execution Authorization

**Status:** APPROVED FOR THIS REDESIGN  
**Date:** 2026-08-10  
**Planning baseline:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`

This file records explicit Product Owner authorization for the Lifeweave Endgame Visual Redesign execution.

## Authorized objective

Implement the approved **Quiet Precision Atlas** frontend redesign across the complete canonical surface ledger while preserving real product capabilities, domain contracts, local-first behavior, data safety, keyboard semantics, and governed performance limits.

## Explicit unattended authority

The Product Owner is intentionally unavailable during the overnight run.

For **reversible, in-scope frontend presentation and implementation decisions**, the execution agent is authorized and required to decide without asking for confirmation. This includes CSS composition, spacing, typography application, primitive reuse, local component structure, naming, test fixture details, deterministic verification substitutes, and other low-risk implementation choices.

When multiple valid in-scope choices remain, choose the option that best satisfies the canonical design authority, existing architecture, accessibility, performance, and product quality.

## Safe fallback authority

If a choice would expand risk or scope, do not ask the absent Product Owner merely to continue. Use the safest in-scope fallback:

- uncertain dependency → do not add it;
- uncertain backend/schema/domain change → do not make it;
- uncertain new capability → do not invent it;
- uncertain destructive action → do not perform it;
- uncertain workflow/seal change → do not modify it;
- ambitious vs reversible implementation → choose the reversible in-scope option.

## Hard-block boundary

The agent may stop a path only when no safe in-scope route exists, for example:

- immutable product/domain authority is genuinely contradictory;
- required backend/schema change is unavoidable;
- repository/source state is externally corrupted or ambiguous;
- authentication/toolchain/filesystem failure prevents all deterministic substitutes;
- a confirmed performance regression cannot be reclaimed within authorized scope.

Record exact evidence as `BLOCKED_PRODUCT` or `VERIFICATION_DEBT`; do not loop.

## Single-goal overnight override

Phase 7 originally recommended one `/goal` per stage for maximum isolation. The Product Owner now explicitly authorizes **one finite top-level overnight Goal** to execute the whole ordered program `F0 → S1 … S12 → Q checkpoints → one final adversarial pass → final gates`.

This does **not** remove stage boundaries. Every stage remains a finite transaction:
implement assigned rows → local gate → one review → ledger → scoped commit/checkpoint → continue.
A closed row is not reopened for taste.

The top-level Goal is complete only when the finite terminal predicate in `00_MASTER_EXECUTION_SPEC.md` is true.

## Still forbidden without new authorization

- new product capabilities;
- backend/domain/schema/database/migration changes;
- hand-editing generated IPC bindings;
- new heavy dependencies merely for visual effect;
- `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256` changes;
- push/force-push/history rewrite during the unattended redesign run;
- deleting or mutating real user data;
- raising locked performance ceilings;
- recursive “keep improving until perfect” loops.

This authorization narrows what counts as a materially OPEN frontend redesign decision. It does not weaken immutable product, safety, security, data, or workflow boundaries.

## Git publication policy

Local scoped commits are authorized and required for durable stage checkpoints. **Do not push during the unattended run.** Publication is deliberately deferred to the Product Owner after reviewing the final report. Never force-push or rewrite history.
