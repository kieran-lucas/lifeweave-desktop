# Task 16 Core hardening matrix

Evidence date: 2026-08-02. `A` = automated, `N` = contained native/file-backed, `S` = semantic/source gate. Manual assistive-technology and alternate-hardware checks are not represented as passes.

| Core flow | Functional | Keyboard/semantics | DPI/narrow | Reduced motion/forced colors | Failure/recovery | Security/performance |
|---|---|---|---|---|---|---|
| App Shell / Settings | A | A + axe | S, 960×640 minimum | S | route boundary A | CSP/ACL A |
| Today / Task / recurrence | A + Rust | A + axe | S | A/S | transaction rollback A | bounded projection A |
| Calendar / Week Strip | A + Rust | A + axe | S | A/S | route boundary A | one month IPC A |
| Completion fan / Undo | A + Rust | A | geometry A | A/S | optimistic rollback A | hidden values backend-only A |
| Analytics | A + Rust | A + axe | S | S | rebuild rollback A | bounded rebuild/query plan A |
| Life Browse / Edit | A + Rust | A + axe | scale fixtures A | A/S | operation undo A | 100/500/2,000 fixtures A |
| Basic Leaf | A + Rust | A | S | S | revisions/drafts A | static/lazy chunks A |
| Backup / restore | Rust A + N | A | n/a | n/a | 136 failpoint/replay tests | checked durability A/N |

Route-level axe checks cover Today, Calendar, Analytics, Life and Settings. Windows Narrator is installed, but no reliable human-operated reader session was available during this autonomous run, so no manual screen-reader pass is claimed.
