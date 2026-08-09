# Lifeweave — Phase 6 UI Surface & Interaction Control Ledger

**Baseline:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Purpose:** finite inventory of actual UI surfaces and meaningful controls; input to Phase 7.  
**Rule:** this ledger is capability-oriented. A visual concept cannot add a control absent from the product source.

Legend:

- **Route** — top-level sidebar destination.
- **Mode/Tab** — stateful composition inside a route.
- **Inspector** — contextual detail region.
- **Modal** — focus-trapped dialog.
- **Disclosure/Popup** — attached transient region.
- **Inline** — embedded state/confirmation/editor.
- **Canvas** — local-scroll spatial workspace.
- **State** — loading/empty/error/recovery/conflict/etc.

`DESIGN = SPECIFIED` means Phase 6 contains an explicit target treatment.

---

| ID | Family | Type | Surface/state | Meaningful controls/content | Source | Design |
|---|---|---|---|---|---|---|
| G-01 | Global | State | Core connecting | Connecting status | App.tsx | SPECIFIED |
| G-02 | Global | State | Core unavailable | Core unavailable alert | App.tsx | SPECIFIED |
| G-03 | Global | State | Route error boundary | Retry view | RouteErrorBoundary.tsx | SPECIFIED |
| G-04 | Global | Modal | Global Search | Search input; Esc; grouped results | GlobalSearchDialog.tsx | SPECIFIED |
| G-05 | Global | Modal | Keyboard shortcuts | 8 registry rows; Close | ShortcutHelpDialog.tsx | SPECIFIED |
| G-06 | Global | Modal | Decision dialog | Optional input; Cancel; confirm/destructive | DialogSurface.tsx | SPECIFIED |
| SH-01 | Shell | Route shell | Sidebar expanded | 6 destinations; Search; Collapse | App.tsx | SPECIFIED |
| SH-02 | Shell | Route shell | Sidebar collapsed/Life auto-collapse | Expand | App.tsx | SPECIFIED |
| T-01 | Today | Mode | Today populated/unselected | Plan task; WeekStrip; task rows | TodayScreen.tsx | SPECIFIED |
| T-02 | Today | Mode | Today selected | Timeline + inspector split | TodayScreen.tsx | SPECIFIED |
| T-03 | Today | Inspector | Task Note | Note tab; Close | TaskInspector.tsx | SPECIFIED |
| T-04 | Today | Inspector | Task Details | Details tab | TaskInspector.tsx | SPECIFIED |
| T-05 | Today | Inspector | Task Time | Time tab | TaskInspector.tsx | SPECIFIED |
| T-06 | Today | Inspector | Task Links | Links tab; Life/Plan links | TaskInspector.tsx | SPECIFIED |
| T-07 | Today | Inline | Active timer strip | Stop timer; Discard segment | ActiveTimerStrip.tsx | SPECIFIED |
| T-08 | Today | Inline | Actual-time row | Start/Stop | ActualTimeRowControl.tsx | SPECIFIED |
| T-09 | Today | Popup | Assessment fan | Assessment trigger/options | AssessmentControl.tsx | SPECIFIED |
| T-10 | Today | Inline | Assessment undo | Undo assessment | TodayScreen.tsx | SPECIFIED |
| T-11 | Task dialog | Modal | Create one-off Task | Core task fields; Cancel; Save | TodayScreen.tsx | SPECIFIED |
| T-12 | Task dialog | Modal | Create recurring Task | Recurrence fields + preview | TodayScreen.tsx | SPECIFIED |
| T-13 | Task dialog | Modal | Edit occurrence/series scope | 3 scope choices | TodayScreen.tsx | SPECIFIED |
| T-14 | Task dialog | State | Validation/delete/pending | Delete; errors; Saving/Deleting | TodayScreen.tsx | SPECIFIED |
| T-15 | Shared Task | Popup | Life Area combobox | Filter/listbox/Clear | LifeAreaCombobox.tsx + TaskCombobox.tsx | SPECIFIED |
| T-16 | Shared Task | Popup | Focus Plan combobox | Filter/listbox/Clear | FocusPlanCombobox.tsx + TaskCombobox.tsx | SPECIFIED |
| T-17 | Shared | Disclosure | TagPicker | Search; checkboxes; create; Done | TagPicker.tsx | SPECIFIED |
| T-18 | Task workspace | Tab | Upcoming | Retry; Open day | TaskPlanningPanel.tsx | SPECIFIED |
| T-19 | Task workspace | Tab | Overdue | Retry; Review | TaskPlanningPanel.tsx | SPECIFIED |
| T-20 | Task workspace | Tab | Deadlines | Retry; Open task | DeadlineQueuePanel.tsx | SPECIFIED |
| T-21 | Task workspace | Tab | Saved Views manager/results | Create/select/reorder/edit/archive/restore/Open | TaskSavedViewsPanel.tsx | SPECIFIED |
| T-22 | Saved Views | Modal | Create/Edit Saved View | Name/scope/sort/group/9 filters/Save/Cancel | TaskSavedViewsPanel.tsx | SPECIFIED |
| C-01 | Calendar | Route | Month grid | Prev/Next/Today; day activation | CalendarScreen.tsx | SPECIFIED |
| C-02 | Calendar | State | 5/6-week selected/today/missed/load | day cell button semantics | CalendarScreen.tsx | SPECIFIED |
| A-01 | Analytics | Route | Week analytics | Period tabs/navigation | AnalyticsScreen.tsx | SPECIFIED |
| A-02 | Analytics | Mode | Month analytics | Period tabs/navigation | AnalyticsScreen.tsx | SPECIFIED |
| A-03 | Analytics | Mode | Year analytics | Period tabs/navigation | AnalyticsScreen.tsx | SPECIFIED |
| A-04 | Analytics | Section | Scheduled overview | facts | AnalyticsScreen.tsx | SPECIFIED |
| A-05 | Analytics | Section | Recorded actual time | facts/zero state | AnalyticsScreen.tsx | SPECIFIED |
| A-06 | Analytics | Section | Category scheduled time | progress/facts | AnalyticsScreen.tsx | SPECIFIED |
| A-07 | Analytics | Section | Objective streaks | list | AnalyticsScreen.tsx | SPECIFIED |
| A-08 | Analytics | Section | Completion distribution | distribution + evaluation table | AnalyticsScreen.tsx | SPECIFIED |
| A-09 | Analytics | Section | Focus Plan activity | Open Plan | FocusPlanAnalyticsSection.tsx | SPECIFIED |
| P-01 | Plans | Route | Portfolio/no selection | Create; portfolio tabs | FocusPlansScreen.tsx | SPECIFIED |
| P-02 | Plans | Mode | Selected plan detail | Archive/Restore | FocusPlansScreen.tsx | SPECIFIED |
| P-03 | Plans | Inline | Plan details editor | Save/recovery controls | FocusPlansScreen.tsx | SPECIFIED |
| P-04 | Plans | Inline | Approach variants | add/rename/archive/restore/save notes | FocusPlansScreen.tsx | SPECIFIED |
| P-05 | Plans | Inline | Phases | move/archive/restore/add | FocusPlansScreen.tsx | SPECIFIED |
| P-06 | Plans | Section | Linked work | navigate task | LinkedWorkPanel.tsx | SPECIFIED |
| P-07 | Plans | Section | Reviews | Save review; history | ReviewsPanel.tsx | SPECIFIED |
| L-01 | Life | Route | Life System header/modes | Browse/Edit/Pinned/Graph | LifeScreen.tsx | SPECIFIED |
| L-02 | Life | Mode | Browse populated | Back/breadcrumb/pin/child activate | LifeScreen.tsx | SPECIFIED |
| L-03 | Life | State | Browse empty/fallback/paging | Prev/Next children | LifeScreen.tsx | SPECIFIED |
| L-04 | Life | Mode | Pinned populated | Open/Unpin | LifeScreen.tsx | SPECIFIED |
| L-05 | Life | State | Pinned empty/unavailable | Unpin | LifeScreen.tsx | SPECIFIED |
| L-06 | Life | Canvas | Edit tree | node selection + DnD | LifeEditWorkspace.tsx | SPECIFIED |
| L-07 | Life | Inspector | Edit node inspector | save/create/move/archive/interchange/undo/restore | LifeEditWorkspace.tsx | SPECIFIED |
| L-08 | Life | Popup | Edit drag overlay/targets | DnD | LifeEditWorkspace.tsx | SPECIFIED |
| LG-01 | Life Graph | Canvas | Read-only graph | Close; node marks | LifeGraphWorkspace.tsx | SPECIFIED |
| LG-02 | Life Graph | Inspector | Graph semantic inspector | node select/Open/relationship select | LifeGraphWorkspace.tsx | SPECIFIED |
| LG-03 | Life Graph | Section | All explicit links | table | LifeGraphWorkspace.tsx | SPECIFIED |
| LG-04 | Life Graph | State | Graph unavailable | Close graph | LifeGraphWorkspace.tsx | SPECIFIED |
| R-01 | Life Reader | Mode | Reader shell | Back to Life Browse | LifeScreen.tsx | SPECIFIED |
| R-02 | Reader | State | Empty leaf / choose document type | Create Basic/Create Canvas/Import | BasicLeafReader.tsx | SPECIFIED |
| R-03 | Reader | Mode | Basic Leaf populated | Edit/Import MD/Export MD/package | BasicLeafReader.tsx | SPECIFIED |
| R-04 | Reader | State | Recoverable/conflict draft | Recover/Discard | BasicLeafReader.tsx | SPECIFIED |
| R-05 | Reader | State | Unsupported/type-conflict/load error | alerts | BasicLeafReader.tsx | SPECIFIED |
| E-01 | Basic Editor | Mode | Editor | format toolbar/Save/Back | BasicLeafEditor.tsx | SPECIFIED |
| E-02 | Basic Editor | Modal | Add link | url input/Add/Cancel | BasicLeafEditor.tsx | SPECIFIED |
| E-03 | Basic Editor | Modal | Dirty exit | Leave Edit/Cancel | BasicLeafEditor.tsx | SPECIFIED |
| LL-01 | Life Links | Section | Outgoing/backlinks | Add link/Remove/navigate | LifeLinksPanel.tsx | SPECIFIED |
| LL-02 | Life Links | Modal | Add Life link | Search/radio/Confirm/Cancel | LifeLinksPanel.tsx | SPECIFIED |
| RT-01 | Related tasks | Section | Active/completed | navigate Today | RelatedTasksPanel.tsx | SPECIFIED |
| PK-01 | Portable | Inline | Package import/export controls | file/export | PortablePackageControls.tsx | SPECIFIED |
| PK-02 | Portable | Modal | Package import preview | Cancel/Import | PortablePackageImportDialog.tsx | SPECIFIED |
| BR-01 | Life interchange | Inline | Branch controls | Export/Import | LifeBranchControls.tsx | SPECIFIED |
| BR-02 | Life interchange | Modal | Branch import preview | Cancel/Import | LifeBranchImportDialog.tsx | SPECIFIED |
| TR-01 | Life interchange | Inline | Tree controls | Export/Import | LifeTreeControls.tsx | SPECIFIED |
| TR-02 | Life interchange | Modal | Tree import preview | Cancel/Import | LifeBranchImportDialog.tsx | SPECIFIED |
| N-01 | Narrative | Inline | Template chooser | 3 templates/Create/Cancel | NarrativeTemplateChooser.tsx | SPECIFIED |
| N-02 | Narrative | Mode | Canvas Reader | Edit/exports/package | NarrativeCanvasReader.tsx | SPECIFIED |
| N-03 | Narrative | Block | Rich text reader block | none | NarrativeCanvasReader.tsx | SPECIFIED |
| N-04 | Narrative | Block | Metric reader block | none | NarrativeCanvasReader.tsx | SPECIFIED |
| N-05 | Narrative | Block | Image reader block | none | NarrativeCanvasReader.tsx | SPECIFIED |
| N-06 | Narrative | Block | Callout reader block | none | NarrativeCanvasReader.tsx | SPECIFIED |
| N-07 | Narrative | Block | Timeline reader block | none | NarrativeCanvasReader.tsx | SPECIFIED |
| N-08 | Narrative | State | Unknown/missing/unsupported | notices | NarrativeCanvasReader.tsx | SPECIFIED |
| N-09 | Narrative | State | Recoverable/conflict draft | Recover/Discard | NarrativeCanvasReader.tsx | SPECIFIED |
| NS-01 | Narrative Studio | Mode | Studio shell | Publish/Undo/Redo/Back/Discard | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-02 | Narrative Studio | Inline | Visual World selector | 4 radios | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-03 | Narrative Studio | Tab | Scenes | Add/Left/Right/Delete/rename | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-04 | Narrative Studio | Block | Rich text editor | Drag/Up/Down/Delete/edit | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-05 | Narrative Studio | Block | Callout editor | variant/edit | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-06 | Narrative Studio | Block | Metric editor | label/value/unit/description | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-07 | Narrative Studio | Block | Image editor | Import/Replace/alt/caption | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-08 | Narrative Studio | Block | Timeline editor | items DnD/add/delete | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-09 | Narrative Studio | Inline | Add block bar | 5 block type actions | NarrativeCanvasStudio.tsx | SPECIFIED |
| NS-10 | Narrative Studio | Modal | Editor decisions | shared DecisionDialog | NarrativeCanvasStudio.tsx | SPECIFIED |
| MD-01 | Narrative | Modal | Markdown import preview | Cancel/Import | NarrativeMarkdownImportDialog.tsx | SPECIFIED |
| MD-02 | Narrative | Inline | Markdown export | Export | NarrativeMarkdownExportButton.tsx | SPECIFIED |
| S-01 | Settings | Route | Settings document | 5 sections | App.tsx | SPECIFIED |
| S-02 | Settings | Inline | Category Goals | configure durations/Save | CategoryGoals.tsx | SPECIFIED |
| S-03 | Settings | Section | Tags active/archived/merged | Create/Rename/Archive/Restore | TagSettings.tsx | SPECIFIED |
| S-04 | Settings | Inline | Tag merge | Merge/Confirm/Retry/Cancel | TagSettings.tsx | SPECIFIED |
| S-05 | Settings | Section | Backup inventory | Create/Restore | BackupSettings.tsx | SPECIFIED |
| S-06 | Settings | Modal | Restore backup confirmation | Cancel/Restore | BackupSettings.tsx | SPECIFIED |
| S-07 | Settings | Section | Keyboard | Open shortcuts | App.tsx | SPECIFIED |
| S-08 | Settings | Section | Foundation Records | Add/Edit/Archive/Restore | FoundationScreen.tsx | SPECIFIED |

