# Task 29 — Task/Life Relationships

Task 29 implements schema 16 relationship authority on `tasks` and `task_series`, inherited recurring projections, active Life target selection, Task-to-Life navigation, and a canonical Related Tasks projection and panel. Occurrence and evaluation storage remain unchanged.

Evidence on 2026-08-04: 441 frontend tests passed; 405 Rust tests passed with one designated performance test ignored; typecheck, production build, Cargo check, formatting, and Clippy passed. Source, governance, and index checks passed. The aggregate security gate continues to report the pre-existing inline-style finding in unchanged Narrative Canvas code; Task 28 remediation, NSIS, RC, and long performance evidence remain outside this commit.
