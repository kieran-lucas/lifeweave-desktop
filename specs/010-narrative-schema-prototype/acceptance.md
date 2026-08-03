# Spec 010 — Acceptance Criteria (complete reaudit)

All criteria verified by prototype tests.

## shared/semantic — plain text (5 criteria)
1. `semanticDocumentToPlainText` includes scene titles. ✓
2. `semanticDocumentToPlainText` includes rich_text block content. ✓
3. `semanticDocumentToPlainText` includes metric label and value. ✓
4. `semanticDocumentToPlainText` includes image alt text. ✓
5. `semanticDocumentToPlainText` includes callout and timeline content. ✓

## shared/semantic — Markdown (6 criteria)
6. H1 for document title. ✓
7. H2 for scene titles. ✓
8. Metric renders as bold label + value + unit. ✓
9. Image renders as `![alt](asset:assetId)`. ✓
10. Timeline renders as ordered list under `###` heading. ✓
11. Vietnamese text preserved in Markdown output. ✓

## shared/basic-leaf adapters (7 criteria)
12. `basicLeafToNarrative` wraps content in single scene with rich_text block. ✓
13. `basicLeafToNarrative` preserves asset IDs. ✓
14. `basicLeafToNarrative` preserves Vietnamese text. ✓
15. `narrativeToBasicLeaf` produces H1 for document title. ✓
16. `narrativeToBasicLeaf` produces H2 for scene titles. ✓
17. `narrativeToBasicLeaf` converts metric to paragraph. ✓
18. `narrativeToBasicLeafWithReport` reports metric blocks in loss list. ✓

## Strategy A — all 18 operations (16 criteria)
19. parse+serialize round-trip is lossless. ✓
20. serialize produces valid JSON. ✓
21. toSemanticDocument round-trip. ✓
22. createScene appends. ✓
23. deleteScene removes by index. ✓
24. reorderScene moves to correct position. ✓
25. updateSceneLayout changes layout. ✓
26. updateSceneAtmosphere changes atmosphere. ✓
27. updateSceneMotion changes motion. ✓
28. insertBlock inserts at index. ✓
29. deleteBlock removes by index. ✓
30. reorderBlock moves within scene. ✓
31. moveBlock transfers block across scenes. ✓
32. updateBlock replaces block. ✓
33. applyBatch applies multiple ops atomically. ✓
34. projectToStatic includes all 5 block kinds. ✓
35. extractPlainText includes all semantic content. ✓
36. undo/redo via adapterAHistory. ✓

## Strategy B — all 18 operations (16 criteria)
37–52. Same 16 operations as Strategy A, all passing. ✓

## Strategy B — fair codec (6 criteria)
53. validateRawJson rejects non-object. ✓
54. validateRawJson rejects missing type. ✓
55. validateRawJson accepts valid raw JSON. ✓
56. migrateJson v1→v2 adds narrativeType to doc attrs. ✓
57. migrateJson v2 JSON parsed by narrativeSchemaV2 preserves narrativeType. ✓
58. Fair B migrate preserves narrativeType (vs unfair B which loses it). ✓

## Static reader equality (4 criteria)
59. A and B produce equal StaticProjection for FIXTURE_S. ✓
60. A and B produce equal StaticProjection for FIXTURE_K. ✓
61. strategy-b/static-reader has no @tiptap/pm import. ✓
62. staticReadFromRawJson matches projectToStatic for FIXTURE_S. ✓

## Markdown equality (4 criteria)
63. A and B produce identical Markdown for FIXTURE_S. ✓
64. A and B produce identical Markdown for FIXTURE_K. ✓
65. Markdown contains Vietnamese text. ✓
66. Markdown has no MDX imports or absolute paths. ✓

## Plain text equality (4 criteria)
67. A and B produce identical plain text for FIXTURE_S. ✓
68. A and B produce identical plain text for FIXTURE_K. ✓
69. Plain text includes scene titles for both A and B. ✓
70. Plain text includes all 5 block types. ✓

## Basic Leaf round-trip (4 criteria)
71. basicLeafToNarrative → narrativeToBasicLeaf preserves text. ✓
72. Loss report is empty for rich_text-only content. ✓
73. Loss report mentions metric for metric blocks. ✓
74. Vietnamese text preserved through round-trip. ✓

## Decision matrix (5 criteria)
75. Weights sum to 100. ✓
76. Strategy A score calculation is correct (82.8). ✓
77. Strategy A score > Strategy B score. ✓
78. Strategy A score > Strategy B score by meaningful margin (≥ 10 points). ✓ (actual: 14.9)
79. Selected strategy is A. ✓

## Bundle isolation (3 criteria)
80. Prototype test file is in prototypes/ path. ✓
81. strategy-a/adapter has no @tiptap/pm import. ✓
82. strategy-b/static-reader has no @tiptap/pm import. ✓

## Simulation (3 criteria — simulation.test.ts)
83. Strategy A: 100,000 applied ops, 0 errors. ✓
84. Strategy B: 100,000 applied ops, 0 errors. ✓
85. A and B produce identical final-state hash. ✓

## Benchmarks (28 criteria — benchmark.test.ts)
86–113. Parse, serialize, projectToStatic, extractPlainText, reorderScene, insertBlock, moveBlock × A/B × S/K/Medium/Large scales. All pass within thresholds. ✓
