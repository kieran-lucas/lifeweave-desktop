# Spec 010 — Acceptance Criteria

All criteria verified by prototype tests in `prototype.test.ts`.

## PRNG (5 criteria)
1. Same seed produces identical sequence across two instances. ✓
2. Different seeds produce different sequences. ✓
3. `float()` returns value in [0, 1). ✓
4. `int(max)` returns value in [0, max). ✓
5. `int(0)` returns 0 without crash. ✓

## Fixtures (3 criteria)
6. FIXTURE_S: 8 scenes, 40 blocks total. ✓
7. FIXTURE_K: 20 scenes, 100 blocks total. ✓
8. FIXTURE_K last scene has sceneType "ending". ✓

## Strategy A operations (16 criteria)
9. parse+serialize round-trip is lossless (deterministic JSON). ✓
10. parse rejects unknown schemaVersion. ✓
11. parse rejects missing scenes array. ✓
12. addScene appends and increments revision. ✓
13. reorderScene moves to correct position. ✓
14. reorderScene does not mutate original (immutable). ✓
15. deleteScene removes scene by index. ✓
16. editBlockContent updates target without touching other blocks. ✓
17. addBlock appends to correct scene. ✓
18. moveBlock transfers block across scenes. ✓
19. extractPlainText includes scene titles and block text. ✓
20. extractPlainText is non-empty for non-empty fixture. ✓
21. getSceneCount returns correct count. ✓
22. getBlockCount returns correct per-scene count. ✓
23. migrate v1→v2 succeeds without schema change; adds narrativeType. ✓
24. migrate preserves all scenes. ✓

## Strategy B operations (16 criteria)
25. fromNarrativeDocumentA produces valid PM doc. ✓
26. parse+serialize round-trip is lossless. ✓
27. Scene nodes have correct attrs. ✓
28. narrative_block nodes have blockType attr. ✓
29. addScene appends a new scene node. ✓
30. reorderScene moves scene to correct position. ✓
31. deleteScene removes correct scene node. ✓
32. editBlockContent updates targeted block. ✓
33. editBlockContent does not change other blocks. ✓
34. addBlock appends block node to correct scene. ✓
35. moveBlock transfers block across scenes. ✓
36. extractPlainText uses PM textContent traversal. ✓
37. getSceneCount returns correct count. ✓
38. getBlockCount returns blocks per scene. ✓
39. Migration silently drops unknown attrs (data loss proof). ✓
40. Cross-strategy equivalence: block text matches between A and B. ✓

## Simulations (2 criteria)
41. Strategy A: 100k ops from FIXTURE_K, seed 20260803, zero errors. ✓
42. Strategy B: 100k ops from FIXTURE_K, seed 20260803, zero errors. ✓

## Benchmarks (10 criteria)
43. Strategy A parse p50 < 20ms. ✓
44. Strategy A serialize p50 < 20ms. ✓
45. Strategy A reorder p50 < 5ms. ✓
46. Strategy A editBlock p50 < 5ms. ✓
47. Strategy A extractText p50 < 10ms. ✓
48. Strategy B parse p50 < 100ms. ✓
49. Strategy B serialize p50 < 100ms. ✓
50. Strategy B reorder p50 < 50ms. ✓
51. Strategy B editBlock p50 < 50ms. ✓
52. Strategy B extractText p50 < 50ms. ✓

## Decision matrix (5 criteria)
53. Criteria weights sum to 100. ✓
54. Strategy A score exceeds Strategy B by ≥ 20 points (actual: 36.9 points). ✓
55. Strategy B fails static-render hard veto (score ≤ 2). ✓
56. Strategy B fails schema-evolution hard veto (score ≤ 3). ✓
57. Selected strategy is A. ✓

## Bundle isolation (3 criteria)
58. Prototype module path contains "prototypes/". ✓
59. shared/prng has no React import. ✓
60. strategy-a/adapter has no @tiptap/pm import. ✓
