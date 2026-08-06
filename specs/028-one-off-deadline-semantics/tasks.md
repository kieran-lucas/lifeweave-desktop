# Task 38 Work Breakdown

This list is the resumable execution ledger. An unchecked item means unfinished work, never a
completed task reported as done.

## A. Activation

- T38-A01 confirm branch, clean tree, and remote parity;
- T38-A02 record the activation baseline and schema 21;
- T38-A03 create the Slice 028 packet;
- T38-A04 set active spec and next action;
- T38-A05 mark Task 38 active across status, roadmap, start authority, and handoff;
- T38-A06 run governance before product code.

## B. Persistence

- T38-B01 add the Task 38 migration module declaring schema 22;
- T38-B02 add `tasks.deadline_local_date` with a date-shape constraint;
- T38-B03 add the partial index supporting bounded non-null range retrieval;
- T38-B04 repoint application, backup lifecycle, restore, and test entry points;
- T38-B05 prove fresh, upgrade, and idempotent migration paths;
- T38-B06 prove recurring, override, and evaluation tables gain no deadline column;
- T38-B07 prove migrations 1–21 are unedited.

## C. Domain and mutation

- T38-C01 add the deadline state type and pure state function;
- T38-C02 add the scheduled-after-deadline function;
- T38-C03 persist and validate the deadline on one-off create;
- T38-C04 persist and validate the deadline on one-off update, including clearing;
- T38-C05 pass an explicit observed local date into per-date and Today projections;
- T38-C06 prove schedule and deadline independence in both directions;
- T38-C07 prove the deadline is excluded from overlap detection;
- T38-C08 prove leap-day and month/year boundary handling.

## D. Deadline queue

- T38-D01 add the queue projection module and truthful DTOs;
- T38-D02 implement the inclusive anchor window;
- T38-D03 exclude null deadlines, evaluated Tasks, and recurring work;
- T38-D04 build the three user-visible groups;
- T38-D05 implement deterministic ordering and tie-breakers;
- T38-D06 implement the explicit item cap error;
- T38-D07 reuse batched category, Life, Focus Plan, and tag loading;
- T38-D08 prove evaluation exclusion and undo restoration.

## E. Existing surfaces

- T38-E01 project deadline context on Today one-off rows;
- T38-E02 project deadline context on Upcoming and existing Overdue one-off rows;
- T38-E03 compose Search result deadline context at query time;
- T38-E04 validate the observed local date Search already receives;
- T38-E05 prove existing Overdue semantics are unchanged;
- T38-E06 prove Calendar aggregation and `has_missed` are unchanged;
- T38-E07 prove a Task may appear in both existing Overdue and Deadlines.

## F. Contract surface

- T38-F01 add the deadline queue command;
- T38-F02 add observed-date parameters to the affected commands;
- T38-F03 register commands in handler, build manifest, and capability;
- T38-F04 regenerate TypeScript bindings and track permission files.

## G. Frontend

- T38-G01 add the labelled deadline input to the Task editor;
- T38-G02 enforce the recurring boundary in the shared editor;
- T38-G03 add deadline text to Today one-off rows;
- T38-G04 add deadline text to Upcoming and Overdue one-off rows;
- T38-G05 extend the workspace tablist with the Deadlines tab;
- T38-G06 add the bounded deadline queue panel;
- T38-G07 navigate a queue row to the scheduled date and exact Task;
- T38-G08 cover draft retention, keyboard operation, and accessibility.

## H. Verification

- T38-H01 run repository governance and integrity checks;
- T38-H02 run Rust format, lint, and tests;
- T38-H03 run frontend typecheck, tests, and production build;
- T38-H04 capture migration, reopen, backup/restore, and Search rebuild evidence;
- T38-H05 audit the complete diff from the activation baseline;
- T38-H06 confirm workflow files and seal are unchanged;
- T38-H07 run one primary structured review.

## I. Closure

- T38-I01 record ADR 0032;
- T38-I02 move deadline semantics out of the open and deferred registers;
- T38-I03 close Task 38 and Slice 028 in project state;
- T38-I04 set schema 22 and the Task 38 product checkpoint;
- T38-I05 set active spec null and next action Product Owner gate;
- T38-I06 keep Task 39 unstarted and unrecommended;
- T38-I07 run final governance;
- T38-I08 commit, push, and report the final remote SHA.
