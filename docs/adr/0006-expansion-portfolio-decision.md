# ADR 0006 — Expansion portfolio priority

- Status: Proposed for Product Owner approval
- Date: 2026-08-02
- Decision owner: Product Owner
- Scope: Task 17 / Slice 007 only

## Context

Task 16 completed the hardened Core. The roadmap requires Score, Prediction, Narrative Canvas, Visual Worlds, Global Search, Tags, Backlinks, Outline, Noteboard and Graph to be evaluated independently. Existing technology descriptions do not constitute product approval.

## Decision

Recommend Global Search as the sole next expansion activation:

`Global Search Core + Vietnamese-Normalized Unified Retrieval`.

Search is selected because it solves retrieval across the already implemented Task, Life and Basic Leaf authorities; remains entirely offline; uses the existing bundled SQLite FTS5 capability; has a bounded and rebuildable data model; maps to mature accessible interaction patterns; and remains first across the disclosed sensitivity profiles.

Outline is deferred pending a narrow Basic Leaf heading role. Visual Worlds are held for Product Owner aesthetic direction. Narrative Canvas, Tags, Backlinks, Score, Prediction, Noteboard and Graph are deferred.

## Consequences

- Task 17 adds no product behavior.
- Task 18 remains prohibited until Product Owner approval.
- A future Search slice must keep canonical tables authoritative and the index rebuildable.
- Search does not activate Tags, Backlinks, Graph, AI, embeddings or semantic/vector retrieval.
- Deferred source labels are preserved.

## Rejected alternatives

- Narrative Canvas next: high differentiation but excessive schema/editor/accessibility/migration risk.
- Visual Worlds next: strong identity but unresolved Product Owner aesthetics and world intensity.
- Outline next: small and safe but product role remains ambiguous.
- Tags/Backlinks/Graph bundle: violates independent-candidate evaluation and lacks relationship authority.
- Score or Prediction next: insufficient formula/calibration/trust evidence.
