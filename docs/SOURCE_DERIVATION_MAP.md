# Source Derivation Map

The exact source is never replaced. This map explains which setup documents operationalize it.

| Source concern | Operational document |
|---|---|
| Decision vocabulary and precedence | `AI_CONSTITUTION.md`, `docs/DECISION_REGISTRY.md` |
| Full source navigation | `SPEC_INDEX.md`, `FULL_COVERAGE_MATRIX.md`, `SPEC_HEADINGS.json` |
| Task/Life product core | `docs/CORE_PRODUCT_SPEC.md` |
| Narrative/score/prediction/optional systems | `docs/EXPANSION_VISION.md` |
| React–Rust/SQLite/state/IPC | `docs/ARCHITECTURE.md` |
| Technology versions and TS6 discrepancy | `docs/TECHNOLOGY_BASELINE.md`, ADR 0002 |
| Local-first, durability, backup/restore | `docs/DATA_SAFETY_AND_RECOVERY.md` |
| Security/privacy/logging | `docs/SECURITY_PRIVACY_LOGGING.md`, `SECURITY.md` |
| Design/accessibility/motion | `docs/ACCESSIBILITY_AND_INPUT.md`, `docs/PERFORMANCE_BUDGETS.md` |
| Testing/Definition of Done | `docs/TESTING_STRATEGY.md` |
| Release/installer/signing/update | `docs/RELEASE_AND_DISTRIBUTION.md` |
| Implementation ordering | `docs/ROADMAP.md`, `specs/` |
| AI workflow | `AGENTS.md`, `CLAUDE.md`, `docs/AI_ASSISTED_ENGINEERING.md` |
| GitHub project operation | GitHub templates/workflows and repository setup docs |

Completeness is enforced structurally:
- source bytes: 165171;
- source lines: 4637;
- source headings: 402;
- source SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`;
- every heading appears in `FULL_COVERAGE_MATRIX.md`.

When a derived file appears to conflict with source, source plus explicit accepted later decision wins.
