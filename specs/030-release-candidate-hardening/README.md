# Slice 030 — Release-Candidate Hardening + Evidence Baseline v2

## Status

```text
Task 40: ACTIVE
Slice 030: ACTIVE
activation baseline: fb2a240920414c05e7fd4235357b952a15611e8f
Task 39 feature checkpoint: 374abcbae263be18fa785a56d656678f9bfd9c29
Task 39 remediation: fb2a240920414c05e7fd4235357b952a15611e8f
schema: 23 (unchanged)
active spec: specs/030-release-candidate-hardening
Task 41: prohibited, unstarted, unallocated, and unrecommended
```

## Outcome

Task 40 is a hardening and evidence slice, not a product feature. ADR 0028 ranked Hardening
(8.055) immediately behind Deadline (8.420) and Saved Views (8.095); both shipped in Tasks 38 and
39, so Hardening is the highest-ranked remaining eligible candidate and the repository carries
four concrete, reproduced debts.

Four bounded workstreams:

- **A — Performance budget v2.** Replace the obsolete aggregate JavaScript budget with a truthful,
  versioned, feature-aware gate covering every current chunk of consequence. Task 16 history is
  preserved byte-identically.
- **B — Full-target Rust lint.** Restore the exact all-target/all-feature Clippy command to green
  without suppressing a single finding.
- **C — Native Windows E2E for Tasks 38–39.** Add Deadline and Saved Views native phases including
  restart persistence and full backup/restore.
- **D — Accessibility and DPI evidence.** Expand machine-verifiable coverage and publish an
  executable Windows Narrator/DPI protocol that never reports an unobserved manual result as PASS.

## Boundary

Product behavior is unchanged. Schema stays 23 and no migration is added. Task 40 is **not** a
feature checkpoint: `latest_feature_task` remains 39. No route, destination, sidebar item, Task
card, dashboard, or startup change; no dependency, dependency upgrade, lockfile churn, workflow
change, or workflow-seal update; no lint suppression, test weakening, source-map removal, unsafe
tree-shaking, or arbitrary budget inflation. Task 41 is not allocated or recommended.

## Authority

- `spec.md` — normative Task 40 contract;
- `plan.md` — dependency-aware execution order;
- `tasks.md` — resumable completion ledger;
- `acceptance.md` — deterministic acceptance mapping;
- ADR 0034 — release-candidate hardening and performance budget v2 decision.
