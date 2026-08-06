import { $, browser, expect } from "@wdio/globals";

import {
  CONTROL_TASK,
  DEADLINE,
  EVALUATED_TASK,
  MATCHING_TASK,
  RENAMED_VIEW,
  SCHEDULED,
  SECOND_VIEW,
  TODAY,
  TODAY_DEADLINE,
  VIEW_NAME,
  dateKeystrokes,
  sel,
} from "../support/deadlineSavedViews.js";

/** Fills a date input and proves the stored value is the intended ISO date. */
async function setDate(selector: string, isoDate: string) {
  const field = $(selector);
  await field.clearValue();
  await field.setValue(dateKeystrokes(isoDate));
  await expect(field).toHaveValue(isoDate);
}

/**
 * Phase 9 — Task 38 deadline semantics and Task 39 Saved Views, driven only through the
 * accessible UI. Nothing here reaches for raw IPC or the database: the point of a native phase is
 * to prove the workflow a user actually performs, not that the store can hold the row.
 */

async function createTask(options: {
  title: string;
  localDate: string;
  deadline: string | null;
  priority: "Low" | "Medium" | "High";
  startHour: string;
  endHour: string;
}) {
  await $("button[aria-label='Create task']").click();
  await expect($("h2=Create task")).toBeDisplayed();
  await $(sel.labelledInput("Title")).setValue(options.title);
  await setDate(sel.labelledInput("Date"), options.localDate);
  await $("select[aria-label='Start hour']").selectByVisibleText(options.startHour);
  await $("select[aria-label='Start minute']").selectByVisibleText("00");
  await $("select[aria-label='End hour']").selectByVisibleText(options.endHour);
  await $("select[aria-label='End minute']").selectByVisibleText("00");
  await $(sel.labelledSelect("Priority")).selectByVisibleText(options.priority);
  if (options.deadline) {
    await expect($("#task-deadline")).toBeEnabled();
    await setDate("#task-deadline", options.deadline);
  }
  await $("button=Save").click();
  await expect($("h2=Create task")).not.toExist();
}

/** Adds one typed clause in the Saved View editor and waits for its fieldset to appear. */
async function addClause(label: string) {
  await $(sel.labelledSelect("Add filter")).selectByVisibleText(label);
  await $("button=Add").click();
  await expect($(sel.clauseLegend(label))).toBeDisplayed();
}

