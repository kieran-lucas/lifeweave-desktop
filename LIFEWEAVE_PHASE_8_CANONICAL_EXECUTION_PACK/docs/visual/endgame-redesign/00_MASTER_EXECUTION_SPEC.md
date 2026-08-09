# 00 — Master Execution Specification

**Program:** Lifeweave Endgame Visual Redesign  
**North Star:** Quiet Precision Atlas  
**Scope:** frontend visual/interaction implementation only  
**Design target:** Light theme  
**Planning baseline:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Canonical surface count:** 109  
**Execution mode:** one finite unattended top-level Goal with hard internal stage boundaries

> Read this file first after repository `AGENTS.md` and `AI_CONSTITUTION.md`. Do not preload `research-archive/`.

## 1. Authority hierarchy

When authorities differ, use this order:

1. immutable source-of-truth product/domain/data-safety requirements;
2. `00_OWNER_EXECUTION_AUTHORIZATION.md` for this redesign;
3. explicit later Product Owner decisions already recorded in repository ADR/decision authority;
4. this Master Execution Specification;
5. `01_DESIGN_SYSTEM_AUTHORITY.md`;
6. the relevant `surfaces/*.md`;
7. the current `stages/*.md` or `checkpoints/*.md` packet for execution/closure;
8. `02_SURFACE_MANIFEST.md` for canonical IDs and capability inventory;
9. production source code as capability truth where not superseded visually;
10. agent judgment only inside delegated reversible scope.

Historical Phase 1–7 reports are evidence, not normal execution authority.

## 2. Capability vs visual authority

**Production source is capability authority. Approved mockups are visual-direction authority.**

Never infer a feature, route, button, panel, dataset, workflow, inspector, command, collaboration concept, or shell furniture from a mockup if source/canonical surface inventory does not contain it.

If a mockup contains invented capability, preserve its useful composition/hierarchy/material lesson and redesign using the real product capability.

## 3. Global visual lock

Lifeweave is a **precision instrument for structuring a life**, not a generic SaaS dashboard, decorative notebook, Notion clone, Craft clone, Linear clone, Fluent skin, or glass demo.

Global laws:

- content beats chrome;
- hierarchy order: spacing → alignment → typography → tonal contrast → hairline → elevation/material;
- calm density, not maximum whitespace;
- persistent surfaces are solid/tonal and low-chrome;
- blur/glass only for genuine floating/transient depth;
- one saturated Lifeweave blue identity; completion semantics are blue;
- red is semantic/destructive only;
- no generic gradient hero;
- no dashboard-card reflex;
- effects never compensate for weak hierarchy;
- selection and focus are distinct;
- optical quality may justify documented exceptions to literal token purity;
- simple blue infinity brand mark only: no lightning, glow, profile/avatar, or invented shell furniture.

## 4. Typography lock

Two deliberate registers:

**Productive — Segoe UI Variable optical families:** shell, Today, Calendar, Analytics, Plans, Settings, Search, dialogs, forms, dense metadata, tables/lists, graph controls, editor chrome.

**Editorial — self-hosted Literata:** authored Basic Reader content, Narrative authored body/headings, and explicitly selected knowledge-expression moments.

HTML heading level does not choose art direction. A semantic `h1` on Analytics may be productive; authored document headings may be editorial.

A surface chooses a semantic type role; it does not invent a local size.

## 5. Geometry and material invariants

Preserve one page-width authority and the finite taxonomy:

- standard frame: current shared authority;
- wide frame: current shared authority;
- reading frame: 768px measure;
- no `standard2`, `wide2`, `readerWide`, page-local max-width hacks.

Keep the current spacing scale and semantic relationships. Use whitespace before boxes.

Conceptual depth:
`L0 canvas → L1 workspace → L2 bounded content → L3 selected → L4 inspector/raised utility → L5 popover/menu → L6 modal → L7 drag/transient`.

Not every depth level requires a new background or shadow.

## 6. Product invariants to preserve

- Windows-first, local-first, offline core;
- Today default destination;
- Task is a domain entity and Today is a continuous timeline/row system, not a card board;
- Life Browse shows focal node + direct children; full-tree editing only in Life Edit;
- Reader reading measure stays disciplined;
- React owns presentation/ephemeral interaction; Rust/domain authority remains untouched;
- native semantics before ARIA;
- keyboard parity and deterministic focus restoration;
- Reduced Motion;
- no color-only state;
- no destructive data shortcuts;
- no remote assets or new account/cloud/collaboration concepts.

## 7. Canonical execution program

Order:

`F0 → S01 → S02 → S03 → S04 → Q1 → S05 → S06 → Q2 → S07 → S08 → S09 → Q3 → S10 → S11 → Q4 → S12 → Q5 → FINAL`

The top-level Goal owns this fixed sequence only.

