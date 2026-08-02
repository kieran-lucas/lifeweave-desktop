# Task 17 — Expansion Decision + Candidate Activation Matrix

Status: **PASS**. Starting HEAD `85848dbb9190d4439d2d37227fac5d70e34e2439` (reduce ci to a manual clean build); final HEAD: this commit.

## Closure summary

All ten expansion candidates were evaluated independently against twelve hard filters, a disclosed eleven-criterion weighted model, prerequisite constraints, and a four-profile/four-million-sample sensitivity analysis. The analysis used source/repository evidence, official SQLite/Tauri/accessibility documentation, current official documentation from comparable personal-knowledge products, published HCI/PIM research and disclosed modeled uncertainty. No external user study of this product was conducted.

Global Search is the sole `ACTIVATE_NEXT` recommendation. No product dependency, migration, IPC, capability, route, UI or behavior was added by Task 17.

## Repository baseline confirmed

- Branch: `main`.
- Starting HEAD: `85848dbb9190d4439d2d37227fac5d70e34e2439`.
- Working tree was clean at task start.
- Single workflow: `.github/workflows/manual-clean-build.yml` (`workflow_dispatch` only).
- No automatic CI completion gate.
- Post–Task 16 minimal CI policy in effect.

## Implemented product baseline

### Task pillar (implemented)

Today-default task workflow; one-off task CRUD; exact-minute time semantics; recurrence and occurrence overrides; Week Strip; Calendar projection; completion evaluation and undo; objective Week/Month/Year Analytics; category minimum/target goals; objective streaks.

Absent: total score; score streak; prediction; actual-time tracker; reminder, notification and sound.

### Life pillar (implemented)

Protected neutral Life root; focal Browse with direct children only; breadcrumbs, session history and persisted navigation; Pinned mode; full-tree Edit mode; create, rename, reorder, reparent, archive/restore and undo; Basic Leaf versioned documents; static Reader; lazy focused Tiptap editor; revision history and recovery drafts; stable-ID local images; Markdown import/export; backup/restore containing assets.

Absent: Narrative Canvas; scenes, templates and custom visual blocks; visual-world engine; global Search; Tags; Backlinks; Outline; Noteboard; Graph; Task/Life relations.

### Scale at Task 16

- Frontend tests: 118. Rust tests: 292. Schema migration: 9.
- Production chunks: main ~484 kB minified; lazy Basic Leaf editor ~443 kB; lazy Markdown pipeline ~117 kB.
- FTS5 compiled into bundled SQLite (`rusqlite = 0.40.1`, `SQLITE_ENABLE_FTS5`).
- Basic Leaf stores extracted plain text beside canonical ProseMirror JSON.
- F-04/F-05 closed. Unsigned NSIS build passed. Contained two-session RC dogfood passed.

## Hard-filter results

Twelve mandatory filters applied to each of ten candidates. A single FAIL blocks immediate activation.

| Candidate | Result | Decisive reason |
|---|---|---|
| Global Search | PASS 12/12 | Bounded local index; direct retrieval problem; no unapproved prerequisite. |
| Outline | CONDITIONAL | Must narrow to Basic Leaf heading outline; generic Outline duplicates Life navigation. |
| Visual Worlds | CONDITIONAL | Requires Product Owner palette/count/intensity decision and measured contrast/performance budgets. |
| Narrative Canvas | CONDITIONAL | Requires isolated schema prototype, migration proof, accessibility model and strict minimum scope. |
| Tags | CONDITIONAL | Must prove value beyond Task categories and Life hierarchy; merge/archive semantics undefined. |
| Backlinks | FAIL | No approved link-creation model; insufficient relationship corpus. |
| Score | FAIL | Formula OPEN; misleading productivity judgment risk. |
| Prediction | FAIL | Insufficient local history/calibration; trust controls unjustified. |
| Noteboard | FAIL | No demonstrated core workflow; duplicates organization; risks Task-card regression. |
| Graph | FAIL | Missing links/tags; duplicates Life tree; accessible alternative absent; rendering cost excessive. |

## Weighted decision model

Eleven criteria, 100 total weight. Scores are structured expert judgments grounded in source/repository evidence, not empirical user measurements.

Top-five base weighted scores:

| Rank | Candidate | Score / 10 |
|---|---|---|
| 1 | Global Search | 8.661 |
| 2 | Outline | 7.602 |
| 3 | Visual Worlds | 6.978 |
| 4 | Tags | 6.935 |
| 5 | Backlinks | 6.387 |

Search leads by 1.059 points over Outline.

## Sensitivity analysis

The four-million-sample analysis is a sensitivity test over explicit subjective priors, not an empirical user study and not proof created by a large iteration count. Its value is that the Search recommendation remains stable under broad, disclosed changes to weights and candidate scores.

