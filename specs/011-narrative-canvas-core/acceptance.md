# Spec 011 — Acceptance Criteria

## Persistence (5 criteria)
1. `create_narrative_document` creates a single-scene canvas on an active Life leaf. ✓
2. `save_narrative_document` commits with revision increment. ✓
3. `save_narrative_draft` + `recover_narrative_draft` round-trip. ✓
4. `discard_narrative_draft` removes the draft. ✓
5. `get_narrative_document` returns projection with draft state. ✓

## Mutual exclusion (4 criteria)
6. Canvas creation fails on a node that already has a Basic Leaf document. ✓
7. Basic Leaf creation fails on a node that already has a Canvas. ✓
8. Canvas node cannot gain an active child Life node. ✓
9. Branch node is rejected for canvas creation. ✓

## Schema validation (6 criteria)
10. Exactly one scene enforced; zero or two scenes rejected. ✓
11. All five block kinds validated: rich_text, metric, image, callout, timeline. ✓
12. Unknown block kind rejected. ✓
13. Invalid callout variant rejected. ✓
14. Invalid asset ID in image block rejected. ✓
15. Schema version ≠ 1 rejected. ✓

## Markdown export (4 criteria)
16. Document title renders as H1. ✓
17. Scene title renders as H2. ✓
18. Metric block renders as bold label + value + unit. ✓
19. Timeline block renders as ordered list under heading. ✓

## Search integration (2 criteria)
20. Narrative document indexed via 'reader_document' entity_kind with navigation_id=life_node_id. ✓
21. Search dirty scope 'documents' queued on narrative_document INSERT/UPDATE/DELETE. ✓

## Revision retention (1 criterion)
22. After 55 saves, only 50 revisions are retained. ✓

## Frontend — Reader (7 criteria)
23. Empty leaf shows "Create Narrative Canvas" button. ✓
24. Empty leaf with no document shows both "Create Basic Leaf document" and "Create Narrative Canvas" options. ✓
25. Canvas title and scene title rendered statically. ✓
26. Metric block renders label, value, unit, description. ✓
27. Timeline block renders heading and items. ✓
28. Callout block renders variant label and content. ✓
29. Draft recovery banner shown when draft_state is "available". ✓

## Frontend — Studio (3 criteria)
30. Studio is a separate lazy chunk (not imported eagerly by Reader). ✓
31. Studio renders after "Edit canvas" click. ✓
32. Tiptap not imported by Reader chunk. ✓