At each stage:
1. read its packet and only its required read set;
2. scope preflight;
3. implement exactly assigned rows;
4. run the prescribed verification funnel;
5. perform exactly one bounded diff review;
6. freeze review finding set;
7. fix the in-scope finding set;
8. rerun affected checks only;
9. persist ledger/evidence;
10. create a scoped commit/checkpoint according to repository policy;
11. mark stage closed and continue to the next packet.

**Stage STOP means stop that stage's search space, not terminate the top-level overnight Goal.**

## 8. No recursive perfection

Forbidden completion language/behavior:

- “keep improving until perfect”;
- “review everything again after every fix”;
- “continue until no inconsistencies remain”;
- repeated whole-app aesthetic passes;
- reopening a verified row because a later view inspires a nicer idea;
- retrying unchanged failing commands without new information.

Out-of-scope improvements go to `KNOWN_DEBT`.

## 9. Verification funnel

Use the cheapest/highest-signal evidence first:

`scope preflight → static/ratchet → focused unit/component → type/governance → targeted native visual profile → conditional bundle/perf → exactly one review → commit/local verification → grouped checkpoint`.

Do not run full native/full screenshot matrices after every edit or stage.
Do not accept expected redesign diffs by weakening thresholds.

## 10. Visual baseline transition

Old light goldens describe the pre-redesign UI and may intentionally differ.

For each stage baseline update:
- capture actual + old diff;
- review original-resolution new frame against canonical design and real capability;
- enumerate exact tags;
- update only reviewed stage tags;
- rerun acceptance OFF;
- require zero mismatch;
- lock the new tag for later regression.

Never auto-refresh all goldens.

## 11. Unattended execution

The Product Owner is absent. Absence is not a blocker.

Do not ask:
“Would you like me to…?”, “Should I…?”, “Which option do you prefer?”, or “May I proceed?”
for delegated reversible frontend decisions.

Use `05_UNATTENDED_EXECUTION_POLICY.md`.

## 12. Context economy

Do not read all canonical files at startup.

Always read:
- repository instructions;
- owner authorization;
- this Master;
- current stage packet;
- current execution ledger.

Then read only surface/design files named in that stage packet.
In a continuous Goal session, unchanged global authorities are **read once**, not reread at every stage transition. Read the new stage packet + relevant surface file + current ledger. Reread a global file only after compaction/restart or to resolve a specific rule.
Do not preload research archive or unrelated completed stages.

Successful command logs belong under `target/codex-stage/<stage>/logs/`; report one-line summaries. On failure, surface only useful diagnostics/tails.

## 13. Mutation boundary

Allowed:
- assigned frontend source/style/tests;
- proven shared design-system/layout primitives;
- verification harness changes explicitly authorized by F0;
- canonical execution ledger/evidence;
- reviewed stage visual baselines.

Forbidden:
- Rust/domain/schema/migrations/generated IPC;
- unrelated feature families;
- `.github/workflows/` and workflow seal;
- speculative capabilities/dependencies;
- performance ceiling changes.

## 14. Hard blockers

A path may stop only when there is no safe in-scope solution.
Use exact evidence; do not spin.

Harness/infrastructure debt may close as `VERIFICATION_DEBT` when deterministic substitute evidence covers product risk and no confirmed P0/P1 product defect remains.

## 15. Final terminal predicate

The overnight Goal is complete only when all are true:

- F0 closed;
- all 109 canonical rows are `VERIFIED` or explicitly accepted nondiagnostic `VERIFICATION_DEBT`;
- S01–S12 closed;
- Q1–Q5 closed;
- no `BLOCKED_PRODUCT`;
- required final `verify`, `typecheck`, unit suite, production build and performance budget pass;
- default full native E2E is run once or any nondiagnostic harness debt is recorded under repository rules;
- complete required Light visual matrix passes at governed canonical viewports;
- exactly **one** whole-app adversarial/coherence pass has produced fixed set `F_final`;
- `F_final` has been resolved;
- only affected checks plus mandatory final gates have been rerun;
- no second whole-app adversarial pass occurs;
- final ledger is persisted;
- final diff/commit state is scoped and auditable.

Then report exact evidence and **STOP**.

## 16. Required files

- `01_DESIGN_SYSTEM_AUTHORITY.md`
- `02_SURFACE_MANIFEST.md`
- `03_MIGRATION_DAG.md`
- `04_TEST_AND_VERIFICATION_POLICY.md`
- `05_UNATTENDED_EXECUTION_POLICY.md`
- `06_APPROVED_EXCEPTIONS.md`
- `07_REFERENCE_AUTHORITY.md`
- `stages/F0.md`, `stages/S01.md` … `S12.md`
- `checkpoints/Q1.md` … `Q5.md`
- `state/EXECUTION_LEDGER.md`

If a required file is missing, recover from the research archive only enough to restore that canonical file; do not improvise product design.
