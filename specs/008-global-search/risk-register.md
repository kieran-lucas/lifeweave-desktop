# Risk Register 008 — Global Search

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | FTS5 external-content triggers drift | Low | High | Triggers installed in migration; unit tests verify FTS returns correct results after insert/update/delete cycles |
| R2 | Vietnamese normalization misses characters | Low | Medium | Comprehensive unit tests; NFKD + combining mark filter covers all common diacritics; đ/Đ hard-mapped |
| R3 | Dirty rebuild blocks on large datasets | Low | Medium | Rebuild is per-scope, not full; typical app scale is hundreds of items, not millions |
| R4 | Stale search results shown briefly | Low | Low | Sequence counter discards responses from prior queries; debounce reduces redundant requests |
| R5 | Search index diverges from canonical data after manual DB edit | Very Low | Low | Index is fully rebuildable; 'all' scope can be queued to force full rebuild |
| R6 | FTS5 operator injection via crafted query | Very Low | High | `build_fts_expression` strips non-alphanumeric chars and quotes all tokens; no raw string interpolation |
