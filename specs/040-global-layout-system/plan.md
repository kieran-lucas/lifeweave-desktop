# Task 50 Execution Plan

Status: COMPLETE.

## Stage A — Baseline (no product edits)

Verify clean exact remote parity at `2c4cb188937393103e12b1042779af5ea266acda`. Read the
constitution, the source integrity contract, the decision registry, and the Task 40 / 45 / 46 / 47 /
48 / 49 authorities. Produce the UI surface census from the registry, the closed audits, the
registered handlers, the IPC wrappers, every feature consumer, and the native specs. Audit the
current CSS layout authorities. Add the E2E geometry helper and the layout capture spec, seed a
populated fixture, and record the measured baseline at 1280×720, 1440×900 and 1920×1080 in both
sidebar states. Locate every horizontal-overflow source by measurement, not inference. Record
ADR 0044 and Slice 040, activate governance without product code, run source/governance/index
gates, commit and push.

## Stage B — One layout authority

Add `frontend/src/app/layout/` with the token file, the layout class file, `PageFrame` and
`DialogSurface`. Point the application shell at the shared gutter, reserve the main viewport's
scrollbar gutter, remove the shell's page-local `destination` width, and remove `width: 100vw` from
the application root — the measured mechanism that turns any document vertical scrollbar into a
15 px global horizontal scrollbar.

## Stage C — Standard pages

Migrate Today, Analytics, Plans and Settings onto the standard frame and delete their page-local
widths and paddings. Today additionally gets separated period headings, an explicitly declared
four-track timeline row, and normalised workspace-tab and time-column geometry. Analytics gets the
section hierarchy and a fact grid that steps 3 → 2 → 1 without page scroll. Settings gets section
rhythm and bounded tables.

## Stage D — Dialogs

Rebuild the Task create/edit dialog as backdrop → surface → heading → status → form body → footer,
with the deterministic responsive field grid. Bring Search, shortcut help, the restore confirmation
and the four import previews onto the same modal geometry grammar at their own widths, changing no
dialog behaviour.

## Stage E — Wide workspaces

Migrate Calendar, Life Browse, Life Edit, Life Graph and Life Pinned onto the wide frame with shared
header geometry. Prove the graph canvas and the tree canvas own their horizontal scroll and that the
inspector stays bounded and reachable.

## Stage F — Reading surfaces

Migrate the Basic Leaf reader/editor and the Narrative reader/studio onto the shared reading frame,
preserving the document outline's container-query behaviour.

## Stage G — Surface completeness

Add the visible Task row Edit control using the existing handler. Verify contextual discoverability
for every `CONTEXTUALLY_SURFACED` capability and prove internal choreography stayed internal.

## Stage H — Proof and closure

Add native phase 21 with the hard geometry assertions at all three viewports in both sidebar states.
Capture the final screenshot matrix and review it against the baseline on the research rubric.
Execute one deliberate geometry break, prove the focused assertion fails for the expected invariant,
restore, and prove it passes, with zero residue. Add focused frontend structural tests. Run the full
validation sequence, measure performance against the unchanged Task 49 ceilings, review the full
diff against the activation SHA, checkpoint, write the closure audit, close governance, and record
the closure commit.
