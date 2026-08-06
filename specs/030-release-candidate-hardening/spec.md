# Task 40 Specification — Release-Candidate Hardening + Evidence Baseline v2

Normative contract for Slice 030. Everything not required here is out of scope.

## 1. Reproduced debt

All four debts were reproduced from the clean activation baseline
`fb2a240920414c05e7fd4235357b952a15611e8f` before any edit.

### 1.1 Obsolete aggregate JavaScript budget

`pnpm hardening:performance` fails:

```text
performance regression: total_js_bytes=1181334 exceeds 1150000
```

The Task 16 budget is also untruthful in shape. It tracks four metrics against sixteen emitted
chunks, and its `editor_lazy_bytes` entry carries a `442791` baseline with a `490000` maximum while
`BasicLeafEditor` now emits `52355` bytes — the Markdown pipeline split into its own chunk long
ago. A `390833`-byte ProseMirror/TipTap vendor chunk is entirely unbudgeted, and gzip is not
tracked at all. The gate therefore fails on one metric while ignoring the majority of shipped
JavaScript.

### 1.2 Red canonical Clippy gate

```text
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets --all-features -- -D warnings
```

fails with exactly two `clippy::type_complexity` errors, both in
`src-tauri/src/infrastructure/backup/restore.rs` (the `snapshot` binding and the `after` binding of
`active_and_archived_saved_views_survive_backup_restore_reopen_exactly`), both naming the same
ten-field `task_saved_views` row tuple.

### 1.3 Native E2E gap

`scripts/run_windows_e2e.ps1` ends at `phase8-focus-plans-restart.e2e.ts`. No native phase
exercises Task 38 Deadline semantics or Task 39 Saved Views.

### 1.4 Accessibility evidence debt

Task 30 records P2 physical screen-reader and alternate-DPI evidence debt with no executable
protocol a non-author could run.

## 2. Workstream A — Performance budget v2

### 2.1 Preservation

`docs/audits/task-16-performance-budgets.json` MUST remain byte-identical. It is Task 16 history.

### 2.2 Measurement contract

The inventory MUST record, for every emitted JavaScript asset:

- a normalized chunk identity produced by stripping only the terminal content hash;
- raw bytes;
- deterministic gzip bytes computed with `mtime=0`;
- startup or lazy classification;
- likely owning approved feature.

Three production builds from the clean baseline, deleting only generated `frontend/dist` between
runs, MUST produce identical normalized inventories before budgets are frozen. `frontend/dist` is
never committed.

### 2.3 Tracked metrics

Budget v2 MUST track `main_js_bytes`, `total_js_bytes`, `total_js_gzip_bytes`,
`expected_chunk_count`, `BasicLeafEditor`, `markdown`, and every current JavaScript chunk of at
least `10000` raw bytes.

### 2.4 Locked headroom

```text
main maximum            <= 535000
BasicLeafEditor maximum <= 490000
markdown maximum        <= 129000
```

Final observed total raw and gzip MUST NOT exceed the measured starting baseline. Maxima derive
from the final observed build:

```text
total_raw_maximum   = final + max(8192, ceil(final * 0.0075))
total_gzip_maximum  = final + max(4096, ceil(final * 0.0100))
chunk_maximum       = final + max(1024, ceil(final * 0.0200))
```

then clamped by the locked ceilings above. `ceil` is exact integer arithmetic, so the result is
reproducible on any platform.

### 2.5 Optimization boundary

Before freezing, duplicated modules, accidental eager imports, unused feature imports, approved
lazy boundaries, and repeated code with measurable size cost MUST be inspected. Only safe,
evidence-backed reductions may be applied. No minimum reduction is required.

Prohibited: removing functionality, weakening tests or source maps, changing semantics, unsafe
tree-shaking, switching minifiers, adding a dependency, or post-processing generated assets to meet
a size goal. If no safe reduction exists, the approved growth MUST be attributed honestly.

### 2.6 Checker contract

`scripts/check_performance_budgets.py` MUST remain Python standard-library-only and MUST:

- read and validate the Task 40 budget schema;
- require a current build;
- scan JavaScript assets deterministically;
- compute raw and deterministic gzip sizes;
- normalize chunk identities safely;
- fail on a missing required chunk, an unknown chunk at or above `10000` raw bytes, a duplicate
  normalized identity, a malformed budget, or any tracked metric over its maximum;
- emit stable JSON and explain the exact violation.

Unknown chunks below `10000` raw bytes are reported but do not fail.

## 3. Workstream B — Full-target Rust lint

The exact canonical command in §1.2 MUST pass. The correction MUST be the smallest readability fix
— a named fixture struct, type alias, or helper return type — and MUST preserve the assertions,
column order, and fault coverage of the affected backup tests.

Prohibited: `#[allow(clippy::type_complexity)]`, any lint-level reduction, test exclusion or
removal, backup behavior change, and unrelated refactoring. Additional warnings MUST be classified
as baseline, Task 40 introduced, or toolchain drift before being touched.

## 4. Workstream C — Native Windows E2E for Tasks 38–39

### 4.1 Phases

```text
phase9-deadline-saved-views.e2e.ts
phase9-deadline-saved-views-restart.e2e.ts
phase10-saved-views-backup-restore.e2e.ts
```

