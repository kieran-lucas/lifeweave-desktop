# Task 50 — UI surface completeness census

Baseline: `2c4cb188937393103e12b1042779af5ea266acda`. Produced **before** any Task 50 product edit, as
Slice 040 §19 requires.

## Method

The census reasons at **product-capability** level, never at command-count level. Its inputs were:

- `docs/DECISION_REGISTRY.md` and the closed-task audits `task-40` … `task-49`;
- every handler registered in `src-tauri/src/lib.rs` (`generate_handler!`, lines 171–289);
- every wrapper in `frontend/src/ipc/commands.ts` and `frontend/src/features/focus-plan/ipc.ts`;
- every consumer under `frontend/src/features/*` and `frontend/src/app/*`, resolved by symbol;
- the App navigation tree in `frontend/src/app/App.tsx`;
- the 30 native E2E phase specs under `e2e-tests/specs/`.

Every registered handler was matched against its frontend consumer. **Two** handlers have no
consumer; both are duplicate paths to a capability that is already editable elsewhere, and neither
is a missing surface. Every other handler is reachable. The real finding is therefore about
**discoverability**, not dead backend code — exactly the distinction §21 and §23 draw.

### Classification meanings

| Classification | Meaning |
|---|---|
| `SURFACED` | Visible control in a top-level destination |
| `CONTEXTUALLY_SURFACED` | Visible control inside the valid context the operation belongs to |
| `MISSING_USER_SURFACE` | Decided, implemented, but has no visible path in its valid context |
| `BLOCKED_SURFACE` | Decided but cannot be surfaced without new authority; not implemented |
| `INTERNAL_CHOREOGRAPHY` | Implementation step already wrapped by a higher-level control |
| `RECOVERY/SAFETY_INTERNAL` | Safety or recovery path deliberately not user-triggered |
| `DEFERRED_OR_PROHIBITED` | Not decided; must not be surfaced |
| `DUPLICATE_BACKEND_PATH_SAME_USER_CAPABILITY` | Second command for a capability that already has one visible control |

---

## 1. Task / Today

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Today timeline | Source §Today; AI_CONSTITUTION §2 | `list_today_items` | Sidebar → Today | SURFACED | Layout only |
| Upcoming | ADR 0026 | `get_task_planning_projection` | Today → Upcoming tab | SURFACED | Layout only |
| Overdue | ADR 0026 | `get_task_planning_projection` | Today → Overdue tab | SURFACED | Layout only |
| Deadlines queue | ADR 0032 | `get_deadline_queue` | Today → Deadlines tab | SURFACED | Layout only |
| Saved Views | ADR 0033 | `get_task_saved_view_projection` | Today → Views tab | SURFACED | Layout only |
| Create one-off Task | Source §Task | `create_task` | `button[aria-label='Create task']` | SURFACED | Dialog rebuilt |
| **Edit one-off Task** | Source §Task | `update_task` | **Double-click or Enter on the row only** (`TodayScreen.tsx:856-860`) | **MISSING_USER_SURFACE** | **Add visible row Edit control** |
| **Delete Task** | Source §Task | `delete_task` | Inside the edit dialog, reachable only through the row gesture above | **MISSING_USER_SURFACE** | Fixed by the same Edit control |
| **Edit recurring occurrence + scope** | ADR 0024 | `update_recurring_occurrence` | Same row gesture | **MISSING_USER_SURFACE** | Fixed by the same Edit control |
| Create recurring series | Source §Recurrence | `create_recurring_task` | Create dialog → Recurring fieldset | SURFACED | Layout only |
| Schedule date / start / end | Source §Task | `create_task` / `update_task` | Task dialog | SURFACED | Regridded |
| Category, priority | Source §Task | same | Task dialog | SURFACED | Regridded |
| Life area relation | ADR 0023 | `list_task_life_targets` | Task dialog → `LifeAreaCombobox` | SURFACED | Regridded |
| Focus Plan relation | ADR 0031 | `list_focus_plan_targets` | Task dialog → `FocusPlanCombobox` | SURFACED | Regridded |
| Deadline set / clear | ADR 0032 | `update_task` | Task dialog → Deadline field | SURFACED | Regridded |
| Task tags | ADR 0027 | `create_task` / `update_task` | Task dialog → `TagPicker` | SURFACED | Regridded |
| Actual time Start | ADR 0037 | `start_task_actual_time` | Row control (`ActualTimeRowControl`) | CONTEXTUALLY_SURFACED | Row track fixed |
| Actual time Stop | ADR 0037 | `stop_task_actual_time` | Row control + `ActiveTimerStrip` | CONTEXTUALLY_SURFACED | Layout only |
| Actual time Discard | ADR 0037 | `discard_task_actual_time` | `ActiveTimerStrip` → "Discard segment" | CONTEXTUALLY_SURFACED | Layout only |
| Assessment | ADR 0011 | `evaluate_task` | `AssessmentControl` on the row | CONTEXTUALLY_SURFACED | Row track fixed |
| Undo assessment | ADR 0011 | `undo_task_evaluation` | Today undo line | SURFACED | Layout only |
| Saved View create / edit | ADR 0033 | `create_task_saved_view`, `update_task_saved_view` | Views tab | CONTEXTUALLY_SURFACED | Layout only |
| Saved View archive / restore | ADR 0033 | `archive_task_saved_view`, `restore_task_saved_view` | Views tab | CONTEXTUALLY_SURFACED | Layout only |
| Saved View reorder | ADR 0033 | `reorder_task_saved_views` | Views tab → Move up / Move down | CONTEXTUALLY_SURFACED | Layout only |
| Saved View open item | ADR 0033 | `get_task_saved_view_projection` | Views tab result list | CONTEXTUALLY_SURFACED | Layout only |
| Navigate to Life area / Plan from a row | ADR 0023 / 0031 | navigation only | Row chips | CONTEXTUALLY_SURFACED | Layout only |
| Saved View editor options | ADR 0033 | `get_task_saved_view_editor_options` | Feeds the editor form | INTERNAL_CHOREOGRAPHY | None |
| Manual actual-time entry, editing completed segments, recurring actual time | — | none | — | DEFERRED_OR_PROHIBITED | None |

