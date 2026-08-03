# Risk Register — Spec 012

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Asset references in imported markdown point to non-existent assets | Warn user at preview time; images appear as broken in Reader (acceptable) |
| R2 | Markdown contains H1 that conflicts with canvas title expectations | First H1 becomes the canvas title; subsequent headings become content |
| R3 | File name sanitization misses edge cases on Windows | Explicit test coverage for reserved names, path separators, truncation, empty input |
| R4 | Import idempotency collision | Operation_id scope is per-command; narrative_save_operations table enforces uniqueness |
| R5 | Large markdown exceeds MAX_MARKDOWN_BYTES | Explicit size check before any parsing; IpcError::Validation returned |
