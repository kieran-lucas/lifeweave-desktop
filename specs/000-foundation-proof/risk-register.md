# Slice 000 — Risk Register

| Risk | Impact | Mitigation | Evidence |
|---|---|---|---|
| TypeScript 6 compatibility package conflicts with current tooling | bootstrap blocked | isolate dependency pins; proposed TS7 ADR; no strictness weakening | Windows build |
| Tauri/Rust patch mismatch | build failure | pin compatible line after actual Cargo resolution | Cargo.lock + build |
| DB worker deadlock/shutdown issue | data loss/hang | bounded queue, explicit lifecycle, integration tests | restart/crash tests |
| Migration corrupts data | critical | backup, temp DB matrix, immutable migrations | migration tests |
| Backup copies inconsistent DB | critical | Online Backup API | round trip |
| Restore overwrites good data on failure | critical | staging, checks, pre-restore backup, atomic swap | failure fixtures |
| Agent overbuilds schema/features | schedule/lock-in | FoundationRecord + explicit out-of-scope | diff review |
| Sensitive content enters logs | privacy | synthetic fixtures, tracing field policy | log review |
| CI green because checks skipped | false confidence | `.setup-phase` visible; remove only after lockfiles | setup PR |
| Network assumption hidden in dependency | offline failure | disconnected smoke and URL scan | no-network evidence |