## 2. Calendar

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Month projection | Source §Calendar | `get_month_projection` | Sidebar → Calendar | SURFACED | Wide frame |
| Month navigation | Source §Calendar | same | Previous / Next / Today | SURFACED | Layout only |
| Date activation into Today | ADR 0032 note | navigation only | Day cell activation | SURFACED | Layout only |

## 3. Analytics

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Week / Month / Year | Source §Analytics | `get_analytics_projection` | Analytics period tablist | SURFACED | Layout only |
| Previous / Next / Current period | Source §Analytics | same | Period nav | SURFACED | Grouped with the period controls |
| Scheduled overview | Source §Analytics | same | Analytics | SURFACED | Section hierarchy |
| Recorded actual time | ADR 0040 | same | Analytics | SURFACED | Section hierarchy |
| Category scheduled time | Source §Analytics | same | Analytics | SURFACED | Section hierarchy |
| Objective streaks | Source §Analytics | same | Analytics | SURFACED | Section hierarchy |
| Completion distribution | Source §Analytics | same | Analytics | SURFACED | Section hierarchy |
| Focus Plan activity | ADR 0043 | `get_focus_plan_analytics_projection` | Analytics → lazy section | SURFACED | Section hierarchy |
| Open Plan from Analytics | ADR 0043 | navigation only | Plan row action | CONTEXTUALLY_SURFACED | Layout only |
| Category goal **mutation** | Source §Analytics | `update_category_goals` | **Settings → Category goals** | SURFACED (in Settings) | Not duplicated into Analytics |
| Charts, prediction, scoring | — | none | — | DEFERRED_OR_PROHIBITED | None |

