# Milestones refinement — 2026-11-14

Authority: the Product Owner's Vietnamese follow-up requests removing redundant lower-page
details/captions, fitting twelve months into one view, refined Lifeweave motion and X-only wheel
movement. ADR 0058 records the narrow override of the earlier presentation/scroll behavior.

## Result and files

The page now consists of the existing Milestones heading/Pin action, compact month/Today controls,
one management button and the timeline. Generic eyebrow/subtitle, instructional paragraph,
permanent Find/date inputs, the empty detail placeholder and the visible Trash section are removed.
Details appear only after selecting a pin; All milestones retains unpinned records, date navigation
and recoverable deletions inside the existing accessible dialog shell. No capability or data is
deleted. The schema, Rust service, IPC contracts and dependencies are unchanged.

Changed implementation:

- `frontend/src/features/milestones/MilestonesScreen.tsx` — quiet composition, conditional detail,
  selected-group access, compact All milestones entry.
- `frontend/src/features/milestones/MilestoneLibrary.tsx` — shared dialog/focus shell for existing
  records, unpinned dates, date jump and Restore.
- `frontend/src/features/milestones/MilestoneTimeline.tsx` — twelve-month composition and selectable
  overflow groups, shared geometry for every date marker/connector/callout.
- `frontend/src/features/milestones/useTimelineViewport.ts` — resize anchoring, bounded date buffer,
  native scrolling and gesture ownership/cleanup.
- `frontend/src/features/milestones/timeline.ts` — responsive day scale and bounded lane packing.
- `frontend/src/features/milestones/MilestonesScreen.css.ts` — quiet shared-token styling and motion.
- Both feature test files and `scripts/verify_milestones_browser.mjs` — updated behavioral contracts.
- ADR 0058, Decision Registry, Status and Slice 041's Milestones/acceptance documents — explicit
  later authorization. This audit is the evidence record. Existing cursor work remains untouched.

## Geometry, interaction and motion

A ResizeObserver computes one pixels-per-day scale from actual days in twelve calendar months and
the viewport's usable width. Month lengths and leap dates retain their mathematical proportions.
The initial visible period starts two months before Today, with 36 months of backing content for
continuous travel. Month/date navigation can extend or rebase the bounded buffer. No snapping is
added. Resize preserves the exact visible calendar-day fraction, with browser subpixel rounding;
scale changes wait for active pointer/wheel gestures to settle. Midnight changes only the Today
indicator/countdown, preserving the user's view.

Inside the timeline, vertical wheel maps to X, diagonal input suppresses Y, and pure native X input
keeps native OS/browser momentum. Discrete ticks accumulate one target and coalesce through rAF
into browser-native smooth scrolling; precision deltas and reduced motion move directly. Wheel
input is consumed at both horizontal boundaries, preventing vertical page chaining. Ctrl/Meta-wheel
is preserved for zoom, and ordinary scrolling outside the timeline is unchanged. There is no custom
inertia or raw-scroll React rendering. The toolbar's visible period updates after gestures settle.

Callouts occupy at most three nonintersecting lanes. When all lanes are occupied, nearby overflow
joins a callout with +N and retains every constituent ID; selecting it exposes all related moments.
All individual date positions remain marked and connected. The timeline therefore needs no vertical
scroll, including with 50 dense milestones. Detail content alone may scroll when opened and long.

Canvas/detail entry uses a 6px vertical fade with the app's shared 300ms settle vocabulary. Marker
hover/selection uses a small 170ms dot scale and tonal change. Programmatic scrolling is native and
interruptible. Reduced Motion substitutes an 80ms nonspatial fade and immediate navigation. There
are no loops, bouncing, new animation libraries, or scrolling-time marker measurements.

## Commands and observed results

| Command | Result |
| --- | --- |
| `pnpm --dir frontend test src/features/milestones --maxWorkers=1` | PASS: 27 tests |
| `pnpm test --maxWorkers=2` | PASS: 912 tests, 62 files |
| `pnpm build` | PASS: TypeScript and production Vite output |
| `pnpm verify` | PASS: source, governance/state, index/coverage, remote assets, security/CSP and workflow seal |
| `node scripts/verify_milestones_browser.mjs` | PASS: real Chromium geometry, input, accessibility and frame sample |
| `pnpm tauri build --no-bundle` | PASS: optimized Windows executable, 4m47s |
| `git diff --check` | PASS |
| `python scripts/check_performance_budgets.py` | FAIL: existing budget/topology failures remain disclosed below |

