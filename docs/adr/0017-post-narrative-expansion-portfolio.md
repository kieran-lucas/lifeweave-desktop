# ADR 0017 — Post-Narrative Expansion Portfolio Decision

**Status:** Accepted

**Date:** 2026-08-03

---

## Context

Tasks 18–22 implemented Global Search, Basic Leaf Heading Outline, Narrative Canvas Schema Prototype (decision), Narrative Canvas Core, and Narrative Canvas Markdown Interoperability. The implemented baseline now comprises Tasks, Life, Basic Leaf documents, FTS5 search, and a single-scene knowledge-dossier Narrative Canvas with Markdown interoperability. Schema is at migration 14.

Task 23 re-evaluates all expansion candidates against the new baseline using a 12-criterion weighted model and a five-profile, five-million-sample sensitivity simulation (seed 20260803).

---

## Decision

**Multi-Scene Canvas Composition** is the sole `ACTIVATE_NEXT` candidate. Task 24 remains prohibited until Product Owner approval.

Aggregate mean score: **7.748 / 10** across five profiles.  
Lead over runner-up (Task/Life Relationships, 7.376): **0.372** (required ≥ 0.35).  
Aggregate win probability: **70.2 %**.

Multi-Scene extends the existing single-scene Canvas schema within approved Strategy A (ADR 0010). It adds scenes as first-class ordered units within the `knowledge_dossier` template, with no schema contradiction and no new narrative constraint violated. It ranks first in three of five profiles (base, utility, visual-identity).

---

## Deferred candidates

| Candidate | State | Reason |
|---|---|---|
| Task/Life Relationships | DEFER | Join semantics, cardinality and display policy require Product Owner direction. |
| Generic Outline | DEFER | Full generic Outline duplicates Life tree roles; Task 19 heading navigator already covers the justified use case. |
| Lossless Package | DEFER | Bounded and safe; not sufficiently user-facing to prioritize over Multi-Scene. |
| Tags | DEFER | Value beyond Task categories and Life hierarchy not yet demonstrated. |
| Template System | HOLD_FOR_PRODUCT_OWNER | Template content, count and default layout require Product Owner direction. |
| Visual Worlds | HOLD_FOR_PRODUCT_OWNER | Palette, world count and intensity are aesthetic decisions not yet resolved. |
| Backlinks | DEFER | No approved link-creation model; relationship corpus absent. |
| Score | DEFER | Formula is OPEN; distortion risk without actual-time semantics. |
| Prediction | DEFER | Insufficient evaluation history and calibration. |
| Noteboard | DEFER | No core workflow demonstrated. |
| Graph | DEFER | Missing links/tags dependency; accessible alternative unresolved. |

---

## Consequences

- Task 23 adds no product behavior, migration, IPC command, or dependency.
- Task 24 (Multi-Scene Canvas Composition) may begin only after Product Owner approval.
- The single-scene Canvas invariant (enforced in `parseNarrative`) must be relaxed in a compatible, additive migration in Task 24.
- Template System and Visual Worlds remain HOLD until Product Owner provides explicit direction.
- All other deferred candidates remain eligible for future expansion decisions without re-evaluation from scratch.
