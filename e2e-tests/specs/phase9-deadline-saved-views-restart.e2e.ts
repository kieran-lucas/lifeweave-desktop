import { $, browser, expect } from "@wdio/globals";

import {
  CONTROL_TASK,
  DEADLINE,
  MATCHING_TASK,
  RENAMED_VIEW,
  SCHEDULED,
  SECOND_VIEW,
  sel,
} from "../support/deadlineSavedViews.js";

/**
 * Phase 9 restart — the same data after a fresh native process. Persistence is only proven by a
 * relaunch: everything phase 9 asserted could otherwise have lived in the query cache.
 */
describe("Phase 9 restart — deadline and Saved View persistence", () => {
  it("keeps deadlines, view configuration, and lifecycle across a fresh native relaunch", async () => {
    await browser.url("http://tauri.localhost");

    // Today remains the startup and default destination; a fifth tab did not change that.
    await expect($("h1=Today")).toBeDisplayed();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();

    // --- the deadline survived -----------------------------------------------------------------
    await $("button=Deadlines").click();
    await expect($(sel.selectedTab("Deadlines"))).toBeDisplayed();
    const queued = $(sel.deadlineRow(MATCHING_TASK));
    await expect(queued).toBeDisplayed();
    await expect(queued.$(sel.deadlineTime(DEADLINE))).toBeDisplayed();
    await expect($(sel.title(CONTROL_TASK))).not.toExist();

    // --- the Saved View survived with its edited name and lifecycle -----------------------------
    await $("button=Views").click();
    await expect($(sel.selectedTab("Views"))).toBeDisplayed();
    await expect($(sel.savedViewItem(RENAMED_VIEW))).toBeDisplayed();
    await expect($(sel.savedViewItem(SECOND_VIEW))).toBeDisplayed();

    // --- the stored configuration survived, field by field ---------------------------------------
    await $(sel.savedViewItem(RENAMED_VIEW)).$("button=Edit").click();
    await expect($("h2=Edit Saved View")).toBeDisplayed();
    await expect($(sel.labelledInput("Name"))).toHaveValue(RENAMED_VIEW);
    await expect($(sel.labelledSelect("Base scope"))).toHaveValue("upcoming");
    await expect($(sel.labelledSelect("Sort"))).toHaveValue("title_ascending");
    await expect($(sel.labelledSelect("Group"))).toHaveValue("category");
    await expect($(sel.clauseLegend("Priority"))).toBeDisplayed();
    await expect($(sel.clauseLegend("Has deadline"))).toBeDisplayed();
    await $("button=Cancel").click();
    await expect($("h2=Edit Saved View")).not.toExist();

    // --- the view still executes -------------------------------------------------------------------
    await $(sel.savedViewItem(RENAMED_VIEW)).$(`button=${RENAMED_VIEW}`).click();
    await expect($(sel.title(MATCHING_TASK))).toBeDisplayed();
    await expect($(sel.title(CONTROL_TASK))).not.toExist();

    // --- exact navigation still works ---------------------------------------------------------------
    await $(sel.openItem(MATCHING_TASK)).click();
    await expect($(sel.selectedTab("Today"))).toBeDisplayed();
    await expect($(sel.selectedDay(SCHEDULED))).toBeDisplayed();
    await expect($(sel.taskRow(MATCHING_TASK))).toBeDisplayed();

    await expect($("[role='alert']")).not.toExist();
  });
});
