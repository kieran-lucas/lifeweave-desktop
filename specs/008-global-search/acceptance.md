# Acceptance Criteria 008 — Global Search

## Functional

- [ ] Ctrl+K opens the search dialog from any screen
- [ ] Sidebar "Search" button opens the dialog
- [ ] Typing fewer than 2 characters shows no results and makes no IPC call
- [ ] Typing 2+ characters triggers a debounced search (150ms) and shows ranked results
- [ ] Results are grouped by Tasks, Life, and Documents
- [ ] Each result shows title, context text, and snippet (if available)
- [ ] Highlighted match fragments rendered as `<mark>` elements
- [ ] "N more results not shown" note appears when total exceeds visible cap
- [ ] ArrowDown/ArrowUp navigate the active result without moving DOM focus
- [ ] Enter activates the selected result and closes the dialog
- [ ] Clicking a result navigates and closes the dialog
- [ ] Escape closes the dialog and restores focus to the search trigger button
- [ ] Clicking the overlay backdrop closes the dialog
- [ ] "Close search" button (Esc label) closes the dialog
- [ ] Empty-state message "No results." appears when search returns 0 results
- [ ] Error state "Search failed." appears when the IPC call rejects
- [ ] Stale responses from previous queries are discarded (monotone sequence counter)
- [ ] Vietnamese characters (diacritics) are matched correctly after normalization
- [ ] Search for a task navigates Today to the task's date and focuses the task row
- [ ] Search for a life node navigates Life to browse that node
- [ ] Search for a reader document navigates Life to reader mode for that document

## Accessibility

- [ ] Input uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`
- [ ] Results container uses `role="listbox"` with individual `role="option"` items
- [ ] Active option has `aria-selected="true"`
- [ ] Result count announced via `aria-live="polite" aria-atomic="true"` live region
- [ ] Dialog uses `role="dialog" aria-modal="true" aria-label="Search"`
- [ ] Focus trapped within dialog (Escape exits, focus returns to trigger)

## Security

- [ ] No `dangerouslySetInnerHTML` in search components
- [ ] No raw `invoke()` outside commands.ts
- [ ] FTS query uses parameterized MATCH (no SQL injection vector)
- [ ] `verify_security.py` passes with search_global registered in all 3 locations