Rust/migration tests were not repeated for this frontend-only refinement. Their prior 890-pass
result and actual SQLite/backup/restart evidence remain in the implementation audit. No Rust or
storage code changed in this refinement.

The browser audit measured all twelve complete month regions from September 2026 through August
2027 inside the initial 983px viewport, with no document/main/page overflow. The backing start was
September 2025, initial scrollLeft 935 and Today offset 213.55px. It also verified:

- No initial detail reservation, old instruction text or visible date form.
- Correct sidebar, Today navigation, reload and session Back.
- Actual mouse drag, native horizontal wheel, vertical-to-X/Shift input, emulated touch swipe,
  keyboard arrows/Home, connected marker/label movement and calendar-day anchoring on resize.
- Edit/pin/unpin/confirmed delete/Restore through the compact management dialog, plus a leap-day
  jump, long-content containment and Reduced Motion behavior.
- Fifty dense milestones represented by three nonintersecting callouts; all 50 remain reachable
  through the selected group and no vertical timeline scrollbar exists.
- Axe: zero violations on the page, editor and management dialog after entrance motion settles.
- Ninety scroll frames with zero DOM mutations; p95 interval 17.9ms, maximum 18.6ms in the recorded
  headless run. This is a frame sample, not a hardware smoothness or universal FPS guarantee.

Evidence: `target/milestones-refined-browser/results.json`, production build/test/verify logs under
`target/milestones-refined-*`, and reviewed Desktop/narrow/selected/editor/dense/forced-color PNGs
in `target/milestones-refined-browser/`. These replace no approved visual goldens. Physical trackpad,
touch hardware, Narrator and dedicated physical 125%/150% DPI trials remain NOT RUN; emulated input
and DPR are reported separately. No independent external review or UX approval is claimed.

## Desktop replacement and data preservation

The earlier explicit Desktop replacement authorization continues to apply to this refinement.
The running installed application had no authoring surface open. It was closed gracefully, then
a verified SQLite Online Backup of schema 35 and fingerprints of all 45 authoritative tables were
recorded under ignored `target/milestones-refined-desktop-deploy/`. The previous executable and
shortcut are retained; no real database or private artifact is committed.

The release was staged, hash checked and atomically replaced at the existing canonical install
path. Desktop `Lifeweave.lnk` already targets that executable, so its target and icon remain valid.
The application was reopened through that shortcut and returned to Milestones, preserving the
user's original open-window state.

The first deployment verifier encountered a transient zero HWND while the replacement process
was starting, after the executable replacement and shortcut launch succeeded. This was a harness
failure, not an application failure. The verifier now captures and explicitly checks IntPtr.Zero;
the standalone verification then passed without repeating the installation or overwriting backup.

- `powershell -NoProfile -ExecutionPolicy Bypass -File target/milestones-refined-desktop-deploy/verify.ps1`:
  PASS, installed Milestones/All milestones/Pin milestone controls present; old permanent Find absent.
- The verifier's `data_check.py after`: PASS, all 45 pre-existing authoritative table fingerprints
  identical, schema/migration history unchanged at 35, integrity `ok`, zero foreign-key errors.
- Installed executable equals release SHA-256:
  `1641b9667a0f282e2d4a2de1e160778ef1674ceff1c862c9ebf2c1e71d138294`.

Result: `target/milestones-refined-desktop-deploy/result.json`. The updated application remains
open on Milestones; no sample or authored production record was added or changed by verification.

## Remaining budget debt and review

Compared with the preceding Milestones build, startup JS increases by 219 bytes, total JS by 3,616
bytes and deterministic gzip by 973 bytes. The lazy feature chunk is 20,624 raw / 6,996 gzip bytes.
No dependency or budget ceiling was added. The already-failing startup/aggregate/diagram inventory
gate remains red; the authorized lazy feature still needs a governed inventory entry. Evidence:
`target/milestones-refined-bundle-delta.json` and `target/milestones-refined-budget.log`.

`MEDIUM` — existing budget-policy debt remains at
`docs/audits/task-51-performance-budgets.json:9` and `:33`. The invariant, baseline failure scenario,
smallest safe correction and missing inventory fixture are unchanged from the implementation audit.
Final adversarial self-review covered storage boundaries, geometry, scroll ownership, focus,
reduced motion, responsive layout and scope. No confirmed new BLOCKER/HIGH defect remains in the
exercised paths; the overall visual slice is not declared closed.
