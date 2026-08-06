# Task 37 Work Breakdown

## A. Activation

- T37-A01 confirm branch, clean tree, and remote parity;
- T37-A02 record the activation baseline and schema 20;
- T37-A03 create the Slice 027 packet;
- T37-A04 set active spec and next action;
- T37-A05 mark Task 37 active across status, roadmap, start authority, and handoff;
- T37-A06 run governance before product code.

## B. Persistence

- T37-B01 add the Task 37 migration module declaring schema 21;
- T37-B02 add nullable `focus_plan_id` to `tasks` and `task_series` with indexes;
- T37-B03 create `focus_plan_reviews` with a bounded newest-first history index;
- T37-B04 repoint application, backup lifecycle, restore, and test entry points;
- T37-B05 generalise released migration discovery in project state verification;
- T37-B06 prove fresh, upgrade, and idempotent migration paths;
- T37-B07 prove occurrence, override, and evaluation tables gain no Plan column.

## C. Domain authority

- T37-C01 add Focus Plan target validation;
- T37-C02 persist and validate the relation on one-off create and update;
- T37-C03 persist and validate the relation on series creation;
- T37-C04 reject relation changes at occurrence scope;
- T37-C05 apply entire-series relation authority;
- T37-C06 preserve the old series relation across a this-and-future split;
- T37-C07 inherit the relation onto the new future series and honour an explicit choice;
- T37-C08 preserve an existing link across Plan archive and unrelated edits.

## D. Projection and reviews

- T37-D01 add a batched Focus Plan lookup for projections;
- T37-D02 project inherited Plan context on occurrences;
- T37-D03 project Plan context on Today, Upcoming, and Overdue;
- T37-D04 parameterise the related-work core by owner;
- T37-D05 add bounded Focus Plan linked-work projection with counts;
- T37-D06 add idempotent review creation;
- T37-D07 add bounded newest-first review listing;
- T37-D08 prove reviews leave Plan state unchanged.

## E. Contract surface

- T37-E01 add relationship and review DTOs;
- T37-E02 add four thin Tauri commands;
- T37-E03 register commands in handler, build manifest, and capability;
- T37-E04 regenerate TypeScript bindings.

## F. Frontend

- T37-F01 add the Focus Plan combobox;
- T37-F02 wire the selector into the existing Task editor with scope rules;
- T37-F03 add Plan context and navigation to Today rows;
- T37-F04 add Plan context and navigation to Upcoming and Overdue rows;
- T37-F05 add Plan navigation to the application shell;
- T37-F06 add the bounded Linked work region;
- T37-F07 add the bounded Reviews region and creation form;
- T37-F08 cover selection, navigation, retention, duplicate submission, and accessibility.

## G. Verification

- T37-G01 run repository governance and integrity checks;
- T37-G02 run Rust format, lint, and tests;
- T37-G03 run frontend typecheck, tests, and production build;
- T37-G04 capture migration, reopen, and backup/restore evidence;
- T37-G05 audit the complete diff from the activation baseline;
- T37-G06 confirm workflow files and seal are unchanged;
- T37-G07 run one independent read-only review.

## H. Closure

- T37-H01 record ADR 0031;
- T37-H02 move Task 37 out of the deferred register;
- T37-H03 close Task 37 and Slice 027 in project state;
- T37-H04 set schema 21 and the Task 37 product checkpoint;
- T37-H05 set active spec null and next action Product Owner gate;
- T37-H06 keep Task 38 unstarted and unrecommended;
- T37-H07 run final governance;
- T37-H08 commit, push, and report the final remote SHA.
