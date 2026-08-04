# Risk register

| Risk | Control |
|---|---|
| ZIP traversal or arbitrary write | Exact normalized inventory policy, enclosed-path defense, backend-owned paths only |
| decompression bomb | Stored entries only plus entry/count/size caps |
| duplicate or ambiguous authority | Deny unknown fields, exact inventory/checksum sets, duplicate rejection |
| canonical/Markdown drift | Regenerate Markdown from validated canonical JSON and require byte equality |
| dangling or wrongly remapped assets | Canonical extracted identity/count map must exactly match the manifest and post-remap joins |
| metadata/privacy leak | Decode and re-encode every package image; never fall back to original bytes or log names/content/paths |
| DB references missing file | Durable file publication before the SQLite commit; attempt-owned rollback receipts |
| partial document on failure | Target validation, assets, document, joins, and operation row in one transaction |
| retry duplicates | Existing bounded operation authorities checked before staged-package requirement |
| staging escapes or broad cleanup | UUID-owned exact paths, symlink rejection, 24-hour age policy, no recursive general-directory cleanup |
| renderer freeze | DB projection separated from archive/image work; raw binary IPC; no browser ZIP work |
| stale Today anchor | DST-safe next-midnight timer plus focus/visibility recomputation |
| scope drifts to backup/tree/Task 32 | Explicit package exclusions and Product Owner gate |
