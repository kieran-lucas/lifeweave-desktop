# 05 — Unattended Execution Policy

The Product Owner is intentionally unavailable. The objective is uninterrupted safe progress, not constant confirmation.

## AUTO-DECIDE — do not ask

Decide and continue for reversible, in-scope frontend choices:
- CSS/layout implementation details;
- spacing and optical alignment;
- semantic typography role application;
- primitive composition/reuse;
- local component decomposition;
- naming;
- state styling;
- deterministic fixtures;
- focused test selection within the prescribed policy;
- deterministic substitute for a nondiagnostic harness check;
- choice among equivalent frontend implementations;
- how to express approved visual direction using real source capabilities.

Decision order:
1. immutable product/domain/data authority;
2. owner authorization;
3. Master/design/surface authority;
4. current stage packet;
5. existing architecture/pattern;
6. smallest reversible implementation;
7. best final visual quality consistent with all above.

Record material self-decisions briefly in the ledger; do not narrate every trivial choice.

## SAFE FALLBACK — do not ask merely to continue

When uncertainty touches a higher-risk boundary:
- dependency uncertain → no new dependency;
- backend/schema/domain uncertain → leave unchanged;
- capability uncertain → do not add it;
- destructive action uncertain → do not perform it;
- workflow/seal uncertain → leave untouched;
- performance cost uncertain → reclaim/simplify rather than raise ceiling;
- broad refactor vs local fix → smallest reversible in-scope fix.

## HARD BLOCK

Only stop a path if:
- safe frontend implementation is impossible without forbidden scope;
- immutable authorities genuinely conflict;
- confirmed budget failure cannot be reclaimed;
- repository/toolchain/auth/filesystem state prevents all deterministic alternatives;
- source state has changed externally enough that continuing risks corrupting unrelated work.

Write:
- exact blocker;
- evidence;
- attempted safe paths;
- affected row IDs;
- smallest decision that would unblock.

Do not loop waiting for the user.

## No conversational approval language

During the run do not ask:
- “Should I proceed?”
- “Would you like me to…?”
- “Which one do you prefer?”
- “May I change…?”

If it is delegated, decide.
If it is forbidden, use safe fallback.
If impossible, record blocker.

## Existing working tree

Never overwrite unrelated user changes.
At preflight, identify any pre-existing diff.
Treat unrelated changes as immutable.
Stage only files owned by the current stage; never use `git add .` as a shortcut.

## Internet/dependency behavior

The redesign should not require web research during execution. Canonical design decisions are already made.
Use existing repo dependencies.
Do not install packages for visual convenience.

## Sleep/overnight behavior

Persist state frequently enough that an interruption does not erase progress:
- at stage start;
- after stage local verification;
- after checkpoint;
- before any potentially long native run;
- before final review/final gates.

The ledger, commits and artifacts—not chat memory—carry durable state.
