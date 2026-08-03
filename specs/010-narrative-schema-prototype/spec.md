# Spec 010 — Narrative Canvas Schema Prototype Specification

## 1. Purpose

Determine the canonical JSON structure for a future Narrative Canvas document before writing any production schema, migration, or IPC code. The prototype is **PROTOTYPE-GATED** per the AI Constitution. No product behavior is activated.

## 2. Scope

**In:**
- Two isolated TypeScript strategy implementations under `frontend/src/prototypes/narrative-canvas-schema/`
- Deterministic 100,000-operation simulation (seed 20260803) for each strategy
- Benchmark measurements (parse, serialize, reorder, edit, extractText) — 1,000 iterations, p50/p95/max
- Weighted decision matrix (12 criteria, 100 points total)
- Hard veto evaluation
- Selection of exactly one strategy
- `docs/adr/0009-narrative-canonical-schema.md`
- `docs/audits/task-20-narrative-schema-prototype.md`
- `specs/010-narrative-schema-prototype/`

**Out:**
- No production schema changes
- No SQLite migration
- No IPC command
- No Rust code
- No new npm dependencies
- No frontend route or component
- No Narrative Canvas UI, editor, or product activation

## 3. Fixture definitions

- **FIXTURE_S (small):** 8 scenes × 5 blocks = 40 blocks total.
- **FIXTURE_K (medium):** 20 scenes × 5 blocks = 100 blocks total. Last scene has `sceneType: "ending"`.
- All block content is a single paragraph node with deterministic text.

## 4. Required operations (both strategies)

| Operation | Description |
|---|---|
| `parse(json)` | Deserialize from JSON string |
| `serialize(doc)` | Serialize to JSON string |
| `addScene(doc, scene)` | Append a new scene |
| `reorderScene(doc, from, to)` | Move scene at `from` to `to` |
| `deleteScene(doc, index)` | Remove scene at `index` |
| `editBlockContent(doc, si, bi, content)` | Replace block content |
| `addBlock(doc, si, block)` | Append block to scene |
| `moveBlock(doc, fromS, fromB, toS, toB)` | Move block across scenes |
| `extractPlainText(doc)` | Concatenate all text for FTS5 indexing |
| `migrate(doc, 2)` | Simulate v1→v2 schema evolution |

## 5. Simulation parameters

- Seed: 20260803 (fixed)
- Iterations: 100,000 per strategy
- Starting document: FIXTURE_K
- Operation weights: editBlock 40%, addBlock 20%, reorderScene 12%, deleteScene 10%, moveBlock 10%, addScene 8% (adjusted for valid state)
- Correctness: zero errors; final scene count ≥ 1

## 6. Decision matrix criteria (12 criteria, 100 points)

| # | Criterion | Weight |
|---|---|---|
| 1 | Schema evolution safety | 12 |
| 2 | Rich text fidelity | 10 |
| 3 | Cross-scene composition | 10 |
| 4 | Static rendering (no PM required) | 10 |
| 5 | Editor integration | 10 |
| 6 | Search text extraction | 8 |
| 7 | Undo/redo granularity | 8 |
| 8 | Parse/serialize performance | 8 |
| 9 | Accessibility mapping | 8 |
| 10 | Backup/restore round-trip | 8 |
| 11 | TypeScript type safety | 5 |
| 12 | Bundle size impact | 3 |

## 7. Hard veto criteria

A strategy is vetoed if it scores ≤ 2 on **Static rendering** (criterion 4) or ≤ 3 on **Schema evolution safety** (criterion 1).

## 8. PROTOTYPE-GATED constraint

The prototype code lives under `src/prototypes/`. The production build must not include any prototype module. Verified by comparing bundle chunk counts before and after adding prototype files.
