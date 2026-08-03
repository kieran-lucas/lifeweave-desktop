# Spec 011 — Risk Register

## Closed risks

| ID | Risk | Closure |
|----|------|---------|
| R01 | Unknown blocks silently dropped on round-trip | Closed: `UnknownNarrativeBlock.canonical` preserves entire raw object; `serializeNarrative` re-emits verbatim |
| R02 | Dual Basic Leaf + Canvas conflict hidden from user | Closed: `BasicLeafReader` conflict detection renders blocking alert |
| R03 | Frontend parser normalizes invalid preset values | Closed: `parseNarrative` throws on any deviation from V1 schema constraints |
| R04 | life_node_id mutable on archived documents | Closed: Migration 14 `narrative_life_node_immutable` / `reader_life_node_immutable` apply to all rows |
| R05 | Canvas restore bypasses root/branch/cross-content constraints | Closed: Migration 14 `narrative_restore_guard_14` checks root, children, uniqueness, mutual exclusion |
| R06 | Canvas Reader custom renderer misses accepted Basic Leaf nodes | Closed: rich_text and callout rendered through `parseDocument` + `StaticDocument` |
| R07 | `JSON.stringify(doc)` in Studio bypasses canonical serialization | Closed: replaced with `serializeNarrative(doc)` |

## Open risks

| ID | Risk | Status |
|----|------|--------|
| R08 | Studio performance on 128-block documents may degrade after future block kinds are added | Accepted: current p95 within targets; revisit if block count grows significantly |
| R09 | dnd-kit pointer/keyboard DnD requires integration tests beyond jsdom | Accepted: keyboard DnD tests verify sort order; full pointer simulation deferred to Slice 006 UI testing |

## Deferred features (not risks)

- Score, Prediction, Graph, Tags, Backlinks, Noteboard — held per ADR 0006.
- Multi-scene narrative documents — held per spec constraint (exactly one scene).
- Narrative Canvas as backup/restore authority — canonical tables remain authority.
