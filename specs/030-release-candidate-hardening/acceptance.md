# Task 40 Acceptance Mapping

Status: ACCEPTED by deterministic implementation evidence. Every criterion below was measured;
none is marked satisfied by an unobserved run. Full evidence, including the exact numbers and the
failing-first reproductions, is in `docs/audits/task-40-release-candidate-hardening.md`.

Measured summary: three byte-identical build inventories (16 chunks, 1,181,334 raw, 361,595 gzip);
17 checker tests; the exact all-target/all-feature Clippy command exits 0 with no suppression;
590 Rust tests serial (4 ignored) and 604 frontend tests; four new native phases each proven to fail
on a deliberate break; installer sha256
`fc7745d596c5684d6100f61d3b985ab67942ac52ac0a2de7d9c693a45f77193c`; RC dogfood exit 0.

## A. Performance budget v2

| Criterion | Evidence |
|---|---|
| Debt reproduced, not inferred | Exact `hardening:performance` failure text from the clean baseline |
| Build determinism | Three builds, `frontend/dist` deleted between runs, identical normalized inventories |
| Attribution is measured | Per-chunk sourcemap `sources` ownership, not naming heuristics |
| Task 16 history preserved | `docs/audits/task-16-performance-budgets.json` byte-identical in the final diff |
| Budget tracks the right things | `main_js_bytes`, `total_js_bytes`, `total_js_gzip_bytes`, `expected_chunk_count`, `BasicLeafEditor`, `markdown`, and every chunk ≥ 10,000 raw bytes |
| Headroom is derived, not chosen | Documented `ceil` formulas applied to the final observed build, clamped by the locked ceilings |
| No rebaseline loophole | Final observed total raw and gzip do not exceed the measured starting baseline |
| Gate is honest | Missing critical chunk, unknown ≥ 10 KB chunk, and duplicate normalized identity all fail |
| Checker is testable | Isolated temp-directory tests for every required fail-to-pass case |
| Gate passes | `pnpm build` then `pnpm hardening:performance` |

Required checker cases: exact limit passes; one byte over fails; missing expected chunk fails;
unknown ≥ 10 KB chunk fails; unknown < 10 KB behavior is explicit; duplicate normalized identity
fails; malformed budget fails; a hash change does not change normalized identity; gzip is
deterministic; Windows separators and non-ASCII fixture paths work where supported.

## B. Full-target Rust lint

| Criterion | Evidence |
|---|---|
| Both baseline findings gone | The exact all-target/all-feature Clippy command exits zero |
| No suppression | No `#[allow(clippy::type_complexity)]` and no lint-level reduction in the diff |
| Coverage equivalent | Same assertions, same column order, same fault paths in the affected backup tests |
| No collateral change | Backup behavior unchanged; no unrelated refactor in the diff |
| Rust gates green | `cargo fmt --check`, exact Clippy, and full serial Rust tests |

## C. Native Windows E2E

| Criterion | Evidence |
|---|---|
| Real workflow | Accessible UI selectors only; no raw IPC or direct database writes to reach tested behavior |
| Deadline covered | Date-only deadline created, queue state and context verified, result opens the exact scheduled date |
| Saved Views covered | Typed view over a bounded scope with ≥ 2 clauses including a deadline clause; result, navigation, edit, archive, restore, ordering |
| Restart proves persistence | Deadline, view name/config/lifecycle, execution, navigation, and Today-as-startup after restart |
| Backup proves recovery | Pre-backup field values, not counts, after backup → mutate → restore → restart |
| Phases are load-bearing | Each new phase fails on a deliberate break of its central behavior, then the code is restored |
| Harness intact | Isolated profiles, sentinels, signed matching driver, owned cleanup, artifact retention unchanged |

## D. Accessibility and DPI

| Criterion | Evidence |
|---|---|
| Coverage expanded | Keyboard and axe assertions across every required surface |
| Invariants asserted | Reachability and order, visible unobscured focus, focus restoration, no trap, name/role/state/value, tablist arrows/Home/End, no pointer-only or color-only status, semantic errors/status, zero axe violations |
| Invariants **not** machine-asserted | Reduced-motion and forced-colors: jsdom does not evaluate `@media` and Vitest stubs CSS, so an assertion there would pass against nothing. Moved to the manual protocol rather than faked — see residual debt 3. |
| Fixes are bounded | Only reproducible violations of accepted behavior changed |
| Tooling claim is truthful | Recorded detection result for Accessibility Insights, Inspect.exe, and UIAVerify — installed or not |
| Protocol is executable | Runnable without source knowledge; four-state vocabulary; environment fields; 5 display × 3 text scale matrix; all eleven scenarios |
| No fabricated evidence | Unobserved manual results recorded as `NOT RUN`, never PASS |

## E. Release candidate and safety

| Criterion | Evidence |
|---|---|
| Release runs performed | `pnpm tauri build`, `pnpm e2e:windows`, `pnpm hardening:rc` |
| Installer identified | Path, byte size, SHA-256, schema 23, release mode, no E2E capability |
| RC harness truthful | Coverage descriptions and command selection match what actually runs |
| Scope held | No migration, schema change, feature, dependency, lockfile churn, workflow or seal change, telemetry, suppression, weakened test, or generated output in the diff |
| Ledger correct | `latest_closed_task` 40, `latest_closed_slice` 30, `latest_feature_task` 39, schema 23, `active_spec` null, `next_action` `product_owner_gate` |
| Task 41 absent | No Task 41 file, allocation, or recommendation |

## Residual debt, disclosed

1. **P2 manual physical Narrator/DPI execution remains external evidence debt. The protocol and
   machine-verifiable coverage are complete.**
2. Native phases 6 and 6-restart were not executed: phase 6 is structurally un-runnable before 05:00
   local time because assessment eligibility requires the window to have ended and `validate_range`
   starts the product day at 04:00. The session ran at 00:26. Not a product defect.
3. Reduced-motion and forced-colors contracts are not machine-assertable under jsdom, which does not
   evaluate `@media`; they are covered by the manual protocol instead of being asserted vacuously.
4. Two findings are recorded for a Product Owner decision rather than actioned: the rejected
   startup-size trade-off (−65,218 startup bytes for +879 raw / +1,898 gzip) and a P2 defect where
   creating or restoring a Saved View drops the result selection.

## Closure rule

Task 40 closes with measured evidence for every workstream, no confirmed P0/P1 product defect, and
the residual verification debt above disclosed explicitly rather than implied.
