# Task 46 Work Breakdown

This is the resumable execution ledger for Slice 036.

## A. Activation

- [x] T46-A01 confirm clean main, exact baseline, and origin parity;
- [x] T46-A02 read constitutional, immutable-source, decision, state, roadmap, architecture,
      testing, security, data-safety, ADR, and prior audit authorities;
- [x] T46-A03 confirm ADR 0040 resolves the bounded Analytics opening without higher-authority
      conflict or another stop condition;
- [x] T46-A04 create ADR 0040 and the Slice 036 package;
- [x] T46-A05 activate Project State at schema 26 with Task 47 prohibited;
- [x] T46-A06 run activation source/governance/index checks and commit/push no product code;
- [x] T46-A07 record activation-state performance inventory before product edits.

## B. Backend projection

- [x] T46-B01 add `AnalyticsActualTimeSummaryView` to Rust-owned generated DTOs;
- [x] T46-B02 add non-null overall and per-category summaries;
- [x] T46-B03 implement one bounded grouped completed-session read;
- [x] T46-B04 fold checked per-Task totals into exact overall/category summaries;
- [x] T46-B05 count tracked scheduled seconds once per tracked Task;
- [x] T46-B06 advance Analytics algorithm version 1 to 2;
- [x] T46-B07 keep schema/migrations/indexes/IPC/capabilities unchanged.

## C. Stop transaction

- [x] T46-C01 bump the existing Analytics source revision in the successful Stop transaction;
- [x] T46-C02 prove exact-once revision behavior for first Stop and replay;
- [x] T46-C03 prove Start, Discard, and backwards-clock refusal do not bump;
- [x] T46-C04 prove failure leaves session raw authority unchanged.

## D. Rust proof and bindings

- [x] T46-D01 prove multiple segments and per-Task pre-floor millisecond sums;
- [x] T46-D02 prove multi-Task/category equality and correct tracked denominator;
- [x] T46-D03 prove untracked, active, discarded, zero-duration, and recurring cases;
- [x] T46-D04 prove cross-midnight/current-date/current-category attribution and movement;
- [x] T46-D05 prove deletion cascade and file-backed reopen;
- [x] T46-D06 prove v2 rebuild and intended query indexes;
- [x] T46-D07 regenerate bindings from Rust and verify drift-free generation.

## E. Frontend

- [x] T46-E01 add one semantic Recorded actual time section with five facts;
- [x] T46-E02 add the explicit empty state and transparency copy;
- [x] T46-E03 add one deterministic formatter preserving non-zero seconds;
- [x] T46-E04 render textual over/under/matched variance;
- [x] T46-E05 render compact actual lines only for tracked categories;
- [x] T46-E06 preserve scheduled goal/progress/streak/completion wording and behavior;
- [x] T46-E07 invalidate Analytics after successful timer completion;
- [x] T46-E08 prove rendering/wiring, active-session exclusion, and zero axe violations.

## F. Native and performance

- [x] T46-F01 add and register exactly Phase 17 with no restart companion;
- [x] T46-F02 drive two 60-minute one-off Tasks and track only one through accessible UI;
- [x] T46-F03 prove recorded time, tracked plan/counts, scheduled total, and no error alert;
- [x] T46-F04 deliberately break the central projection, record meaningful failure, restore, and
      prove zero residue;
- [x] T46-F05 record final performance inventory and any formula-derived Task 46 budget;
- [x] T46-F06 prove one bounded indexed read and no N+1 path.

## G. Verification and closure

- [x] T46-G01 run every specified source, governance, frontend, Rust, build, native, RC,
      performance, and diff gate;
- [x] T46-G02 audit the activation-to-product full diff and all hard exclusions;
- [x] T46-G03 commit/push `implement planned-vs-actual analytics` and record its full SHA;
- [x] T46-G04 write the closure audit with exact evidence and disclosed debt;
- [x] T46-G05 close governance with Task 46/Slice 036 and schema 26;
- [x] T46-G06 commit/push closure, then record its SHA in the audit in a final commit;
- [x] T46-G07 verify clean `main`, `HEAD == origin/main`, and Task 47 unstarted.