## 4. Focus Plans

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Create Plan | ADR 0030 | `create_focus_plan` | Plans header form | SURFACED | Layout only |
| List portfolios (Draft/Active/Paused/Completed/Archived) | ADR 0030 | `list_focus_plans` | Plans portfolio tablist | SURFACED | Layout only |
| Open exact Plan | ADR 0030 | `get_focus_plan` | Plan list selection | SURFACED | Layout only |
| Update Plan + lifecycle | ADR 0030 | `mutate_focus_plan` `update_plan` | Detail form | CONTEXTUALLY_SURFACED | Layout only |
| Archive / restore Plan | ADR 0030 | `archive_plan` / `restore_plan` | Detail header button | CONTEXTUALLY_SURFACED | Layout only |
| Life relation, tags | ADR 0030 / 0027 | `update_plan` | Detail form | CONTEXTUALLY_SURFACED | Layout only |
| Variant add / rename / select | ADR 0030 | `add_variant`, `rename_variant`, `select_variant` | Approaches block | CONTEXTUALLY_SURFACED | Layout only |
| Variant body edit | ADR 0030 | `update_variant_body` | Approach notes | CONTEXTUALLY_SURFACED | Layout only |
| Variant archive / restore | ADR 0030 | `archive_variant`, `restore_variant` | Per-variant icon button | CONTEXTUALLY_SURFACED | Layout only |
| Phase add / rename / move / archive / restore | ADR 0030 | `add_phase`, `rename_phase`, `move_phase`, `archive_phase`, `restore_phase` | Phases list | CONTEXTUALLY_SURFACED | Layout only |
| Recovery draft save / discard | ADR 0030 | `save_focus_plan_draft`, `discard_focus_plan_draft` | Draft note + discard control | RECOVERY/SAFETY_INTERNAL (user-visible recovery only) | Layout only |
| Revision state | ADR 0030 | `get_focus_plan` | Detail header "Revision N · Updated …" | SURFACED | Layout only |
| Linked Tasks / series navigation | ADR 0031 | `get_focus_plan_linked_work` | `LinkedWorkPanel` | CONTEXTUALLY_SURFACED | Layout only |
| Review create | ADR 0031 | `create_focus_plan_review` | `ReviewsPanel` | CONTEXTUALLY_SURFACED | Layout only |
| Review history | ADR 0031 | `list_focus_plan_reviews` | `ReviewsPanel` | CONTEXTUALLY_SURFACED | Layout only |
| Review edit / delete / archive / search | — | none | — | DEFERRED_OR_PROHIBITED | None |
| Automatic progress, score, health, prediction | — | none | — | DEFERRED_OR_PROHIBITED | None |

