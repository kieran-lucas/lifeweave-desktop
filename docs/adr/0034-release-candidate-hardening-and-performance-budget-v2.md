# ADR 0034 — Release-Candidate Hardening and Performance Budget v2

## Status

Accepted and activated by Task 40 / Slice 030 from execution baseline
`fb2a240920414c05e7fd4235357b952a15611e8f`.

## Context

ADR 0028 scored the eligible expansion candidates:

```text
Deadline       8.420
Saved Views    8.095
Hardening      8.055
Interchange    7.610
Links          7.550
Actual Time    7.405
```

Deadline shipped as Task 38 (ADR 0032) and Saved Views as Task 39 (ADR 0033). Hardening is now the
highest-ranked remaining eligible candidate, and unlike the others it is backed by reproduced debt
rather than by a product hypothesis:

- the historical `total_js_bytes` budget is exceeded, and the budget's shape no longer describes the
  bundle it guards;
- the canonical all-target/all-feature Clippy command is red on two `type_complexity` findings in
  backup test code;
- native Windows E2E ends at Focus Plans and covers neither Deadline nor Saved Views;
- Task 30 still records P2 physical screen-reader and alternate-DPI evidence debt.

No known P0/P1 defect forces a repair task. Task 40 is a bounded release-quality investment, not a
feature.

## Decision

Task 40 executes four bounded hardening workstreams and changes no product behavior.

### 1. Performance budget v2 replaces, and does not edit, Task 16

`docs/audits/task-16-performance-budgets.json` is preserved byte-identically as history. A new
versioned, feature-aware budget governs the gate.

The previous budget failed the honesty test in both directions at once. It tracked four metrics
against sixteen emitted chunks; it carried a `442791`-byte baseline and `490000`-byte cap for an
editor chunk that now emits `52355` bytes, because the Markdown pipeline split out long ago; and it
left a `390833`-byte ProseMirror/TipTap vendor chunk completely unbudgeted while failing on the
aggregate. A gate that is simultaneously 90 percent slack on one metric and red on another teaches
the project to ignore it.

Budget v2 therefore tracks main, total raw, total gzip, expected chunk count, the two named lazy
chunks, and **every** chunk of at least 10,000 raw bytes, keyed by an identity that strips only the
terminal content hash so a rebuild never looks like a new chunk.

Maxima are **derived**, not chosen:

```text
total_raw_maximum   = final + max(8192, ceil(final * 0.0075))
total_gzip_maximum  = final + max(4096, ceil(final * 0.0100))
chunk_maximum       = final + max(1024, ceil(final * 0.0200))
```

clamped by the locked ceilings `main <= 535000`, `BasicLeafEditor <= 490000`,
`markdown <= 129000`, and floored by the rule that the final observed total may not exceed the
measured starting baseline. Integer `ceil` keeps the result reproducible on any platform.

A new chunk at or above 10,000 bytes, a missing critical chunk, and a duplicate normalized identity
are all failures. Without those three rules a budget can be satisfied by shipping the same bytes
under a different name, which is the loophole that made the old gate unfalsifiable.

### 2. Lint debt is corrected, never suppressed

The exact canonical command must pass with the smallest readability fix — a named type, alias, or
helper return type — preserving the affected backup tests' assertions, column order, and fault
coverage. `#[allow(clippy::type_complexity)]`, lint-level reduction, and test exclusion are all
rejected: a suppressed finding is indistinguishable from a fixed one in CI, which is precisely the
property a quality gate must not have.

### 3. Native evidence follows shipped features

Deadline and Saved Views get native Windows phases covering the real workflow, restart persistence,
and full backup/restore, driven only through accessible UI selectors. Raw IPC and direct database
writes are rejected as evidence because they prove the store works while the workflow may not.

### 4. Accessibility evidence is separated by what it can actually prove

Machine-verifiable DOM coverage and physical Narrator/DPI observation are recorded as two distinct
classes. Automated tests do not prove spoken output or physical scaling, so an executable manual
protocol is published with a four-state vocabulary (`PASS | FAIL | NOT AVAILABLE | NOT RUN`), and an
unobserved result is never recorded as PASS.

## Consequences

- product behavior, schema 23, and all released migrations are unchanged;
- Task 40 is not a feature checkpoint; `latest_feature_task` remains 39;
- the performance gate becomes stricter and more informative, so a future feature that adds a
  meaningful chunk must budget it explicitly rather than absorb it into an aggregate;
- the canonical Clippy command becomes usable as a real gate again;
- native release confidence extends to the two most recently shipped features;
- physical accessibility debt is made explicit and executable rather than implicit;
- no dependency, lockfile, workflow, or workflow-seal change is required;
- Task 41 is neither allocated nor recommended.

## Alternatives rejected

- **Raise `total_js_bytes` and move on.** Fastest, and the least truthful. It preserves a budget that
  already mis-describes the bundle and defers the same decision to the next task.
- **Keep the Task 16 file and edit it in place.** Destroys the historical record for no benefit; a
  new versioned file costs nothing and keeps both facts.
- **Suppress the two Clippy findings.** Rejected on principle, per §2 above.
- **Track only startup JavaScript.** Cheaper to maintain, but lazy chunks are still shipped bytes and
  the largest single unbudgeted chunk is lazy.
- **Add a bundle-analyzer dependency for attribution.** Rejected: sourcemap `sources` already yields
  per-package attribution with zero new dependencies, and the dependency policy requires a rationale
  that convenience does not meet.

## Reversal conditions

Reopen only if a truthful budget requires a Product Owner trade-off that Task 40 may not make; if the
derived headroom proves too tight for a legitimately approved feature; if the native phases prove
flaky in a way that is diagnostic of harness rather than product; or on an explicit Product Owner
decision. A red optional gate alone does not reopen a closed task.
