/**
 * Shared fixture vocabulary for the Task 38 deadline and Task 39 Saved View native phases.
 *
 * This lives outside `specs/` on purpose: the restart and backup phases need the same names and
 * dates as the workflow phase, and importing one spec from another would register its `describe`
 * block a second time in every later run.
 *
 * It deliberately imports nothing. Selectors are returned as strings so the module stays free of
 * the `@wdio/globals` runtime, which only the test runner provides.
 */

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Local-date arithmetic anchored at midday, so a DST boundary cannot shift the day. */
export const shift = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return iso(date);
};

/**
 * Keystrokes for an `<input type="date">`.
 *
 * WebDriver types into a date input segment by segment in the presentation locale's order, so
 * sending an ISO string produces a nonsense date: "2026-08-08" lands as "60808-02-02". This
 * machine's WebView2 presents MM/DD/YYYY. Callers assert the resulting value against the ISO date
 * afterwards, so a different locale fails loudly instead of silently storing the wrong day.
 */
export const dateKeystrokes = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
};

export const TODAY = shift(0);
/** Inside the 14-day Upcoming horizon. */
export const SCHEDULED = shift(2);
/** Inside the anchor+14 Deadlines window. */
export const DEADLINE = shift(5);
export const TODAY_DEADLINE = shift(3);

export const MATCHING_TASK = "E2E Deadline Alpha";
export const CONTROL_TASK = "E2E Deadline Control";
export const EVALUATED_TASK = "E2E Deadline Today";
export const VIEW_NAME = "E2E Deadline View";
export const RENAMED_VIEW = "E2E Deadline View Renamed";
export const SECOND_VIEW = "E2E Secondary View";

/** Semantic selectors only — roles, accessible names, and stable ids. No generated CSS classes. */
export const sel = {
  taskRow: (title: string) =>
    `//div[@role="listitem"][.//strong[normalize-space()="${title}"]]`,
  selectedTab: (label: string) =>
    `//button[@role='tab' and @aria-selected='true' and normalize-space()='${label}']`,
  savedViewItem: (name: string) =>
    `//ul[@aria-label='Active Saved Views']/li[.//button[normalize-space()='${name}']]`,
  archivedViewItem: (name: string) => `//li[.//span[normalize-space()='${name}']]`,
  deadlineRow: (title: string) => `//li[.//strong[normalize-space()='${title}']]`,
  title: (title: string) => `//strong[normalize-space()='${title}']`,
  // `text()` rather than the element string-value: a wrapping label's string-value includes the
  // text of every descendant, so a label around a <select> would read as "PriorityLowMediumHigh".
  labelledInput: (label: string) => `//label[normalize-space(text())='${label}']/input`,
  labelledSelect: (label: string) => `//label[normalize-space(text())='${label}']/select`,
  clauseLegend: (label: string) => `//legend[normalize-space()='${label}']`,
  openItem: (title: string) => `button[aria-label^='Open ${title}, scheduled ']`,
  archivedSummary: "//summary[starts-with(normalize-space(), 'Archived views')]",
  savedViewEditor: "//div[@role='dialog'][@aria-labelledby='saved-view-editor-heading']",
  selectedDay: (date: string) => `//p[normalize-space()='Selected day · ${date}']`,
  todayDay: (date: string) => `//p[normalize-space()='Today · ${date}']`,
  deadlineTime: (date: string) => `.//time[@datetime='${date}']`,
  restoreComplete: "//p[@aria-live='polite' and normalize-space()='Restore complete.']",
} as const;