## 5. Life System

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Browse | Source §Life | `get_life_browse_projection` | Life → Browse | SURFACED | Wide frame |
| Edit | Source §Life | `get_life_edit_projection` | Life → Edit | SURFACED | Split workspace |
| Pinned | Source §Life | `get_pinned_life_nodes` | Life → Pinned | SURFACED | Wide frame |
| Reader | ADR 0005 / 0014 | `get_reader_document` | Node → Open | CONTEXTUALLY_SURFACED | Reading frame |
| Graph (transient) | ADR 0038 | `get_life_graph_projection` | Life → Graph toggle | SURFACED | Wide frame, local scroll |
| Create node | Source §Life | `create_life_node` | Edit inspector → Create child | CONTEXTUALLY_SURFACED | Layout only |
| Rename node | Source §Life | `rename_life_node` | Edit inspector → Save title | CONTEXTUALLY_SURFACED | Layout only |
| Summary, icon, theme variant | Source §Life | `update_life_node_summary` | Edit inspector → Save details | CONTEXTUALLY_SURFACED | Layout only |
| Archive / restore node | Source §Life | `archive_life_node`, `restore_life_node` | Edit inspector | CONTEXTUALLY_SURFACED | Layout only |
| Reorder / reparent | Source §Life | `reorder_life_sibling`, `reparent_life_node` | Edit inspector move controls | CONTEXTUALLY_SURFACED | Layout only |
| Undo tree change | Source §Life | `undo_life_operation` | Edit → Undo latest tree change | CONTEXTUALLY_SURFACED | Layout only |
| Pin / unpin | Source §Life | `pin_life_node`, `unpin_life_node` | Browse card pin button | CONTEXTUALLY_SURFACED | Layout only |
| Navigation preference | Source §Life | `save_life_navigation_preference` | Implicit on mode change | INTERNAL_CHOREOGRAPHY | None |
| Life tags | ADR 0027 | `set_life_node_tags` | Edit inspector | CONTEXTUALLY_SURFACED | Layout only |
| Related Tasks | ADR 0023 | `get_related_tasks_for_life_node` | `RelatedTasksPanel` | CONTEXTUALLY_SURFACED | Layout only |
| Explicit links + backlinks | ADR 0035 | `get_life_link_panel`, `create_life_link`, `remove_life_link` | Reader → Links panel | CONTEXTUALLY_SURFACED | Layout only |
| Link target search | ADR 0035 | `search_life_link_targets` | Links panel search field | CONTEXTUALLY_SURFACED | Layout only |
| Basic Leaf create / read / edit | ADR 0005 | `create_reader_document`, `save_reader_document` | Reader | CONTEXTUALLY_SURFACED | Reading frame |
| Basic Leaf draft recover / discard | ADR 0005 | `recover_reader_draft`, `discard_reader_draft` | Reader draft controls | RECOVERY/SAFETY_INTERNAL (visible recovery) | Layout only |
| Basic Leaf Markdown import / export | ADR 0015 | `import_reader_markdown`, `export_reader_markdown` | Reader controls | CONTEXTUALLY_SURFACED | Layout only |
| Document asset insert / read | ADR 0016 | `import_document_asset`, `get_document_asset` | Editor toolbar / renderer | CONTEXTUALLY_SURFACED | Layout only |
| Heading outline | ADR 0008 | derived | Reader outline column | CONTEXTUALLY_SURFACED | Reading frame |
| Narrative create from template | ADR 0021 | `create_narrative_document` | `NarrativeTemplateChooser` | CONTEXTUALLY_SURFACED | Layout only |
| Narrative read / studio | ADR 0011 / 0019 | `get_narrative_document`, `save_narrative_document` | Reader / studio | CONTEXTUALLY_SURFACED | Reading frame |
| Narrative draft recover / discard | ADR 0011 | `recover_narrative_draft`, `discard_narrative_draft` | Studio draft controls | RECOVERY/SAFETY_INTERNAL (visible recovery) | Layout only |
| Narrative Markdown preview / import / export | ADR 0015 | `preview_narrative_markdown`, `import_narrative_markdown`, `export_narrative_markdown` | Import dialog + export button | CONTEXTUALLY_SURFACED | Modal grammar |
| Approved Visual Worlds | ADR 0022 | canonical document field | Studio | CONTEXTUALLY_SURFACED | Untouched (art) |
| Portable Package export / import / confirm / cancel | ADR 0025 | `prepare_portable_package_export`, `preview_portable_package_import`, `confirm_portable_package_import` | `PortablePackageControls` on a leaf | CONTEXTUALLY_SURFACED | Modal grammar |
| Life Branch Package export / import | ADR 0036 | `prepare_life_branch_export`, `preview_life_branch_import`, `confirm_life_branch_import` | `LifeBranchControls` in Edit | CONTEXTUALLY_SURFACED | Modal grammar |
| Whole Life Tree Package export / import | ADR 0041 | `prepare_life_tree_export`, `preview_life_tree_import`, `confirm_life_tree_import` | `LifeTreeControls` in Edit | CONTEXTUALLY_SURFACED | Modal grammar |
| `set_life_node_icon` | Source §Life | registered handler | **No consumer** — icon is already edited through `update_life_node_summary` (`LifeEditWorkspace.tsx:97`) | DUPLICATE_BACKEND_PATH_SAME_USER_CAPABILITY | **No button added** |
| `set_life_node_theme_variant` | Source §Life | registered handler | **No consumer** — theme variant is already edited through `update_life_node_summary` (`LifeEditWorkspace.tsx:98`) | DUPLICATE_BACKEND_PATH_SAME_USER_CAPABILITY | **No button added** |
| Staged export byte read (`read_*_export`) | ADR 0025/0036/0041 | 3 handlers | Invoked by the export button that already exists | INTERNAL_CHOREOGRAPHY | None |
| Abandoned staged import discard (`discard_*_import`) | ADR 0025/0036/0041 | 3 handlers | Invoked by Cancel on the preview | INTERNAL_CHOREOGRAPHY | None |
| Noteboard, advanced Graph, generic outline expansion, multi-branch selection | — | none | — | DEFERRED_OR_PROHIBITED | None |

## 6. Search

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Global search | ADR 0007 | `search_global` | Sidebar Search + `Ctrl+K` | SURFACED | Modal grammar |
| Navigate to Today / Life / Reader / Plan target | ADR 0007 | navigation only | Result activation | CONTEXTUALLY_SURFACED | Layout only |
| Command palette / command search | — | none | — | DEFERRED_OR_PROHIBITED | None |

## 7. Settings