---

## Coverage summary

- Manifest rows: **106**
- Every row above is explicitly covered by the Phase 6 design specification.
- This is a finite manifest for Phase 7 dependency ordering and stage DoD.
- Phase 7 may split one row into multiple canonical screenshot states where validation requires it.
- Phase 7 may add a row only when repo trace proves a materially distinct production surface was missed.
- Phase 7 may not add speculative product features.

---

## Explicit non-surfaces / forbidden mockup inventions

The following appeared in exploratory concept imagery but are **not** current production surfaces and therefore do not get implementation rows:

- Calendar right-side Day Details inspector.
- Calendar event agenda/event-chip model beyond existing day summary projection.
- Calendar New Plan button.
- standalone Reader sidebar route.
- standalone Narrative sidebar route.
- sidebar user profile.
- global bottom Focus Score/streak/meetings bar.
- Analytics recommendation/achievement insight rail.
- invented Analytics line/donut charts.
- Focus Plan owners/collaborators.
- Life health/finance metrics inspector invented for mockup.
- Reader AI Summarize/Highlight actions.
- Graph zoom/pan/minimap controls.
- global floating `+` button.

If the product later adds any of these capabilities, they require new product authority and new manifest rows before implementation.

---

## Phase 7 consumption rule

For each manifest row, Phase 7 must assign:

1. migration wave;
2. upstream primitive dependencies;
3. canonical state/fixture;
4. viewport(s);
5. screenshot/golden requirement;
6. focused tests;
7. accessibility checks;
8. performance/bundle checks when relevant;
9. row Definition of Done;
10. explicit STOP boundary for the stage containing the row.


---

## Micro-control rows

| ID | Family | Type | Surface/state | Meaningful controls/content | Source | Design |
|---|---|---|---|---|---|---|
| MC-01 | Today | Navigation | WeekStrip | Previous week; seven day buttons; Next week | `calendar/WeekStrip.tsx` | SPECIFIED |
| MC-02 | Task dialog | Field group | TimeWheel Start | Hour 04–23; minute 00–59 | `today/TodayScreen.tsx` | SPECIFIED |
| MC-03 | Task dialog | Field group | TimeWheel End | Hour 04–24; minute 00–59 | `today/TodayScreen.tsx` | SPECIFIED |

These rows are deliberately separate because their interaction grammar is easy to misinterpret from their names. `TimeWheel` must **not** be redesigned into a wheel/dial picker; WeekStrip must **not** become a miniature event calendar.

