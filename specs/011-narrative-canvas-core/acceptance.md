# Spec 011 — Acceptance Criteria (Final Accepted Gate)

## Persistence (5 criteria)
1. `create_narrative_document` creates a single-scene canvas on an active Life leaf. ✓
2. `save_narrative_document` commits with revision increment. ✓
3. `save_narrative_draft` + `recover_narrative_draft` round-trip. ✓
4. `discard_narrative_draft` removes the draft. ✓
5. `get_narrative_document` returns projection with draft state. ✓

## Mutual exclusion (6 criteria)
6. Canvas creation fails on a node that already has a Basic Leaf document. ✓
7. Basic Leaf creation fails on a node that already has a Canvas. ✓
8. Canvas node cannot gain an active child Life node. ✓
9. Branch node is rejected for canvas creation. ✓
10. Dual-content conflict (both Basic Leaf and Canvas active) shown as blocking alert in BasicLeafReader. ✓
11. BasicLeafReader routes to Canvas reader only when no Basic Leaf document exists. ✓

## Schema validation (8 criteria)
12. Exactly one scene enforced; zero or two scenes rejected. ✓
13. All five block kinds validated: rich_text, metric, image, callout, timeline. ✓
14. Unknown block kinds preserved losslessly with full raw canonical object. ✓ (was: "rejected")
15. Invalid callout variant rejected. ✓
16. Invalid asset ID in image block rejected. ✓
17. Schema version ≠ 1 rejected. ✓
18. Wrong templateVersion rejected (strict parser). ✓
19. Wrong layoutPreset/atmosphere/motionPreset rejected (strict parser). ✓

## Serialization (2 criteria)
20. `serializeNarrative` emits only V1 fields for known blocks; no extra keys. ✓
21. Unknown block canonical round-trips with all raw fields preserved. ✓

## Restore and move guards (4 criteria)
22. life_node_id is immutable for ALL document rows (active and archived) — Migration 14. ✓
23. Restore fails when life node is archived, root, or has active children — Migration 14. ✓
24. Restore fails when a competing document of same or different type already exists. ✓
25. Basic Leaf and Narrative Canvas restore guards are symmetric. ✓

## Markdown export (4 criteria)
26. Document title renders as H1. ✓
27. Scene title renders as H2. ✓
28. Metric block renders as bold label + value + unit. ✓
29. Timeline block renders as ordered list under heading. ✓

## Search integration (4 criteria)
30. Narrative document indexed via 'reader_document' entity_kind with navigation_id=life_node_id. ✓
31. Search dirty scope 'documents' queued on narrative_document INSERT/UPDATE/DELETE. ✓
32. Canvas title, scene title, rich_text, metric, image alt/caption, callout, timeline indexed. ✓
33. Draft excluded; archived excluded; unknown raw fields excluded from index. ✓

## Revision retention (1 criterion)
34. After 55 saves, only 50 revisions are retained. ✓

## Frontend — Reader (10 criteria)
35. Empty leaf shows "Create Narrative Canvas" button. ✓
36. Empty leaf with no document shows both creation options. ✓
37. Canvas title and scene title rendered statically with correct heading levels (h1/h2). ✓
38. Metric block renders label, value, unit, description. ✓
39. Timeline block renders heading and items. ✓
40. Callout block renders variant label and content. ✓
41. Draft recovery banner shown when draft_state is "available". ✓
42. rich_text and callout islands rendered through `parseDocument` + `StaticDocument`. ✓
43. Corrupt island shows placeholder without crashing the canvas. ✓
44. Unknown block kind shows placeholder with block.kind label. ✓

## Frontend — Studio architecture (12 criteria)
45. Studio is a separate lazy chunk (not imported eagerly by Reader). ✓
46. Zero Tiptap editors before any block is activated. ✓
47. Exactly one Tiptap editor after block activation. ✓
48. Switching blocks keeps exactly one editor (prior island materialized on switch). ✓
49. Publish includes active island content (not stale committed content). ✓
50. Tiptap keystrokes do not push structural history entries. ✓
51. Add/delete/reorder each push one structural history entry. ✓
52. Draft debounce includes active island content; fires after 1 second. ✓
53. Failed save retains operation ID; success rotates it. ✓
54. Stale revision error shows specific message. ✓
55. Unknown block raw payload preserved through reorder and save. ✓
56. Final-block protection via alert. ✓

## Assets and backup (3 criteria)
57. Image import sends bytes and stores returned asset_id. ✓
58. Backup/restore preserves canonical JSON, unknown block raw fields, and asset bytes. ✓
59. Shared asset not removed by orphan cleanup. ✓

## Performance (3 criteria)
60. Rust validation + extraction p95 ≤ 50 ms (recorded). ✓
61. Save transaction p95 ≤ 250 ms excluding asset import (recorded). ✓
62. Frontend parse + serialize p95 ≤ 50 ms (recorded). ✓

## Production (2 criteria)
63. Studio chunk loads lazily; Tiptap absent from main and Reader chunks. ✓
64. NSIS installer built and path/size recorded. ✓