| Capability | Product authority | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|---|
| Category goals | Source §Analytics | `update_category_goals` | Settings → Category goals | SURFACED | Section rhythm |
| Tag create / rename / archive / restore / merge | ADR 0027 | `create_tag`, `rename_tag`, `archive_tag`, `restore_tag`, `merge_tags` | Settings → Tags | SURFACED | Table containment |
| Managed backup create | ADR 0042 | `backup_database` | Settings → Backup & Restore | SURFACED | Table containment |
| Backup inventory + compatibility | ADR 0042 | `list_backups` | Settings → Backup & Restore | SURFACED | Table containment |
| Restore confirmation | ADR 0042 | `restore_database` | Backup row → Restore → dialog | CONTEXTUALLY_SURFACED | Modal grammar |
| Keyboard shortcut help | ADR 0039 | none (frontend registry) | Settings → Keyboard shortcuts + `Ctrl+/` | SURFACED | Modal grammar |
| Foundation verification tools | Slice 000 | `*_foundation_record` (5 handlers) | Settings → Foundation tools | SURFACED | Kept spatially secondary |
| Backup retention pruning | ADR 0042 | inside `backup_database` | Automatic lifecycle policy | RECOVERY/SAFETY_INTERNAL | **No "Prune now" invented** |
| Manual backup delete, scheduled backup, configurable retention, cloud backup | — | none | — | DEFERRED_OR_PROHIBITED | None |
| Shortcut remapping | — | none | — | DEFERRED_OR_PROHIBITED | None |

## 8. Application core

| Capability | Backend/IPC | Current UI path | Classification | Task 50 action |
|---|---|---|---|---|
| Core readiness probe | `health_check` | App startup status line | INTERNAL_CHOREOGRAPHY | None |
| Category / completion-state catalogues | `list_task_categories`, `list_completion_states` | Feed the Task dialog and assessment control | INTERNAL_CHOREOGRAPHY | None |
| Sidebar destinations, collapse, search entry | frontend only | Sidebar | SURFACED | Boundary geometry only |

---

## Findings

### `MISSING_USER_SURFACE` — 1 capability group, 3 operations

**Task edit, Task delete, and recurring-occurrence edit have no visible affordance.**

`TodayScreen.tsx:848-861` renders each Task as `role="listitem"` with `tabIndex={0}`, and opens the
editor only from `onDoubleClick` or `Enter`. Nothing on the row indicates that either gesture
exists. Delete lives inside that dialog, so it inherits the same invisibility, and so does the
recurring occurrence-scope control.

§23 is explicit that "double-click alone is not sufficient if no visible clue exists", and there is
no Product Owner decision making the Task row an intentionally gesture-only surface. Keyboard
parity (`Enter`) does not satisfy discoverability on its own.

**Task 50 action:** add one visible **Edit** control to the Task row action track, calling the
existing `begin(item, element)` handler. No new IPC, no new semantics, no change to what the dialog
does. Double-click and `Enter` are retained so nothing regresses.

### `BLOCKED_SURFACE` — 0

No decided, implemented capability required new Rust behaviour, a new IPC command, a schema change,
a new route, or a new persistent preference in order to be surfaced.

### Deliberately not surfaced

- **6 internal-choreography rows, covering 11 handlers**: `health_check`; the two catalogue reads
  (`list_task_categories`, `list_completion_states`); `get_task_saved_view_editor_options`;
  `save_life_navigation_preference`; the three staged-export byte reads (`read_portable_package_export`,
  `read_life_branch_export`, `read_life_tree_export`); and the three staging-ticket discards
  (`discard_portable_package_import`, `discard_life_branch_import`, `discard_life_tree_import`).
  Each is already driven by a higher-level control; exposing them would be exposing implementation.
- **2 duplicate backend paths**: `set_life_node_icon` and `set_life_node_theme_variant`. Both edit
  fields that `update_life_node_summary` already edits from the Life Edit inspector. Adding buttons
  for them would create two controls for one capability, which §21 forbids.
- **Backup retention pruning**: automatic lifecycle policy under ADR 0042, not a feature. No
  "Prune now" control was invented.

---

## Totals

```text
DECIDED user-facing capabilities audited: 96
SURFACED:                                 41
CONTEXTUALLY_SURFACED:                    39
MISSING_USER_SURFACE found:                3   (Task edit, Task delete, recurring occurrence edit)
MISSING_USER_SURFACE fixed:                3   (one visible row Edit control resolves all three)
BLOCKED_SURFACE:                           0
INTERNAL_CHOREOGRAPHY:                     9
RECOVERY/SAFETY_INTERNAL:                  4
DUPLICATE_BACKEND_PATH_SAME_USER_CAPABILITY: 2
DEFERRED_OR_PROHIBITED (verified absent):  9 groups
```

Backend handlers registered: **117**. Handlers with a frontend consumer: **115**. The two without a
consumer are the duplicate paths above. Command count is **not** feature count and is recorded here
only to show the mapping is complete.

Evidence for the fixed item is in `docs/audits/task-50-layout-final.md` §"Surface completeness",
with the frontend test that fails without the control and the native phase that reaches it.