Fixed master seed: `20260802`. Profiles: Base; Utility-first; Visual-identity-first; Safety/maintenance-first. 1,000,000 samples each. Dirichlet concentration 250. Score uncertainty (σ): Search 0.45, Outline 0.60, Visual Worlds 0.80, Narrative Canvas 0.90, Tags 0.70, Backlinks 0.75, Score 0.90, Prediction 1.00, Noteboard 0.80, Graph 0.90.

| Candidate | Aggregate top-1 % | Mean rank |
|---|---|---|
| Global Search | 93.449 | 1.066 |
| Outline | 5.884 | 2.255 |
| Visual Worlds | 0.661 | 3.582 |
| Tags | 0.002 | 3.833 |
| All others | 0.000 | — |

Global Search ranks first in: 100% Base; 100% Utility-first; 97.33% Visual-identity-first; 76.47% Safety/maintenance-first.

Pairwise: Search > Outline in 100%/100%/99.98%/76.47% across profiles; Search > Visual Worlds in 100%/100%/97.35%/100%.

## Final portfolio recommendation

| Candidate | Recommendation |
|---|---|
| Global Search | `ACTIVATE_NEXT` |
| Outline | `DEFER` |
| Visual Worlds | `HOLD_FOR_PRODUCT_OWNER` |
| Narrative Canvas | `DEFER` |
| Tags | `DEFER` |
| Backlinks | `DEFER` |
| Score | `DEFER` |
| Prediction | `DEFER` |
| Noteboard | `DEFER` |
| Graph | `DEFER` |

No candidate is `RECOMMEND_REMOVE`. Source labels (`OPEN`, `DEFERRED`) are preserved.

## Task 18 recommended minimum (if approved)

Title: `Global Search Core + Vietnamese-Normalized Unified Retrieval`

Scope: active Tasks, Life nodes, and Basic Leaf documents. Archived inclusion requires explicit filter. Result groups: Tasks; Life; Documents. Each result: stable entity ID; type; title; safe short snippet; breadcrumb/date/category context; navigation target; rank; archived flag when applicable.

UI: keyboard-first palette; no permanent main-sidebar destination; type-to-search; Arrow Up/Down/Enter/Escape; deterministic empty/loading/error states; screen-reader result count; no HTML injection; no remote requests.

Explicit Task 18 exclusions: semantic/vector search; embeddings; AI summaries; web search; Tags; Backlinks; Graph; saved views; query language visible to ordinary users; fuzzy ML; Task/Life relation schema; search analytics/telemetry.

Success criteria: prefix/title retrieval immediate on realistic fixtures; Vietnamese accented and accent-insensitive queries correct; `đ/d` normalization explicitly tested; index rebuildable from canonical rows; no stale result after create/update/archive/restore/save; corruption rebuilds without harming authority; fully keyboard-usable; no content logged; startup bundle unaffected.

Kill criteria: FTS5 unavailable in bundled binary; index consistency unguaranteed; p95 latency misses budget; snippets unsafe; Vietnamese normalization causes unacceptable collisions; cloud/AI/vector infrastructure required.

## Exact local command results

```
python scripts/verify_source_integrity.py
Source verified: docs\source-of-truth\SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md 165171 bytes, 4637 lines, sha256=9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a

python scripts/check_repository.py
Repository governance checks passed

python scripts/generate_spec_index.py --check
Specification index current: 402 headings

python scripts/generate_coverage_matrix.py --check
Full coverage matrix current

python scripts/verify_no_remote_assets.py
No disallowed remote production resources detected

python scripts/verify_security.py
security verification passed

python scripts/verify_hardening.py
Core hardening policy verified: one manual-dispatch-only clean build workflow.

pnpm verify
PASS (all stages above)
```

## No product-code statement

No file in `frontend/`, `src-tauri/`, `package.json`, `frontend/package.json`, `Cargo.toml`, `pnpm-lock.yaml`, `Cargo.lock`, or `.github/workflows/` was modified. Diff is limited to `docs/`, `specs/007-expansion-decision/`.

## Changed files

```
docs/STATUS.md
docs/ROADMAP.md
docs/adr/0006-expansion-portfolio-decision.md
docs/audits/task-17-expansion-decision.md
specs/007-expansion-decision/README.md
specs/007-expansion-decision/spec.md
specs/007-expansion-decision/plan.md
specs/007-expansion-decision/tasks.md
specs/007-expansion-decision/acceptance.md
specs/007-expansion-decision/risk-register.md
```

## Product Owner approval block

```text
Recommended next activation:
ACTIVATE_NEXT — Global Search

Recommended Task 18 execution title:
Global Search Core + Vietnamese-Normalized Unified Retrieval

Product Owner decision required:
APPROVE / REJECT / MODIFY
```