describe("Phase 9 — deadline semantics and Saved Views", () => {
  it("creates deadline work, queues it, and drives a typed Saved View end to end", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();

    // --- deterministic fixture, created through the Task editor -------------------------------
    await createTask({
      title: MATCHING_TASK,
      localDate: SCHEDULED,
      deadline: DEADLINE,
      priority: "High",
      startHour: "09",
      endHour: "10",
    });
    // The control task shares the schedule but carries neither the deadline nor the priority, so
    // it proves the Saved View clauses actually exclude work rather than matching everything.
    await createTask({
      title: CONTROL_TASK,
      localDate: SCHEDULED,
      deadline: null,
      priority: "Medium",
      startHour: "11",
      endHour: "12",
    });
    await createTask({
      title: EVALUATED_TASK,
      localDate: TODAY,
      deadline: TODAY_DEADLINE,
      priority: "High",
      startHour: "13",
      endHour: "14",
    });

    // --- Deadlines queue ----------------------------------------------------------------------
    await $("button=Deadlines").click();
    await expect($(sel.selectedTab("Deadlines"))).toBeDisplayed();
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();
    await expect($(sel.title(EVALUATED_TASK))).toBeDisplayed();
    // No deadline means no queue membership, whatever the schedule says.
    await expect($(sel.title(CONTROL_TASK))).not.toExist();

    // State is grouped, and the row carries its own deadline date and priority as text.
    await expect($("//h3[starts-with(normalize-space(), 'Upcoming deadlines')]")).toBeDisplayed();
    const queued = $(sel.deadlineRow(MATCHING_TASK));
    await expect(queued.$(sel.deadlineTime(DEADLINE))).toBeDisplayed();
    await expect(queued).toHaveText(expect.stringContaining("Priority high"));

    // --- evaluation removes a Task from the active queue; undo restores it ---------------------
    // This runs before any deadline navigation, while the selected day is still today: opening a
    // deadline result deliberately moves the selection to the scheduled day.
    await $("button=Today").click();
    await expect($(sel.todayDay(TODAY))).toBeDisplayed();
    const evaluated = $(sel.taskRow(EVALUATED_TASK));
    await expect(evaluated).toBeDisplayed();
    await evaluated.$("button[aria-label^='Assess task']").click();
    await $("//*[@role='option' and normalize-space()='Met expectation']").click();
    await expect($("button=Undo assessment")).toBeDisplayed();

    await $("button=Deadlines").click();
    await expect($(sel.title(EVALUATED_TASK))).not.toExist();
    // The evaluated Task leaves the active queue; the unevaluated one is untouched.
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();

    await $("button=Today").click();
    await $("button=Undo assessment").click();
    await $("button=Deadlines").click();
    await expect($(sel.title(EVALUATED_TASK))).toBeDisplayed();

    // --- opening a deadline result lands on the scheduled day, not the deadline day ------------
    await $(sel.openItem(MATCHING_TASK)).click();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();
    await expect($(sel.selectedDay(SCHEDULED))).toBeDisplayed();
    await expect($(sel.taskRow(MATCHING_TASK))).toBeDisplayed();
    const focusedTaskTitle = await browser.execute(
      () =>
        document.activeElement
          ?.closest("[data-task-id]")
          ?.querySelector("strong")?.textContent ?? null,
    );
    expect(focusedTaskTitle).toBe(MATCHING_TASK);

    // --- Saved View create --------------------------------------------------------------------
    await $("button=Views").click();
    await expect($(sel.selectedTab("Views"))).toBeDisplayed();
    await expect($("h2=Saved Views")).toBeDisplayed();

    await $("button=Create view").click();
    const editor = $(sel.savedViewEditor);
    await expect(editor).toBeDisplayed();
    await expect($("h2=Create Saved View")).toBeDisplayed();
    await $(sel.labelledInput("Name")).setValue(VIEW_NAME);
    await $(sel.labelledSelect("Base scope")).selectByVisibleText("Upcoming");
    await $(sel.labelledSelect("Sort")).selectByVisibleText("Title ascending");
    await addClause("Priority");
    await addClause("Has deadline");
    await $("button=Save view").click();
    await expect(editor).not.toExist();

    // --- Saved View results -------------------------------------------------------------------
    await expect($(sel.savedViewItem(VIEW_NAME))).toBeDisplayed();
    // Selecting explicitly. A save sets the new view as selected, but the panel also clears the
    // selection whenever the selected id is absent from the still-stale active list, so the
    // selection is dropped before the refetch lands. Pre-existing Task 39 behaviour, recorded as a
    // P2 finding in the Task 40 audit; this phase asserts what the product actually does.
    await $(sel.savedViewItem(VIEW_NAME)).$(`button=${VIEW_NAME}`).click();
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();
    // Both clauses must bite: the control task is in the same Upcoming source and must not appear.
    await expect($(sel.title(CONTROL_TASK))).not.toExist();
    await expect($("//p[contains(normalize-space(), 'source tasks')]")).toBeDisplayed();

    // --- navigation out of a Saved View result -------------------------------------------------
    await $(sel.openItem(MATCHING_TASK)).click();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();
    await expect($(sel.selectedDay(SCHEDULED))).toBeDisplayed();
    await expect($(sel.taskRow(MATCHING_TASK))).toBeDisplayed();

    // --- edit ----------------------------------------------------------------------------------
    await $("button=Views").click();
    await $(sel.savedViewItem(VIEW_NAME)).$("button=Edit").click();
    await expect($("h2=Edit Saved View")).toBeDisplayed();
    const name = $(sel.labelledInput("Name"));
    await name.clearValue();
    await name.setValue(RENAMED_VIEW);
    await $(sel.labelledSelect("Group")).selectByVisibleText("Category");
    await $("button=Save view").click();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).toBeDisplayed();
    await expect($(sel.savedViewItem(VIEW_NAME))).not.toExist();
    await $(sel.savedViewItem(RENAMED_VIEW)).$(`button=${RENAMED_VIEW}`).click();
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();

    // --- a second view, so ordering has something to be coherent about -------------------------
    await $("button=Create view").click();
    await $(sel.labelledInput("Name")).setValue(SECOND_VIEW);
    await $(sel.labelledSelect("Base scope")).selectByVisibleText("Deadlines");
    await addClause("Has deadline");
    await $("button=Save view").click();
    await expect($(sel.savedViewItem(SECOND_VIEW))).toBeDisplayed();

    // --- archive and restore -------------------------------------------------------------------
    await $(sel.savedViewItem(RENAMED_VIEW)).$("button=Archive").click();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).not.toExist();
    await expect($(sel.savedViewItem(SECOND_VIEW))).toBeDisplayed();

    await $(sel.archivedSummary).click();
    const archivedRow = $(sel.archivedViewItem(RENAMED_VIEW));
    await expect(archivedRow).toBeDisplayed();
    await archivedRow.$("button=Restore").click();

    // Restore appends, so the restored view returns to the active list alongside the survivor and
    // the manager stays selectable rather than losing its selection.
    await expect($(sel.savedViewItem(RENAMED_VIEW))).toBeDisplayed();
    await expect($(sel.savedViewItem(SECOND_VIEW))).toBeDisplayed();
    await $(sel.savedViewItem(RENAMED_VIEW)).$(`button=${RENAMED_VIEW}`).click();
    await expect($(sel.savedViewItem(RENAMED_VIEW)).$("button[aria-pressed='true']")).toBeDisplayed();
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();

    await expect($("[role='alert']")).not.toExist();
  });
});