registered in the `$allPhases` allowlist of `scripts/run_windows_e2e.ps1`.

### 4.2 Scenario

Through accessible UI selectors only: launch at Today; create a deterministic high-priority one-off
Task with a schedule and a date-only deadline; open Deadlines and verify state and context; open the
result and verify focus lands on the exact scheduled date; open Views; create a typed Saved View
over a bounded scope using at least two clauses including one deadline-related clause; verify the
Task result and exact navigation; edit the view; archive and restore it; verify active ordering and
selection remain coherent.

### 4.3 Restart and backup

After restart the deadline persists, the Saved View name, configuration, and lifecycle persist, the
view executes, exact navigation still works, and Today remains the startup and default tab.

Full backup/restore establishes deadline data plus active and archived views, creates a backup
through the accepted native flow, mutates live state, restores, restarts, and verifies meaningful
pre-backup field values rather than counts alone.

### 4.4 Harness invariants

Isolated profiles and sentinels, Microsoft-signed matching EdgeDriver validation, owned-process
cleanup, failure-artifact retention, no global user database access, and a production build without
E2E capability are all preserved unchanged.

Semantic roles, labels, and existing stable test identifiers only. No generated CSS selectors, no
arbitrary sleeps, no unowned global process cleanup, no raw IPC, and no direct database writes to
bypass the tested workflow. Waits observe state.

Each new phase MUST be proven to fail when its central behavior is deliberately broken, after which
the code is restored and no temporary change remains.

## 5. Workstream D — Accessibility and DPI evidence

### 5.1 Evidence boundary

Automated DOM tests do not prove spoken screen-reader output or physical Windows scaling.
Machine-verifiable closure and the manual physical protocol stay separate. A manual result is never
recorded as PASS unless it was actually observed.

### 5.2 Machine-verifiable coverage

Focused keyboard and axe coverage MUST span primary navigation, the Today timeline and Task editor,
all five Today tabs, the Deadline queue, the Saved Views manager, editor, and results, the Search
dialog, the Focus Plan editor, Life Browse/Edit/Reader, and backup/restore controls, asserting:
keyboard-only reachability and logical order; visible, unobscured focus; focus restoration; no
keyboard trap; correct name, role, state, and value; tablist arrows plus Home and End; no
pointer-only action or color-only status; reduced-motion and forced-colors contracts; semantic error
and status announcements; and representative `axe.run` zero violations.

Only reproducible violations of accepted behavior are fixed. Cosmetic redesign is out of scope.

### 5.3 Native UIA inspection

Accessibility Insights for Windows, `Inspect.exe`, and UIAVerify or equivalent Windows SDK tooling
MUST be detected without installing software. If available, the contained native app is inspected
and only a sanitized summary is committed; raw reports remain ignored under `target/e2e-artifacts`.
If unavailable, the detection result is recorded and the physical checks stay P2 external evidence
debt. Downloading, installing, or fabricating results is prohibited.

### 5.4 Manual protocol

`docs/audits/task-40-windows-accessibility-dpi-protocol.md` MUST be executable without source
knowledge, MUST distinguish `PASS | FAIL | NOT AVAILABLE | NOT RUN`, MUST capture the required
environment fields, MUST cover display scales 100/125/150/175/200 percent and text scales
100/150/200 percent where supported, and MUST specify the eleven required scenarios with keyboard
path, expected focus, expected Narrator announcement, expected name/role/state/value, expected
layout, severity, and an evidence field.

Global Windows display settings are never altered programmatically. Absent physical execution,
closure states verbatim:

```text
P2 manual physical Narrator/DPI execution remains external evidence debt.
The protocol and machine-verifiable coverage are complete.
```

## 6. Workstream E — Release-candidate evidence

`pnpm tauri build`, `pnpm e2e:windows`, and `pnpm hardening:rc` MUST run. The production installer
path, byte size, SHA-256, schema 23, release mode, absence of E2E capability, and workflow/seal
identity MUST be recorded. Installers and generated profiles are never committed.

`scripts/run_core_rc_dogfood.ps1` is inspected; only materially stale coverage descriptions or
command selection may change. A passing harness is not rewritten for style.

`docs/audits/task-40-release-candidate-hardening.md` records the full evidence set.

## 7. Hard exclusions

The Task 40 diff MUST NOT contain migrations or schema changes; Task 41 files or a Task 41
recommendation; product feature or model changes; a new runtime or build dependency; lockfile churn;
workflow or seal changes; telemetry or a remote performance service; lint suppression; weakened or
deleted tests; disabled source maps; unsafe build flags; feature deletion for byte savings;
production test backdoors; fabricated manual accessibility evidence; or generated output.

## 8. Closure state

```json
{
  "latest_closed_task": 40,
  "latest_closed_slice": 30,
  "latest_feature_task": 39,
  "latest_feature_checkpoint": "374abcbae263be18fa785a56d656678f9bfd9c29",
  "database_schema_version": 23,
  "active_spec": null,
  "next_action": "product_owner_gate",
  "forbidden_feature_jump": true,
  "recommended_next_candidate": null
}
```

Task 40 is not a feature checkpoint. `latest_feature_task` never becomes 40.
